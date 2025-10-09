import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { PurchaseStatus } from "@prisma/client";

export const runtime = "nodejs";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const signature = headers().get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkout = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(checkout);
        break;
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(charge);
        break;
      }
      default: {
        // no-op
      }
    }
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return NextResponse.json({ error: "Processing failure" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(checkout: Stripe.Checkout.Session) {
  const userId = checkout.metadata?.userId;
  const productId = checkout.metadata?.productId;
  const paymentIntentId = typeof checkout.payment_intent === "string" ? checkout.payment_intent : checkout.payment_intent?.id;

  const purchase = await prisma.purchase.findFirst({
    where: { stripeSessionId: checkout.id },
    include: { product: true },
  });

  const product = purchase?.product ?? (productId ? await prisma.product.findUnique({ where: { id: productId } }) : null);

  if (!purchase && userId && product) {
    const accessStart = new Date();
    const accessEnd = product.accessWindow ? addDays(accessStart, product.accessWindow) : null;

    await prisma.purchase.create({
      data: {
        userId,
        productId: product.id,
        status: PurchaseStatus.COMPLETED,
        totalCents: product.priceCents,
        currency: product.currency,
        accessStart,
        accessEnd,
        stripeSessionId: checkout.id,
        stripePaymentId: paymentIntentId ?? undefined,
      },
    });
    return;
  }

  if (!purchase || !product) {
    console.warn("Checkout completed without matching purchase", checkout.id);
    return;
  }

  const accessStart = new Date();
  const accessEnd = product.accessWindow ? addDays(accessStart, product.accessWindow) : null;

  await prisma.purchase.update({
    where: { id: purchase.id },
    data: {
      status: PurchaseStatus.COMPLETED,
      accessStart,
      accessEnd,
      stripePaymentId: paymentIntentId ?? purchase.stripePaymentId,
    },
  });
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const paymentIntentId = paymentIntent.id;

  await prisma.purchase.updateMany({
    where: {
      stripePaymentId: paymentIntentId,
    },
    data: {
      status: PurchaseStatus.FAILED,
    },
  });
}

async function handleRefund(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;

  if (!paymentIntentId) {
    return;
  }

  await prisma.purchase.updateMany({
    where: {
      stripePaymentId: paymentIntentId,
    },
    data: {
      status: PurchaseStatus.REFUNDED,
    },
  });
}

function addDays(date: Date, days: number) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
}
