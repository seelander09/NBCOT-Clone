import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

type AnalyticsEventInput = {
  name?: string;
  sessionId?: string;
  timestamp?: string;
  payload?: unknown;
  context?: unknown;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  const body = await request.json().catch(() => null);

  const events = Array.isArray(body?.events)
    ? (body.events as AnalyticsEventInput[])
    : [];

  if (!events.length) {
    return NextResponse.json({ inserted: 0 });
  }

  await prisma.analyticsEvent.createMany({
    data: events.map((event) => {
      const eventTime = event.timestamp ? new Date(event.timestamp) : undefined;
      const validEventTime = eventTime && !Number.isNaN(eventTime.getTime()) ? eventTime : undefined;

      return {
        userId: session?.user?.id ?? null,
        sessionId: event.sessionId ?? null,
        eventName: event.name ?? "unknown",
        eventTime: validEventTime,
        payload: event.payload ?? {},
        context: event.context ?? null,
      };
    }),
  });

  return NextResponse.json({ inserted: events.length });
}
