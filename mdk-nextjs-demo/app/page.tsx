'use client';

import { useCheckout, useProducts } from "@moneydevkit/nextjs";
import Link from "next/link";
import { useMemo, useState } from "react";

const sellingPoints = [
  "Creates a checkout session from the client and routes to /checkout/[id]",
  "Server route is exposed at /api/mdk using the library's built-in handler",
  "Success page verifies payment state with useCheckoutSuccess()",
  "Wrapped with the Next.js plugin so Lightning binaries stay externalized on Vercel",
];

const chips = [
  { label: "App Router", value: "Next.js 16" },
  { label: "Payments", value: "Lightning + USD" },
  { label: "Deploy target", value: "Vercel" },
];

export default function HomePage() {
  const [customerName, setCustomerName] = useState("Satoshi Nakamoto");
  const [customerEmail, setCustomerEmail] = useState("nat@moneydevkit.com");
  const [note, setNote] = useState("Fast IBD snapshot with hosted checkout.");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<'custom' | 'product'>('custom');
  const { navigate, isNavigating } = useCheckout();
  const { products, isLoading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts();

  const metadata = useMemo(
    () => ({
      successUrl: "/checkout/success",
      customerName: customerName.trim() || "Guest",
      note: note.trim(),
      product: "Lightning IBD download",
    }),
    [customerName, note],
  );

  const handleCustomCheckout = () => {
    navigate({
      type: "AMOUNT",
      title: "Lightning download",
      description: "A quick Money Dev Kit checkout running on Vercel.",
      amount: 2500,
      currency: "USD",
      metadata,
      checkoutPath: "/checkout",
    });
  };

  const handleProductCheckout = () => {
    if (!selectedProductId) return;
    // Build customer object only with non-empty values
    const customerData: Record<string, string> = {};
    if (customerEmail.trim()) customerData.email = customerEmail.trim();
    if (customerName.trim()) customerData.name = customerName.trim();

    navigate({
      type: "PRODUCTS",
      product: selectedProductId,
      successUrl: "/checkout/success",
      requireCustomerData: ['email', 'name'],
      customer: Object.keys(customerData).length > 0 ? customerData : undefined,
      metadata: {
        note: note.trim(),
      },
      checkoutPath: "/checkout",
    });
  };

  // Subscriptions have a recurringInterval, one-time products don't
  const subscriptionProducts = products.filter(p => p.recurringInterval !== null);
  const oneTimeProducts = products.filter(p => p.recurringInterval === null);

  return (
    <main className="page">
      <div className="container">
        <div className="hero-grid">
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <p className="eyebrow">Money Dev Kit</p>
              <Link
                href="/account"
                className="button"
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              >
                My Account →
              </Link>
            </div>
            <h1 className="hero-title">Lightning checkout on Vercel</h1>
            <p className="lead">
              A trimmed-down version of the Bitcoin IBD landing page that focuses on the checkout
              flow. Trigger a session, land on the hosted checkout, and confirm payment on the
              success screen.
            </p>

            <div className="grid-two">
              {chips.map((chip) => (
                <div className="pill" key={chip.label}>
                  <span style={{ opacity: 0.8 }}>{chip.label}</span>
                  <strong>{chip.value}</strong>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', marginTop: '1rem' }}>
              <button
                type="button"
                className={`button ${checkoutMode === 'custom' ? '' : 'muted'}`}
                onClick={() => setCheckoutMode('custom')}
                style={{
                  opacity: checkoutMode === 'custom' ? 1 : 0.6,
                  flex: 1,
                }}
              >
                Custom Amount
              </button>
              <button
                type="button"
                className={`button ${checkoutMode === 'product' ? '' : 'muted'}`}
                onClick={() => setCheckoutMode('product')}
                style={{
                  opacity: checkoutMode === 'product' ? 1 : 0.6,
                  flex: 1,
                }}
              >
                Product Checkout
              </button>
            </div>

            {checkoutMode === 'custom' ? (
              <div className="form">
                <label className="label" htmlFor="customer">
                  Who is checking out?
                </label>
                <input
                  id="customer"
                  className="input"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Your customer name"
                  autoComplete="name"
                />
                <label className="label" htmlFor="note">
                  What are they buying?
                </label>
                <input
                  id="note"
                  className="input"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Describe the purchase"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="button"
                  onClick={handleCustomCheckout}
                  disabled={isNavigating}
                  data-test="start-checkout"
                >
                  {isNavigating ? "Creating checkout…" : "Launch checkout"}
                </button>
                <p className="hint">
                  We create a checkout session with the values above and redirect to
                  {" /checkout/[id] "} using <code>useCheckout</code>.
                </p>
              </div>
            ) : (
              <div className="form">
                <label className="label" htmlFor="customerEmail">
                  Customer Email (for subscriptions)
                </label>
                <input
                  id="customerEmail"
                  className="input"
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="customer@example.com"
                  autoComplete="email"
                />
                <label className="label" htmlFor="customerNameProduct">
                  Customer Name
                </label>
                <input
                  id="customerNameProduct"
                  className="input"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Your customer name"
                  autoComplete="name"
                />

                <label className="label">Select a Product</label>
                {productsLoading ? (
                  <p className="subtext">Loading products...</p>
                ) : productsError ? (
                  <div>
                    <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>
                      Failed to load products: {productsError.message}
                    </p>
                    <button
                      type="button"
                      className="button"
                      onClick={refetchProducts}
                      style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}
                    >
                      Retry
                    </button>
                  </div>
                ) : products.length === 0 ? (
                  <p className="subtext">No products configured. Create products in the MDK Dashboard.</p>
                ) : (
                  <div className="stack" style={{ gap: '0.5rem' }}>
                    {subscriptionProducts.length > 0 && (
                      <>
                        <p className="hint" style={{ marginBottom: '0.25rem', marginTop: '0.5rem' }}>
                          Subscriptions (create customer record):
                        </p>
                        {subscriptionProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => setSelectedProductId(product.id)}
                            style={{
                              display: 'block',
                              width: '100%',
                              padding: '0.75rem 1rem',
                              borderRadius: '8px',
                              border: selectedProductId === product.id
                                ? '2px solid #3b82f6'
                                : '1px solid rgba(255,255,255,0.1)',
                              background: selectedProductId === product.id
                                ? 'rgba(59, 130, 246, 0.15)'
                                : 'rgba(255,255,255,0.04)',
                              cursor: 'pointer',
                              textAlign: 'left',
                              color: 'inherit',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <strong>{product.name}</strong>
                                {product.description && (
                                  <p style={{ opacity: 0.7, fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                                    {product.description}
                                  </p>
                                )}
                              </div>
                              <span className="badge" style={{ backgroundColor: '#8b5cf6' }}>
                                {product.prices[0]?.priceAmount != null
                                  ? `$${(product.prices[0].priceAmount / 100).toFixed(2)}`
                                  : 'Custom'} {product.prices[0]?.currency}
                              </span>
                            </div>
                          </button>
                        ))}
                      </>
                    )}

                    {oneTimeProducts.length > 0 && (
                      <>
                        <p className="hint" style={{ marginBottom: '0.25rem', marginTop: '0.5rem' }}>
                          One-time products:
                        </p>
                        {oneTimeProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => setSelectedProductId(product.id)}
                            style={{
                              display: 'block',
                              width: '100%',
                              padding: '0.75rem 1rem',
                              borderRadius: '8px',
                              border: selectedProductId === product.id
                                ? '2px solid #3b82f6'
                                : '1px solid rgba(255,255,255,0.1)',
                              background: selectedProductId === product.id
                                ? 'rgba(59, 130, 246, 0.15)'
                                : 'rgba(255,255,255,0.04)',
                              cursor: 'pointer',
                              textAlign: 'left',
                              color: 'inherit',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <strong>{product.name}</strong>
                                {product.description && (
                                  <p style={{ opacity: 0.7, fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                                    {product.description}
                                  </p>
                                )}
                              </div>
                              <span className="badge">
                                {product.prices[0]?.priceAmount != null
                                  ? `$${(product.prices[0].priceAmount / 100).toFixed(2)}`
                                  : 'Custom'} {product.prices[0]?.currency}
                              </span>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  className="button"
                  onClick={handleProductCheckout}
                  disabled={isNavigating || !selectedProductId}
                  data-test="start-product-checkout"
                  style={{ marginTop: '1rem' }}
                >
                  {isNavigating ? "Creating checkout…" : selectedProductId ? "Checkout with Product" : "Select a product"}
                </button>
                <p className="hint">
                  Product checkout with <code>requireCustomerData: true</code> creates a customer
                  record that can be viewed on the account page.
                </p>
              </div>
            )}

            <p className="muted">
              Need the full landing page treatment? Check{" "}
              <Link href="https://github.com/moneydevkit/bitcoin-ibd">bitcoin-ibd</Link> for a
              fancier UI; this demo keeps things lean for CI and Vercel deployment.
            </p>
          </section>

          <section className="card alt">
            <p className="eyebrow">What to expect</p>
            <div className="stack">
              <p className="subtext">
                The app is self-contained: the API route lives under <code>/api/mdk</code>, the
                checkout UI renders under <code>/checkout/[id]</code>, and the success page uses
                <code>useCheckoutSuccess()</code> to double-check payment state.
              </p>
              <ul className="feature-list">
                {sellingPoints.map((point) => (
                  <li className="feature-item" key={point}>
                    <span className="badge" aria-hidden>
                      <span role="img" aria-label="spark">⚡</span> Live
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <div className="card" style={{ background: "rgba(18, 27, 58, 0.75)" }}>
                <p className="eyebrow">Success path</p>
                <p className="lead" style={{ fontSize: "1.05rem" }}>
                  After payment, the success page thanks the customer by name and surfaces
                  checkout metadata so you can pipe it into provisioning logic.
                </p>
                <div className="pill">
                  <span role="img" aria-label="party">🎉</span>
                  <span>Success lives at /checkout/success</span>
                </div>
              </div>

              <div className="card" style={{ background: "rgba(18, 27, 58, 0.75)" }}>
                <p className="eyebrow">Customer Management</p>
                <p className="lead" style={{ fontSize: "1.05rem" }}>
                  The account page uses <code>useCustomer</code> to display customer data,
                  subscriptions, and generate renewal/cancel URLs.
                </p>
                <Link href="/account" className="pill" style={{ textDecoration: 'none' }}>
                  <span role="img" aria-label="account">👤</span>
                  <span>View account at /account</span>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
