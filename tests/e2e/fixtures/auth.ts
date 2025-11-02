import { randomUUID } from 'crypto';
import { test as base, expect as baseExpect } from '@playwright/test';
import { PrismaClient, PurchaseStatus } from '@prisma/client';

type AuthFixtures = {
  loginAs: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  setEntitlementStatus: (email: string, status: PurchaseStatus) => Promise<void>;
};

const prisma = new PrismaClient();

type LoginState = {
  currentSessionToken?: string;
};

export const test = base.extend<
  {
    loginAs: AuthFixtures['loginAs'];
    logout: AuthFixtures['logout'];
    setEntitlementStatus: AuthFixtures['setEntitlementStatus'];
    loginState: LoginState;
  }
>({
  loginState: async ({}, use) => {
    const state: LoginState = {};
    await use(state);
    if (state.currentSessionToken) {
      await prisma.session.deleteMany({ where: { sessionToken: state.currentSessionToken } });
    }
  },
  loginAs: async ({ page, loginState }, use) => {
    async function loginAs(email: string) {
      const normalizedEmail = email.toLowerCase();
      console.log(`[auth-fixture] Logging in as fake student: ${normalizedEmail}`);

      // Clear any existing cookies and storage first
      await page.context().clearCookies();
      await page.goto('http://127.0.0.1:3000');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, email: true, firstName: true, lastName: true },
      });

      if (!user) {
        // Check if similar emails exist for better error message
        const similarUsers = await prisma.user.findMany({
          where: {
            email: {
              contains: normalizedEmail.split('@')[0],
            },
          },
          select: { email: true },
          take: 5,
        });

        const suggestion = similarUsers.length > 0
          ? ` Did you mean one of: ${similarUsers.map((u) => u.email).join(', ')}?`
          : '';

        throw new Error(
          `No user found for ${email}.${suggestion} Run 'npx tsx scripts/create-fake-students.ts' first to create fake student accounts.`,
        );
      }

      console.log(
        `[auth-fixture] Found user: ${user.firstName} ${user.lastName} (${user.email}, ID: ${user.id})`,
      );

      if (loginState.currentSessionToken) {
        await prisma.session.deleteMany({ where: { sessionToken: loginState.currentSessionToken } });
        loginState.currentSessionToken = undefined;
      }

      await prisma.session.deleteMany({ where: { userId: user.id } });

      const sessionToken = randomUUID();
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await prisma.session.create({
        data: {
          sessionToken,
          userId: user.id,
          expires,
        },
      });

      console.log(`[auth-fixture] Created session token: ${sessionToken.substring(0, 8)}...`);

      await page.context().addCookies([
        {
          name: 'next-auth.session-token',
          value: sessionToken,
          domain: '127.0.0.1',
          path: '/',
          httpOnly: true,
          sameSite: 'Lax',
        },
      ]);

      loginState.currentSessionToken = sessionToken;

      await page.goto('/dashboard');
      await expect(
        page.getByRole('heading', { name: new RegExp(`Welcome back,`, 'i') }),
      ).toBeVisible();

      console.log(`[auth-fixture] Successfully logged in as ${user.firstName} ${user.lastName}`);
    }

    await use(loginAs);
  },
  logout: async ({ page, loginState }, use) => {
    async function logout() {
      if (loginState.currentSessionToken) {
        await prisma.session.deleteMany({ where: { sessionToken: loginState.currentSessionToken } });
        loginState.currentSessionToken = undefined;
      }
      await page.context().clearCookies();
      await page.context().clearPermissions();
      await page.goto('/');
    }

    await use(logout);
  },
  setEntitlementStatus: async ({}, use) => {
    async function setEntitlementStatus(email: string, status: PurchaseStatus) {
      const normalizedEmail = email.toLowerCase();
      console.log(`[auth-fixture] Setting entitlement status for ${normalizedEmail} to ${status}`);

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });

      if (!user) {
        throw new Error(
          `No user found for ${email}. Run 'npx tsx scripts/create-fake-students.ts' first to create fake student accounts.`,
        );
      }

      const result = await prisma.purchase.updateMany({
        where: { userId: user.id },
        data: { status },
      });

      console.log(`[auth-fixture] Updated ${result.count} purchase(s) for user ${normalizedEmail}`);
    }

    await use(setEntitlementStatus);
  },
});

export const expect = baseExpect;
