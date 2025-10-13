import Stripe from "stripe";

let cachedStripe: Stripe | null | undefined;

export function getStripeClient(): Stripe | null {
  if (cachedStripe !== undefined) {
    return cachedStripe;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    cachedStripe = null;
    return cachedStripe;
  }

  cachedStripe = new Stripe(secretKey, {
    apiVersion: "2024-11-20",
    typescript: true,
  });

  return cachedStripe;
}

export function requireStripeClient(): Stripe {
  const client = getStripeClient();
  if (!client) {
    throw new Error(
      "Stripe client not configured. Set STRIPE_SECRET_KEY (and related env vars) to enable checkout and webhook features.",
    );
  }
  return client;
}
