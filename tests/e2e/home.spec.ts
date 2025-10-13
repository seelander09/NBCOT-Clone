import { test, expect } from '@playwright/test';

test.describe('Landing page experience', () => {
  test('displays hero content and key actions', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1, name: /Master the NBCOT exam with confidence/i }),
    ).toBeVisible();

    const startExamCta = page.getByRole('link', { name: /Start your practice exam/i });
    const previewToolsCta = page.getByRole('link', { name: /Preview study tools/i });

    await expect(startExamCta).toBeVisible();
    await expect(previewToolsCta).toBeVisible();

    await expect(
      page.getByText('Questions in the bank', { exact: false }),
    ).toBeVisible();
  });

  test('navigates to the tour page from the secondary CTA', async ({ page }) => {
    await page.goto('/');

    const navigation = page.waitForNavigation({
      url: '**/tour',
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    });
    await page.getByRole('link', { name: /Preview study tools/i }).click();
    await navigation;
    await expect(
      page.getByRole('heading', { level: 1, name: /Explore the workflows you'll rely on/i }),
    ).toBeVisible();
  });
});
