'use client';

import { useCheckoutSuccess } from "@moneydevkit/nextjs";
import Link from "next/link";
import { Suspense } from "react";

function SuccessContent() {
  const { isCheckoutPaid, isCheckoutPaidLoading, metadata } = useCheckoutSuccess();

  const customerName =
    typeof metadata?.customerName === "string" && metadata.customerName.trim().length > 0
      ? metadata.customerName.trim()
      : "there";
  const note =
    typeof metadata?.note === "string" && metadata.note.trim().length > 0
      ? metadata.note.trim()
      : "your order";

  return (
    <>
      <p className="eyebrow">Payment status</p>
      <h1 className="hero-title">Thanks, {customerName}!</h1>

      {isCheckoutPaidLoading || isCheckoutPaid === null ? (
        <p className="subtext">We&apos;re verifying the payment with Money Dev Kit…</p>
      ) : isCheckoutPaid ? (
        <div className="stack">
          <p className="lead">Payment confirmed. We&apos;ll start preparing {note}.</p>
          <div className="pill">
            <span role="img" aria-label="spark">⚡</span>
            <span>Checkout metadata is available for provisioning.</span>
          </div>
        </div>
      ) : (
        <div className="stack">
          <p className="lead">We haven&apos;t seen the payment yet.</p>
          <p className="muted">If you paid recently, wait a moment and refresh this page.</p>
        </div>
      )}

      <div className="stack" style={{ marginTop: "1.25rem" }}>
        <div className="badge">Metadata</div>
        <pre
          style={{
            background: "rgba(255,255,255,0.04)",
            padding: "1rem",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.05)",
            overflowX: "auto",
          }}
        >
          {JSON.stringify(metadata, null, 2)}
        </pre>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/" className="button" style={{ width: "fit-content" }}>
            Back to start
          </Link>
          <Link href="/account" className="button" style={{ width: "fit-content", background: "rgba(139, 92, 246, 0.3)" }}>
            View Account →
          </Link>
        </div>
        <p className="hint" style={{ marginTop: "0.5rem" }}>
          If you completed a subscription checkout, view your subscription on the account page.
        </p>
      </div>
    </>
  );
}

export default function SuccessPage() {
  return (
    <main className="page">
      <div className="container narrow">
        <div className="card">
          <Suspense fallback={<p className="subtext">Loading payment status…</p>}>
            <SuccessContent />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
