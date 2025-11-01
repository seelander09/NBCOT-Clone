/*
  Rotates revoked cohort among fake students.
  - Picks the next N emails in order to set status CANCELED
  - Restores others to COMPLETED

  Usage:
    npx tsx scripts/rotate-revoked-fake-students.ts --count 5 --start 1
*/

import { PrismaClient, PurchaseStatus } from '@prisma/client';

const prisma = new PrismaClient();

function parseIntArg(name: string, defaultValue: number): number {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) {
    const n = Number.parseInt(process.argv[idx + 1], 10);
    if (!Number.isNaN(n)) return n;
  }
  return defaultValue;
}

async function main() {
  const count = parseIntArg('count', Number(process.env.TEST_STUDENT_REVOKE_COUNT ?? '5'));
  const start = parseIntArg('start', 1);

  const emails = Array.from({ length: 30 }, (_, i) => `test.student${i + 1}@example.com`);

  const toRevoke: string[] = [];
  for (let i = 0; i < count; i++) {
    const index = (start - 1 + i) % emails.length;
    toRevoke.push(emails[index]);
  }

  const users = await prisma.user.findMany({
    where: { email: { in: emails.map((e) => e.toLowerCase()) } },
    select: { id: true, email: true },
  });

  const emailToUserId = new Map(users.map((u) => [u.email.toLowerCase(), u.id] as const));

  const revokeUserIds = toRevoke
    .map((e) => emailToUserId.get(e.toLowerCase()))
    .filter((v): v is string => Boolean(v));

  const restoreUserIds = users
    .map((u) => u.id)
    .filter((id) => !revokeUserIds.includes(id));

  if (restoreUserIds.length > 0) {
    await prisma.purchase.updateMany({ where: { userId: { in: restoreUserIds } }, data: { status: PurchaseStatus.COMPLETED } });
  }

  if (revokeUserIds.length > 0) {
    await prisma.purchase.updateMany({ where: { userId: { in: revokeUserIds } }, data: { status: PurchaseStatus.CANCELED } });
  }

  // eslint-disable-next-line no-console
  console.log('Revoked cohort rotated', { count, start, revoked: toRevoke });
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


