"use server";

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export async function registerUser(formData: FormData) {
  const data = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: formData.get("firstName") || undefined,
    lastName: formData.get("lastName") || undefined,
  });

  if (!data.success) {
    return { ok: false, error: "Invalid signup data" } as const;
  }

  const { email, password, firstName, lastName } = data.data;
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existing) {
    return { ok: false, error: "An account with that email already exists." } as const;
  }

  const passwordHash = await hash(password, 10);

  await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      firstName: firstName || null,
      lastName: lastName || null,
    },
  });

  revalidatePath("/signup");

  return { ok: true, email: normalizedEmail } as const;
}
