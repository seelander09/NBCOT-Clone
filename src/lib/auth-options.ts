import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { UserRole } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
  pages: {
    signIn: "/signup",
  },
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const isValid = await compare(credentials.password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || undefined;

        return {
          id: user.id,
          email: user.email,
          name: fullName,
          role: user.role,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
        } satisfies {
          id: string;
          email: string;
          name?: string;
          role: UserRole;
          firstName?: string | null;
          lastName?: string | null;
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
        session.user.firstName = user.firstName ?? undefined;
        session.user.lastName = user.lastName ?? undefined;
        session.user.email = user.email;
      }

      return session;
    },
  },
};
