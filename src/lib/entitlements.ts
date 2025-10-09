import { prisma } from "@/lib/prisma";
import { PurchaseStatus } from "@prisma/client";

export async function hasActiveEntitlement(userId: string, options?: { productSku?: string }) {
  const now = new Date();

  const purchases = await prisma.purchase.findMany({
    where: {
      userId,
      status: PurchaseStatus.COMPLETED,
      ...(options?.productSku
        ? {
            product: {
              sku: options.productSku,
            },
          }
        : {}),
      OR: [{ accessEnd: null }, { accessEnd: { gt: now } }],
    },
    include: {
      product: true,
    },
  });

  return purchases.length > 0;
}

export async function getActiveEntitlements(userId: string) {
  const now = new Date();

  const purchases = await prisma.purchase.findMany({
    where: {
      userId,
      status: PurchaseStatus.COMPLETED,
      OR: [{ accessEnd: null }, { accessEnd: { gt: now } }],
    },
    include: {
      product: true,
    },
    orderBy: {
      accessEnd: "asc",
    },
  });

  return purchases;
}
