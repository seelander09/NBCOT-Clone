"use client";

import { useEffect, useState } from "react";

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

type StatusKind = "success" | "cancel";

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

export function CheckoutStatus({ kind }: { kind: StatusKind }) {
  const [entitlements, setEntitlements] = useState<Entitlement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (kind !== "success") {
      return;
    }

    let mounted = true;
    async function hydrateEntitlements() {
      try {
        const response = await fetch("/api/purchases/entitlements", {
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`status: ${response.status}`);
        }

        const data = (await response.json()) as EntitlementResponse;
        if (mounted) {
          setEntitlements(data.entitlements ?? []);
        }
      } catch (hydrateError) {
        console.error("Failed to refresh entitlements after checkout", hydrateError);
        if (mounted) {
          setError("We couldn’t validate your new access automatically. Refresh or contact support if it persists.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateEntitlements();

    return () => {
      mounted = false;
    };
  }, [kind]);

  if (kind === "cancel") {
    return (
      <div className="space-y-4 rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="font-heading text-2xl text-amber-800">Checkout cancelled</h2>
        <p className="text-sm text-amber-800">
          Your card wasn&apos;t charged. When you&apos;re ready, head back to the checkout page to try again.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            className="inline-flex items-center justify-center rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:border-amber-400 hover:bg-amber-100"
            href="/checkout"
          >
            Return to checkout
          </a>
          <a
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-100"
            href="/dashboard"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    );
  }

  const hasEntitlement = entitlements?.length
    ? entitlements.some((item) => item.status === "COMPLETED" || item.status === "ACTIVE")
    : false;

  return (
    <div className="space-y-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
      <h2 className="font-heading text-2xl text-emerald-800">Thanks for upgrading!</h2>
      <p className="text-sm text-emerald-800">
        Once Stripe confirms the payment, your access unlocks automatically. It usually takes a moment—feel free to
        refresh if the perks below don&apos;t appear right away.
      </p>
      {isLoading ? (
        <p className="text-sm text-emerald-700">Checking your entitlements...</p>
      ) : hasEntitlement ? (
        <div className="rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-emerald-700">
          <p className="font-semibold text-emerald-800">Full access active</p>
          {entitlements
            ?.filter((entry) => entry.status === "COMPLETED" || entry.status === "ACTIVE")
            .map((entry) => {
              const expires = formatDate(entry.accessEnd);
              return (
                <p key={entry.id} className="mt-2">
                  {entry.product.name} ({entry.product.sku}) —{" "}
                  {expires ? `available through ${expires}` : "no expiration date recorded"}.
                </p>
              );
            })}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-emerald-700">
          <p className="font-semibold text-emerald-800">Access still provisioning</p>
          <p className="mt-2">
            We haven&apos;t detected completed access yet. If the page doesn&apos;t update within a few minutes, refresh the
            page. Still stuck? Email{" "}
            <a className="text-sky-600 underline" href="mailto:hello@studypack.test">
              hello@studypack.test
            </a>
            .
          </p>
        </div>
      )}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="flex flex-wrap gap-3 pt-1">
        <a
          className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          href="/dashboard"
        >
          Go to dashboard
        </a>
        <a
          className="inline-flex items-center justify-center rounded-full border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100"
          href="/practice-test"
        >
          Start practicing
        </a>
      </div>
    </div>
  );
}
