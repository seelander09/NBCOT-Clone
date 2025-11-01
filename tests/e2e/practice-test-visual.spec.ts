import { test, expect } from './fixtures/auth';

test.describe('Practice test visual snapshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test('key states snapshots', async ({ loginAs, logout, page }) => {
    await loginAs('test.student1@example.com');
    await page.goto('/practice-test');

    // Unanswered state
    await expect(page).toHaveScreenshot('practice-test-unanswered.png', { fullPage: false });

    // Select an answer
    const firstOption = page.getByTestId('answer-option').first();
    await firstOption.waitFor();
    await firstOption.click();
    await expect(page).toHaveScreenshot('practice-test-selected.png', { fullPage: false });

    // Reveal feedback state
    const reveal = page.getByRole('button', { name: /Reveal answer/i });
    if (await reveal.isEnabled()) {
      await reveal.click();
    }
    await expect(page).toHaveScreenshot('practice-test-revealed.png', { fullPage: false });

    // Submitted summary state
    await page.getByRole('button', { name: /Submit practice test/i }).click();
    await expect(page.locator('text=Results summary')).toBeVisible();
    await expect(page).toHaveScreenshot('practice-test-summary.png', { fullPage: false });

    await logout();
  });
});


