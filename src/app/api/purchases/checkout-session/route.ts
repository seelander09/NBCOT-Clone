import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Stripe from "stripe";

import { authOptions } from "@/lib/auth-options";
import { hasActiveEntitlement } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { PurchaseStatus } from "@prisma/client";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    productSku = "studypack-full",
    successUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/checkout/success`,
    cancelUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/checkout/cancel`,
  } = body as {
    productSku?: string;
    successUrl?: string;
    cancelUrl?: string;
    priceId?: string;
  };

  const product = await prisma.product.findUnique({ where: { sku: productSku } });

  if (!product) {
    return NextResponse.json({ error: "Unknown product" }, { status: 404 });
  }

  const alreadyEntitled = await hasActiveEntitlement(session.user.id, { productSku });

  if (alreadyEntitled) {
    return NextResponse.json({ error: "You already have access to this product." }, { status: 409 });
  }

  const metadata = (product.metadata as Record<string, unknown> | null) ?? {};
  const configuredPrice = typeof metadata?.stripePriceId === "string" ? metadata.stripePriceId : undefined;
  const overridePriceId = typeof body?.priceId === "string" ? body.priceId : undefined;

  let lineItem: Stripe.Checkout.SessionCreateParams.LineItem;

  if (overridePriceId ?? configuredPrice) {
    lineItem = {
      price: overridePriceId ?? configuredPrice,
      quantity: 1,
    };
  } else {
    lineItem = {
      price_data: {
        currency: product.currency,
        unit_amount: product.priceCents,
        product_data: {
          name: product.name,
          description: product.description ?? undefined,
        },
      },
      quantity: 1,
    };
  }

  const stripe = getStripeClient();

  if (!stripe) {
    return NextResponse.json(
      {
        error: "Payments are offline. Try again later or contact support to complete your purchase.",
      },
      { status: 503 },
    );
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: session.user.email ?? undefined,
    line_items: [lineItem],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      userId: session.user.id,
      productId: product.id,
    },
  });

  await prisma.purchase.create({
    data: {
      userId: session.user.id,
      productId: product.id,
      stripeSessionId: checkoutSession.id,
      status: PurchaseStatus.PENDING,
      totalCents: product.priceCents,
      currency: product.currency,
    },
  });

  return NextResponse.json({ url: checkoutSession.url, sessionId: checkoutSession.id });
}
