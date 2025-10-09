import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";
import { getActiveEntitlements } from "@/lib/entitlements";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ entitlements: [] });
  }

  const entitlements = await getActiveEntitlements(session.user.id);

  return NextResponse.json({
    entitlements: entitlements.map((purchase) => ({
      id: purchase.id,
      product: {
        sku: purchase.product.sku,
        name: purchase.product.name,
        accessWindow: purchase.product.accessWindow,
      },
      accessStart: purchase.accessStart,
      accessEnd: purchase.accessEnd,
      status: purchase.status,
    })),
  });
}
