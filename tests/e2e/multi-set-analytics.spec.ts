import { test, expect } from './fixtures/auth';

test.describe('Cross-set navigation and analytics separation', () => {
  test('baseline and set-4 use different analytics keys and both record entries', async ({ loginAs, page }) => {
    await loginAs('test.student1@example.com');

    // Baseline
    await page.goto('/practice-test');
    await page.getByTestId('answer-option').first().click();
    await page.getByRole('button', { name: /Submit practice test/i }).click();

    // Set 4 (if present)
    await page.goto('/practice-test-4');
    const hasSet4 = await page.getByRole('heading', { name: /OTR .*Set.*4|Practice Test/i }).count();
    test.skip(hasSet4 === 0, 'Practice test set 4 route not available');
    if (hasSet4 === 0) return;

    const firstOption = page.getByTestId('answer-option').first();
    await firstOption.waitFor();
    await firstOption.click();
    await page.getByRole('button', { name: /Submit practice test/i }).click();

    // Inspect localStorage
    const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('nbcot-practice-analytics')));
    expect(keys.length).toBeGreaterThanOrEqual(2);

    // Ensure keys are distinct
    const unique = new Set(keys);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });
});


