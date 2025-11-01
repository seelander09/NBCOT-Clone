import { test, expect } from './fixtures/auth';

test.describe('Performance budgets', () => {
  test('practice-test navigation timings within soft budget', async ({ loginAs, page }) => {
    await loginAs('test.student1@example.com');

    await page.goto('/practice-test');
    const nav = await page.evaluate(() => {
      const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (!entry) return null;
      return {
        domContentLoaded: entry.domContentLoadedEventEnd - entry.startTime,
        loadEvent: entry.loadEventEnd - entry.startTime,
      };
    });

    test.skip(!nav, 'Navigation timing not available');
    if (!nav) return;

    // Soft budgets (CI-safe): DCL < 4000ms, load < 6000ms
    expect(nav.domContentLoaded).toBeLessThan(4000);
    expect(nav.loadEvent).toBeLessThan(6000);
  });

  test('remediation happy path resolves within 1000ms (stubbed)', async ({ loginAs, page }) => {
    await loginAs('test.student20@example.com');

    await page.route('**/api/remediation', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [{ id: 'x', title: 'Ref', excerpt: 'Snippet' }] }) });
    });

    await page.goto('/practice-test');
    const option = page.getByTestId('answer-option').first();
    await option.waitFor();
    await option.click();

    const start = Date.now();
    await page.getByRole('button', { name: /Reveal answer/i }).click();
    await expect(page.getByText(/Ref|Reference excerpt/i)).toBeVisible();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThanOrEqual(1000);
  });
});


