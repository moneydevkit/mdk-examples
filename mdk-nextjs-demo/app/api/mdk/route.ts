import { NextRequest } from "next/server";

// Webhook secret header
const WEBHOOK_SECRET_HEADER = 'x-moneydevkit-webhook-secret';

// Lazy load the default handler
let defaultHandlerPromise: Promise<(request: Request) => Promise<Response>> | null = null;
function getDefaultHandler() {
  if (!defaultHandlerPromise) {
    defaultHandlerPromise = import("@moneydevkit/nextjs/server/route").then(m => m.POST);
  }
  return defaultHandlerPromise;
}

// Helper to sleep for a given number of milliseconds
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Custom webhook handler with proper sync and retry logic
async function handleWebhookWithSync(request: NextRequest): Promise<Response> {
  const body = await request.json();

  // Validate webhook secret
  const expectedSecret = process.env.MDK_ACCESS_TOKEN;
  if (!expectedSecret) {
    console.error('[webhook] MDK_ACCESS_TOKEN not configured');
    return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const providedSecret = request.headers.get(WEBHOOK_SECRET_HEADER);
  if (!providedSecret || providedSecret !== expectedSecret) {
    console.error('[webhook] Unauthorized webhook request. Expected:', expectedSecret.substring(0, 8) + '..., Got:', providedSecret?.substring(0, 8) + '...');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (body.event !== 'incoming-payment') {
    console.log('[webhook] Unknown event type:', body.event);
    return new Response('OK', { status: 200 });
  }

  console.log('[webhook] Processing incoming-payment event with node sync and retry');

  try {
    // Dynamically import to avoid bundling issues
    const { createMoneyDevKitNode, createMoneyDevKitClient, markPaymentReceived } = await import("@moneydevkit/core");

    const client = createMoneyDevKitClient();

    // Retry logic: try up to 5 times with increasing delays
    const maxRetries = 5;
    const delays = [1000, 2000, 3000, 5000, 8000]; // Total: up to 19 seconds of waiting

    let payments: Array<{ paymentHash: string; amount: number }> = [];

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Create a fresh node instance for each attempt
      const node = createMoneyDevKitNode();

      // CRITICAL: Sync wallets BEFORE checking for payments
      console.log(`[webhook] Attempt ${attempt + 1}/${maxRetries}: Syncing wallets...`);
      node.syncWallets();
      console.log(`[webhook] Attempt ${attempt + 1}/${maxRetries}: Wallet sync complete`);

      // Now receive payments with the synced state
      console.log(`[webhook] Attempt ${attempt + 1}/${maxRetries}: Checking for received payments...`);
      payments = node.receivePayments();
      console.log(`[webhook] Attempt ${attempt + 1}/${maxRetries}: Found ${payments.length} payment(s)`);

      if (payments.length > 0) {
        break; // Found payments, exit retry loop
      }

      // If no payments found and we have more retries, wait before trying again
      if (attempt < maxRetries - 1) {
        const delayMs = delays[attempt];
        console.log(`[webhook] No payments found, waiting ${delayMs}ms before retry...`);
        await sleep(delayMs);
      }
    }

    if (payments.length === 0) {
      console.log('[webhook] No payments found after all retries');
      return new Response('OK', { status: 200 });
    }

    // Mark payments as received locally
    payments.forEach((payment: { paymentHash: string }) => {
      console.log(`[webhook] Marking payment ${payment.paymentHash} as received`);
      markPaymentReceived(payment.paymentHash);
    });

    // Notify MDK API about received payments
    try {
      console.log('[webhook] Notifying MDK API about payments...');
      await client.checkouts.paymentReceived({
        payments: payments.map((payment: { paymentHash: string; amount: number }) => ({
          paymentHash: payment.paymentHash,
          amountSats: payment.amount / 1000,
          sandbox: false,
        })),
      });
      console.log('[webhook] MDK API notified successfully');
    } catch (error) {
      console.error('[webhook] Failed to notify MDK API:', error);
      // Don't throw - local state is already marked
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[webhook] Error processing webhook:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  // Clone the request so we can read the body multiple times
  const clonedRequest = request.clone();

  try {
    const body = await clonedRequest.json();
    const handler = body?.handler?.toLowerCase?.() ?? body?.route?.toLowerCase?.() ?? body?.target?.toLowerCase?.();

    // Handle webhook requests with our custom sync logic
    if (handler === 'webhooks' || handler === 'webhook') {
      // Create a new request with the parsed body since we already consumed it
      return handleWebhookWithSync(request);
    }
  } catch {
    // If JSON parsing fails, let the default handler deal with it
  }

  // For all other requests, use the default handler
  const defaultHandler = await getDefaultHandler();
  return defaultHandler(request);
}
