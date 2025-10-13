import type { Metadata } from "next";

import { CheckoutStatus } from "../checkout-status";

export const metadata: Metadata = {
  title: "Checkout complete",
  description:
    "Your NBCOT StudyPack activation is processing. We’ll refresh your entitlements and confirm access to the full platform.",
};

export default function CheckoutSuccessPage() {
  return (
    <main className="section-space">
      <div className="container-grid max-w-3xl space-y-8">
        <header className="space-y-3">
          <span className="font-heading text-sm uppercase tracking-[0.3em] text-emerald-600">Payment received</span>
          <h1 className="font-heading text-4xl tracking-tight text-slate-900">Your upgrade is on the way.</h1>
          <p className="text-lg text-slate-600">
            Stripe is finalizing the transaction. We&apos;ll refresh your entitlements and unlock all premium features as
            soon as it clears.
          </p>
        </header>
        <CheckoutStatus kind="success" />
      </div>
    </main>
  );
}
