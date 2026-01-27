import {
  createRenewalSubscriptionUrl,
  createCancelSubscriptionUrl,
} from '@moneydevkit/core/route';

export async function POST(request: Request) {
  try {
    const { subscriptionId, action } = await request.json();

    if (!subscriptionId || typeof subscriptionId !== 'string') {
      return Response.json(
        { error: 'Missing or invalid subscriptionId' },
        { status: 400 }
      );
    }

    if (action !== 'renew' && action !== 'cancel') {
      return Response.json(
        { error: 'Invalid action. Must be "renew" or "cancel"' },
        { status: 400 }
      );
    }

    if (action === 'renew') {
      const url = createRenewalSubscriptionUrl({
        subscriptionId,
        checkoutPath: '/checkout',
      });
      return Response.json({ url });
    }

    if (action === 'cancel') {
      const url = createCancelSubscriptionUrl({ subscriptionId });
      return Response.json({ url });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate URL';
    return Response.json({ error: message }, { status: 500 });
  }
}
