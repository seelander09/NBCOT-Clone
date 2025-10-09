import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth-options";

const SKIP_AUTH = process.env.SKIP_AUTH === "true";

const mockUser = {
  id: "mock-user",
  email: "tester@example.com",
  firstName: "Test",
  lastName: "Pilot",
};

export async function getCurrentUser() {
  if (SKIP_AUTH) {
    return mockUser;
  }

  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireAuth(options?: { redirectTo?: string }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(options?.redirectTo ?? "/signup");
  }

  return user;
}
