import { test, expect } from '@playwright/test';

const ENTITLEMENTS_ENDPOINT = '**/api/purchases/entitlements';
const CHECKOUT_ENDPOINT = '**/api/purchases/checkout-session';

test.describe('Checkout upgrade flow', () => {
  test('prompts unauthenticated visitors to sign in', async ({ page }) => {
    await page.route(ENTITLEMENTS_ENDPOINT, async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ entitlements: [] }),
      });
    });

    await page.goto('/checkout');

    await expect(page.getByRole('heading', { name: /sign in to continue/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /create account/i })).toHaveAttribute('href', '/signup');
  });

  test('launches Stripe checkout when user upgrades', async ({ page }) => {
    await page.route(ENTITLEMENTS_ENDPOINT, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ entitlements: [] }),
      });
    });

    const checkoutUrl = 'https://stripe.test/checkout-session/mock';

    await page.route(CHECKOUT_ENDPOINT, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: checkoutUrl, sessionId: 'cs_test_123' }),
      });
    });

    await page.goto('/checkout');

    await expect(page.getByRole('button', { name: /activate full access/i })).toBeEnabled();
    const checkoutRequestPromise = page.waitForRequest(CHECKOUT_ENDPOINT);
    await page.getByRole('button', { name: /activate full access/i }).click();

    await expect(
      page.getByText(/Checkout opened in a new tab/i),
    ).toBeVisible();

    await expect(checkoutRequestPromise).resolves.toBeTruthy();
  });

  test('shows existing access when entitlements already active', async ({ page }) => {
    const now = new Date();
    const accessEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await page.route(ENTITLEMENTS_ENDPOINT, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          entitlements: [
            {
              id: 'purchase-1',
              status: 'COMPLETED',
              accessStart: now.toISOString(),
              accessEnd: accessEnd.toISOString(),
              product: { sku: 'studypack-full', name: 'NBCOT StudyPack Full Access', accessWindow: 90 },
            },
          ],
        }),
      });
    });

    await page.goto('/checkout');

    await expect(page.getByText(/You already have full access/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Go to dashboard/i })).toBeVisible();
  });
});
