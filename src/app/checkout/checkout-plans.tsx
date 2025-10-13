"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Stripe } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js";

type Entitlement = {
  id: string;
  status: string;
  accessStart: string | null;
  accessEnd: string | null;
  product: {
    sku: string;
    name: string;
    accessWindow: number | null;
  };
};

type EntitlementResponse = {
  entitlements: Entitlement[];
};

type LoadState = "loading" | "ready" | "unauthenticated" | "error";

const PRODUCT_SKU = "studypack-full";
const PRODUCT_PRICE = 12900; // cents
const PRODUCT_DURATION_DAYS = 90;

let stripePromise: Promise<Stripe | null> | null = null;

async function getStripe() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return null;
  }
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

export function CheckoutPlans() {
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchEntitlements() {
      try {
        setLoadState("loading");
        const response = await fetch("/api/purchases/entitlements", {
          headers: { "Content-Type": "application/json" },
        });

        if (response.status === 401) {
          if (mounted) {
            setLoadState("unauthenticated");
            setEntitlements([]);
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }

        const data = (await response.json()) as EntitlementResponse;
        if (mounted) {
          setEntitlements(data.entitlements ?? []);
          setLoadState("ready");
        }
      } catch (fetchError) {
        console.error("Failed to load entitlements", fetchError);
        if (mounted) {
          setLoadState("error");
          setEntitlements([]);
        }
      }
    }

    void fetchEntitlements();

    return () => {
      mounted = false;
    };
  }, []);

  const activeEntitlement = useMemo(() => {
    return entitlements.find(
      (entitlement) =>
        entitlement.product.sku === PRODUCT_SKU &&
        (entitlement.status === "COMPLETED" || entitlement.status === "ACTIVE"),
    );
  }, [entitlements]);

  const handleCheckout = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    setStatusMessage("Preparing your secure Stripe checkout...");

    try {
      const response = await fetch("/api/purchases/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productSku: PRODUCT_SKU }),
      });

      if (response.status === 401) {
        setError("Please sign in before purchasing access.");
        return;
      }

      if (response.status === 409) {
        setError("Looks like you already have access. Try refreshing the page.");
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = typeof payload?.error === "string" ? payload.error : "Unable to start checkout.";
        setError(message);
        return;
      }

      const payload = (await response.json()) as { url?: string; sessionId?: string };
      const sessionUrl = payload.url;
      const sessionId = payload.sessionId;

      if (!sessionUrl || !sessionId) {
        setError("Stripe session missing expected data. Please try again.");
        return;
      }

      const stripe = await getStripe();

      if (stripe) {
        const result = await stripe.redirectToCheckout({ sessionId });
        if (result.error) {
          console.error("Stripe redirect failed", result.error);
          setError(
            result.error.message ??
              "We couldn't redirect you to Stripe. The checkout link is opening in a new tab instead.",
          );
          window.open(sessionUrl, "_blank", "noopener,noreferrer");
        }
        return;
      }

      // Fallback if Stripe.js is unavailable or not configured.
      window.open(sessionUrl, "_blank", "noopener,noreferrer");
      setStatusMessage("Checkout opened in a new tab. Complete the purchase there, then return to refresh access.");
    } catch (checkoutError) {
      console.error("Checkout initiation failed", checkoutError);
      setError("Something went wrong launching checkout. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  if (loadState === "loading") {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <p className="text-sm text-slate-600">Loading your purchase options...</p>
      </div>
    );
  }

  if (loadState === "unauthenticated") {
    return (
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="font-heading text-xl text-slate-900">Sign in to continue</h2>
        <p className="text-sm text-slate-600">
          Create an account or log in first so we can attach the purchase to your profile.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            className="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
            href="/signup"
          >
            Create account
          </a>
          <a
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-100"
            href="/login"
          >
            Log in
          </a>
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="space-y-3 rounded-3xl border border-rose-200 bg-rose-50 p-6">
        <h2 className="font-heading text-xl text-rose-700">We couldn&apos;t load purchase options</h2>
        <p className="text-sm text-rose-700">
          Refresh the page or try again in a few minutes. If this continues, contact support.
        </p>
      </div>
    );
  }

  if (activeEntitlement) {
    const expiresOn = formatDate(activeEntitlement.accessEnd);
    return (
      <div className="space-y-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="font-heading text-xl text-emerald-800">You already have full access</h2>
        <p className="text-sm text-emerald-700">
          Thanks for supporting your NBCOT prep! Your StudyPack access is active
          {expiresOn ? ` through ${expiresOn}.` : "."}
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            href="/dashboard"
          >
            Go to dashboard
          </a>
          <a
            className="inline-flex items-center justify-center rounded-full border border-emerald-300 px-5 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100"
            href="/practice-test"
          >
            Start a practice test
          </a>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-xl text-slate-900">NBCOT StudyPack Access</h2>
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            Most popular
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Full-length practice exam, adaptive drills, remediation, and analytics for the entire 90-day study window.
        </p>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>✔️ 1x full-length NBCOT simulation with answer explanations</li>
          <li>✔️ Unlimited adaptive drills &amp; flashcard decks</li>
          <li>✔️ Domain analytics, remediation links, and export tools</li>
          <li>✔️ Automatic access to new content drops during your window</li>
        </ul>
        <div className="flex items-baseline gap-2 pt-4">
          <span className="text-3xl font-semibold text-slate-900">{formatPrice(PRODUCT_PRICE)}</span>
          <span className="text-sm text-slate-500">one-time • {PRODUCT_DURATION_DAYS}-day access</span>
        </div>
        <button
          type="button"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isSubmitting}
          onClick={() => void handleCheckout()}
        >
          {isSubmitting ? "Redirecting to Stripe…" : "Activate full access"}
        </button>
        {statusMessage ? <p className="text-xs text-slate-500">{statusMessage}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">Need help with billing?</p>
        <p className="mt-2">
          Stripe securely processes the payment. If you need an invoice or institution access, email{" "}
          <a className="text-sky-600 underline" href="mailto:hello@studypack.test">
            hello@studypack.test
          </a>
          .
        </p>
      </div>
    </section>
  );
}
