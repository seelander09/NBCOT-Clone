import "dotenv/config";
import { PrismaClient, PurchaseStatus } from "@prisma/client";

const prisma = new PrismaClient();

const EMAIL = process.env.STRIPE_TEST_EMAIL ?? "test.student30@example.com";
const PRODUCT_SKU = process.env.TEST_ACCESS_PRODUCT_SKU ?? "studypack-full";

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: EMAIL.toLowerCase() },
    select: { id: true },
  });

  if (!user) {
    throw new Error(`Unable to locate user ${EMAIL}.`);
  }

  const product = await prisma.product.findUnique({
    where: { sku: PRODUCT_SKU },
    select: { id: true, priceCents: true, currency: true, accessWindow: true },
  });

  if (!product) {
    throw new Error(`Product ${PRODUCT_SKU} is not seeded.`);
  }

  const accessStart = new Date();
  const accessEnd = new Date(accessStart);
  accessEnd.setDate(accessStart.getDate() + (product.accessWindow ?? 90));

  const purchase = await prisma.purchase.upsert({
    where: {
      stripeSessionId: `mock-${user.id}-${product.id}`,
    },
    update: {
      status: PurchaseStatus.COMPLETED,
      accessStart,
      accessEnd,
      totalCents: product.priceCents,
      currency: product.currency,
      stripePaymentId: `payment_mock_${Date.now()}`,
    },
    create: {
      userId: user.id,
      productId: product.id,
      status: PurchaseStatus.COMPLETED,
      totalCents: product.priceCents,
      currency: product.currency,
      accessStart,
      accessEnd,
      stripeSessionId: `mock-${user.id}-${product.id}`,
      stripePaymentId: `payment_mock_${Date.now()}`,
    },
  });

  console.info(
    `[stripe-mock] Purchase ${purchase.id} marked COMPLETED for ${EMAIL} on ${PRODUCT_SKU}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

