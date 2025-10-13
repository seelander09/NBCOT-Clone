import type { Metadata } from "next";

import { CheckoutStatus } from "../checkout-status";

export const metadata: Metadata = {
  title: "Checkout cancelled",
  description: "Your payment was cancelled. Restart the checkout flow whenever you’re ready to upgrade.",
};

export default function CheckoutCancelPage() {
  return (
    <main className="section-space">
      <div className="container-grid max-w-3xl space-y-8">
        <header className="space-y-3">
          <span className="font-heading text-sm uppercase tracking-[0.3em] text-amber-600">Checkout cancelled</span>
          <h1 className="font-heading text-4xl tracking-tight text-slate-900">No worries—you weren&apos;t charged.</h1>
          <p className="text-lg text-slate-600">
            You can retry checkout at any time. If you ran into an issue, reach out and we&apos;ll help you complete the
            upgrade.
          </p>
        </header>
        <CheckoutStatus kind="cancel" />
      </div>
    </main>
  );
}
