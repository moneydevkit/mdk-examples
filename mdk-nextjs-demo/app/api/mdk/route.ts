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

// Custom webhook handler with proper sync
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
    console.error('[webhook] Unauthorized webhook request');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (body.event !== 'incoming-payment') {
    console.error('[webhook] Unknown event type:', body.event);
    return new Response('OK', { status: 200 });
  }

  console.log('[webhook] Processing incoming-payment event with node sync');

  try {
    // Dynamically import to avoid bundling issues
    const { createMoneyDevKitNode, createMoneyDevKitClient } = await import("@moneydevkit/core");
    const { markPaymentReceived } = await import("@moneydevkit/core/payment-state");

    const node = createMoneyDevKitNode();
    const client = createMoneyDevKitClient();

    // CRITICAL: Sync wallets BEFORE checking for payments
    // This ensures the node has the latest blockchain state
    console.log('[webhook] Syncing wallets...');
    node.syncWallets();
    console.log('[webhook] Wallet sync complete');

    // Now receive payments with the synced state
    console.log('[webhook] Checking for received payments...');
    const payments = node.receivePayments();
    console.log(`[webhook] Found ${payments.length} payment(s)`);

    if (payments.length === 0) {
      console.log('[webhook] No payments to process');
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
