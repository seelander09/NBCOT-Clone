import "dotenv/config";
import { PrismaClient, PurchaseStatus } from "@prisma/client";

const prisma = new PrismaClient();

const TARGET_COUNT = Number(process.env.TEST_STUDENT_REVOKE_COUNT ?? "5");

async function main() {
  console.info(`[revoke] Marking first ${TARGET_COUNT} test students as expired...`);

  const targetUsers = await prisma.user.findMany({
    where: { email: { startsWith: "test.student" } },
    orderBy: { email: "asc" },
    take: TARGET_COUNT,
    select: { id: true, email: true },
  });

  const now = new Date();

  for (const user of targetUsers) {
    await prisma.purchase.updateMany({
      where: { userId: user.id },
      data: {
        status: PurchaseStatus.CANCELED,
        accessEnd: now,
      },
    });
    console.info(`   - Revoked access for ${user.email}`);
  }

  console.info("[revoke] Completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

