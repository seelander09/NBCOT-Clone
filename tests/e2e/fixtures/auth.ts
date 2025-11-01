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
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, email: true, firstName: true, lastName: true },
      });

      if (!user) {
        throw new Error(`No user found for ${email}. Run create-fake-students.ts first.`);
      }

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
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true },
      });

      if (!user) {
        throw new Error(`No user found for ${email}.`);
      }

      await prisma.purchase.updateMany({
        where: { userId: user.id },
        data: { status },
      });
    }

    await use(setEntitlementStatus);
  },
});

export const expect = baseExpect;
