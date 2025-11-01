import "dotenv/config";
import { PrismaClient, PurchaseStatus, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const STUDENT_COUNT = 30;
const PASSWORD = process.env.TEST_USER_PASSWORD || "Testing123!";
const PRODUCT_SKU = process.env.TEST_ACCESS_PRODUCT_SKU || "studypack-full";
const TIMEZONE = "America/New_York";

async function ensureProduct() {
  const product = await prisma.product.findUnique({
    where: { sku: PRODUCT_SKU },
  });

  if (!product) {
    throw new Error(
      `Product ${PRODUCT_SKU} not found. Seed products first or set TEST_ACCESS_PRODUCT_SKU.`,
    );
  }

  return product;
}

async function upsertStudent(index: number, passwordHash: string, productId: string, priceCents: number, currency: string, accessWindow?: number | null) {
  const email = `test.student${index}@example.com`;

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      firstName: `Test${index}`,
      lastName: "Student",
      passwordHash,
      role: UserRole.CANDIDATE,
      timezone: TIMEZONE,
    },
  });

  const accessStart = new Date();
  const accessEnd = new Date(accessStart);
  accessEnd.setDate(accessStart.getDate() + (accessWindow ?? 90));

  await prisma.purchase.deleteMany({
    where: {
      userId: user.id,
      productId,
    },
  });

  await prisma.purchase.create({
    data: {
      userId: user.id,
      productId,
      status: PurchaseStatus.COMPLETED,
      totalCents: priceCents,
      currency,
      accessStart,
      accessEnd,
    },
  });
}

async function main() {
  console.info(`[seed] Creating ${STUDENT_COUNT} fake students...`);
  const passwordHash = await hash(PASSWORD, 10);
  const product = await ensureProduct();

  for (let i = 1; i <= STUDENT_COUNT; i += 1) {
    await upsertStudent(
      i,
      passwordHash,
      product.id,
      product.priceCents,
      product.currency,
      product.accessWindow,
    );
  }

  console.info(`[seed] Finished. Email: test.studentX@example.com / Password: ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
