import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.info("[cleanup] Removing fake student fixtures…");

  const users = await prisma.user.findMany({
    where: { email: { startsWith: "test.student" } },
    select: { id: true, email: true },
  });

  if (users.length === 0) {
    console.info("[cleanup] No fake students found, nothing to delete.");
    return;
  }

  const userIds = users.map((user) => user.id);

  await prisma.analyticsSnapshot.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.analyticsEvent.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.studyPlanTask.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.flashcardReview.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.examSession.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.purchase.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.account.deleteMany({ where: { userId: { in: userIds } } });

  await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  console.info(`[cleanup] Deleted ${users.length} fake students.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

