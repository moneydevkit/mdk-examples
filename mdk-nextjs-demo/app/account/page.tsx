'use client';

import { useCustomer } from "@moneydevkit/nextjs";
import Link from "next/link";
import { useState } from "react";

// Extended customer type to handle all possible fields from the API
interface ExtendedCustomer {
  id?: string;
  email?: string | null;
  name?: string | null;
  externalId?: string | null;
  subscriptions?: Array<{
    id: string;
    productId: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd?: boolean;
    amount: number;
    currency: string;
    recurringInterval: string;
  }>;
  hasActiveSubscription: boolean;
}

function SubscriptionCard({ subscription }: { subscription: any }) {
  const [renewUrl, setRenewUrl] = useState<string | null>(null);
  const [cancelUrl, setCancelUrl] = useState<string | null>(null);
  const [urlsLoading, setUrlsLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const loadUrls = async () => {
    setUrlsLoading(true);
    setUrlError(null);
    try {
      const [renewRes, cancelRes] = await Promise.all([
        fetch('/api/subscription-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscriptionId: subscription.id, action: 'renew' }),
        }),
        fetch('/api/subscription-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscriptionId: subscription.id, action: 'cancel' }),
        }),
      ]);

      if (!renewRes.ok || !cancelRes.ok) {
        throw new Error('Failed to generate URLs');
      }

      const renewData = await renewRes.json();
      const cancelData = await cancelRes.json();

      setRenewUrl(renewData.url);
      setCancelUrl(cancelData.url);
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Failed to generate URLs');
    } finally {
      setUrlsLoading(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  const statusColors: Record<string, string> = {
    active: '#22c55e',
    past_due: '#f59e0b',
    canceled: '#ef4444',
    incomplete: '#6b7280',
  };

  return (
    <div className="card" style={{ marginBottom: '1rem', background: 'rgba(18, 27, 58, 0.75)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: '0.25rem' }}>Product ID</p>
          <code style={{ fontSize: '0.9rem' }}>{subscription.productId}</code>
        </div>
        <span
          className="badge"
          style={{
            backgroundColor: statusColors[subscription.status] || '#6b7280',
            color: 'white',
          }}
        >
          {subscription.status}
        </span>
      </div>

      <div className="grid-two" style={{ marginBottom: '1rem' }}>
        <div className="pill">
          <span style={{ opacity: 0.8 }}>Period Start</span>
          <strong>{formatDate(subscription.currentPeriodStart)}</strong>
        </div>
        <div className="pill">
          <span style={{ opacity: 0.8 }}>Period End</span>
          <strong>{formatDate(subscription.currentPeriodEnd)}</strong>
        </div>
        <div className="pill">
          <span style={{ opacity: 0.8 }}>Amount</span>
          <strong>{subscription.amount} {subscription.currency}</strong>
        </div>
        <div className="pill">
          <span style={{ opacity: 0.8 }}>Interval</span>
          <strong>{subscription.recurringInterval}</strong>
        </div>
      </div>

      {subscription.cancelAtPeriodEnd && (
        <div className="pill" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', marginBottom: '1rem' }}>
          <span role="img" aria-label="warning">⚠️</span>
          <span>Cancels at period end</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {!renewUrl && !cancelUrl && (
          <button
            type="button"
            className="button"
            onClick={loadUrls}
            disabled={urlsLoading}
            style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
          >
            {urlsLoading ? 'Loading URLs...' : 'Generate Management URLs'}
          </button>
        )}

        {renewUrl && (
          <a href={renewUrl} className="button" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
            Renew Subscription
          </a>
        )}

        {cancelUrl && (
          <a
            href={cancelUrl}
            className="button"
            style={{
              fontSize: '0.9rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.3)',
            }}
          >
            Cancel Subscription
          </a>
        )}
      </div>

      {urlError && (
        <p style={{ color: '#ef4444', marginTop: '0.5rem', fontSize: '0.9rem' }}>{urlError}</p>
      )}

      <details style={{ marginTop: '1rem' }}>
        <summary style={{ cursor: 'pointer', opacity: 0.7, fontSize: '0.85rem' }}>Raw subscription data</summary>
        <pre
          style={{
            background: 'rgba(255,255,255,0.04)',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.75rem',
            marginTop: '0.5rem',
            overflowX: 'auto',
          }}
        >
          {JSON.stringify(subscription, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export default function AccountPage() {
  const { customer: rawCustomer, isLoading, error, refetch } = useCustomer({ email: 'nat@moneydevkit.com' });
  // Cast to extended type to access all fields that may be returned by the API
  const customer = rawCustomer as ExtendedCustomer | null;
  const [isRefetching, setIsRefetching] = useState(false);

  const handleRefetch = async () => {
    setIsRefetching(true);
    await refetch();
    setIsRefetching(false);
  };

  return (
    <main className="page">
      <div className="container">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <p className="eyebrow">Money Dev Kit</p>
              <h1 className="hero-title">Customer Account</h1>
            </div>
            <Link href="/" className="button" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
              ← Back to Home
            </Link>
          </div>

          {isLoading ? (
            <div className="stack">
              <p className="subtext">Loading customer data...</p>
            </div>
          ) : error ? (
            <div className="stack">
              <p className="lead" style={{ color: '#ef4444' }}>Error loading customer</p>
              <pre
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  padding: '1rem',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                }}
              >
                {JSON.stringify(error, null, 2)}
              </pre>
              <button type="button" className="button" onClick={handleRefetch} disabled={isRefetching}>
                {isRefetching ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          ) : customer ? (
            <div className="stack">
              <section>
                <p className="eyebrow">Customer Info</p>
                <div className="grid-two" style={{ marginTop: '0.75rem' }}>
                  <div className="pill">
                    <span style={{ opacity: 0.8 }}>Email</span>
                    <strong>{customer.email}</strong>
                  </div>
                  {customer.name && (
                    <div className="pill">
                      <span style={{ opacity: 0.8 }}>Name</span>
                      <strong>{customer.name}</strong>
                    </div>
                  )}
                  {customer.externalId && (
                    <div className="pill">
                      <span style={{ opacity: 0.8 }}>External ID</span>
                      <code style={{ fontSize: '0.75rem' }}>{customer.externalId}</code>
                    </div>
                  )}
                </div>
              </section>

              <section style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <p className="eyebrow" style={{ margin: 0 }}>Subscription Status</p>
                  <button
                    type="button"
                    className="button"
                    onClick={handleRefetch}
                    disabled={isRefetching}
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
                  >
                    {isRefetching ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
                <div
                  className="pill"
                  style={{
                    backgroundColor: customer.hasActiveSubscription
                      ? 'rgba(34, 197, 94, 0.2)'
                      : 'rgba(107, 114, 128, 0.2)',
                  }}
                >
                  <span role="img" aria-label={customer.hasActiveSubscription ? 'active' : 'inactive'}>
                    {customer.hasActiveSubscription ? '✅' : '❌'}
                  </span>
                  <span>
                    {customer.hasActiveSubscription
                      ? 'Has active subscription'
                      : 'No active subscription'}
                  </span>
                </div>
              </section>

              <section style={{ marginTop: '1.5rem' }}>
                <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>
                  Subscriptions ({customer.subscriptions?.length ?? 0})
                </p>
                {customer.subscriptions && customer.subscriptions.length > 0 ? (
                  customer.subscriptions.map((sub: any) => (
                    <SubscriptionCard key={sub.id} subscription={sub} />
                  ))
                ) : (
                  <p className="subtext">No subscriptions found.</p>
                )}
              </section>

              <section style={{ marginTop: '1.5rem' }}>
                <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>Raw Customer Data</p>
                <pre
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    overflowX: 'auto',
                    fontSize: '0.75rem',
                  }}
                >
                  {JSON.stringify(customer, null, 2)}
                </pre>
              </section>
            </div>
          ) : (
            <div className="stack">
              <p className="lead">No customer found</p>
              <p className="subtext">
                A customer record for <code>nat@moneydevkit.com</code> doesn&apos;t exist yet.
                Complete a checkout with customer data collection to create one.
              </p>
              <Link href="/" className="button" style={{ width: 'fit-content' }}>
                Go to Checkout
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
