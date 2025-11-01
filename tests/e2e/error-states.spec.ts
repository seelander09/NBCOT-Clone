import { test, expect } from './fixtures/auth';

test.describe('Error state coverage', () => {
  test('remediation timeout shows loading then fallback copy', async ({ loginAs, page }) => {
    await loginAs('test.student1@example.com');

    await page.route('**/api/remediation', async (route) => {
      // Delay to simulate timeout boundary then return empty
      await new Promise((r) => setTimeout(r, 2500));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
    });

    await page.goto('/practice-test');
    const option = page.getByTestId('answer-option').first();
    await option.waitFor();
    await option.click();
    await page.getByRole('button', { name: /Reveal answer/i }).click();

    await expect(page.getByText(/Pulling textbook matches/i)).toBeVisible();
    await expect(page.getByText(/No direct vector matches|Select an answer to trigger/i)).toBeVisible({ timeout: 6000 });
  });

  test('missing image assets do not break the page', async ({ loginAs, page }) => {
    await loginAs('test.student20@example.com');

    // 404 all public/practice-test images to simulate missing assets
    await page.route('**/practice-test/**', async (route) => {
      await route.fulfill({ status: 404 });
    });

    await page.goto('/practice-test');
    const firstOption = page.getByTestId('answer-option').first();
    await firstOption.waitFor();

    // Page remains interactive and rationale panel text is present
    await firstOption.click();
    await page.getByRole('button', { name: /Reveal answer/i }).click();
    await expect(page.getByText(/AI deep dive & rationale|Reveal the answer/i)).toBeVisible();
  });
});


