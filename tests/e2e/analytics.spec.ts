import { test, expect } from './fixtures/auth';

test.describe('Analytics assertions', () => {
  test('local analytics blob stored with expected fields after submission', async ({ loginAs, page }) => {
    await loginAs('test.student30@example.com');
    await page.goto('/practice-test');

    // Answer first item and submit
    const firstOption = page.getByTestId('answer-option').first();
    await firstOption.waitFor();
    await firstOption.click();
    await page.getByRole('button', { name: /Submit practice test/i }).click();

    // Read candidate analytics keys from window.localStorage
    const payload = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('nbcot-practice-analytics'));
      const items = keys.map((k) => ({ key: k, value: localStorage.getItem(k) }));
      return { keys, items };
    });

    expect(payload.keys.length).toBeGreaterThan(0);
    const value = payload.items.find(Boolean)?.value ?? '[]';
    const parsed = JSON.parse(value);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);

    const last = parsed[parsed.length - 1];
    expect(last.testId).toBeTruthy();
    expect(last.testLabel).toBeTruthy();
    expect(typeof last.totalDurationMs).toBe('number');
    expect(last.domainBreakdown?.length).toBeGreaterThanOrEqual(1);

    // Accuracy consistency check
    if (typeof last.accuracyRatio === 'number' && typeof last.correct === 'number' && typeof last.scorable === 'number') {
      const recomputed = last.scorable > 0 ? last.correct / last.scorable : null;
      if (recomputed !== null) {
        expect(Math.abs(last.accuracyRatio - recomputed)).toBeLessThan(1e-6);
      }
    }
  });
});


