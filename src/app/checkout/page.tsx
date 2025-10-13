import type { Metadata } from "next";

import { CheckoutPlans } from "./checkout-plans";

export const metadata: Metadata = {
  title: "Checkout",
  description:
    "Secure your NBCOT StudyPack access. Review plan details and launch Stripe Checkout to activate your study window.",
};

export default function CheckoutPage() {
  return (
    <main className="section-space">
      <div className="container-grid max-w-4xl space-y-10">
        <header className="space-y-3">
          <span className="font-heading text-sm uppercase tracking-[0.3em] text-sky-600">Checkout</span>
          <h1 className="font-heading text-4xl tracking-tight text-slate-900">
            Activate full access to the NBCOT StudyPack clone.
          </h1>
          <p className="text-lg text-slate-600">
            Stripe securely processes your payment. Once complete, you&apos;ll unlock the full practice test, adaptive
            drills, flashcards, and analytics suite for the entire study window.
          </p>
        </header>
        <CheckoutPlans />
      </div>
    </main>
  );
}
