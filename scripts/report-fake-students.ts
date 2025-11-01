import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: "test.student" } },
    select: { id: true, email: true, createdAt: true },
    orderBy: { email: "asc" },
  });

  const purchases = await prisma.purchase.findMany({
    where: { user: { email: { startsWith: "test.student" } } },
    select: {
      user: { select: { email: true } },
      product: { select: { sku: true } },
      status: true,
      accessStart: true,
      accessEnd: true,
    },
    orderBy: { user: { email: "asc" } },
  });

  const grouped = purchases.reduce<Record<string, number>>((acc, purchase) => {
    const sku = purchase.product?.sku ?? "unknown";
    acc[sku] = (acc[sku] ?? 0) + 1;
    return acc;
  }, {});

  console.table(
    users.slice(0, 5).map((user) => ({
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    })),
  );
  console.info(`Total fake students: ${users.length}`);
  console.info("Access breakdown:", grouped);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

