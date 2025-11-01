import { test, expect } from './fixtures/auth';

test.describe('A11y checks with axe-core', () => {
  test('practice-test has no critical accessibility violations', async ({ loginAs, page }) => {
    await loginAs('test.student20@example.com');
    await page.goto('/practice-test');

    // Inject axe-core from node_modules
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const axePath = require.resolve('axe-core');
    await page.addScriptTag({ path: axePath });

    // Configure context to main content
    const results = await page.evaluate(async () => {
      // @ts-ignore
      const axe = (window as any).axe;
      if (!axe) return null;
      // Run with rules that commonly flag SPA issues
      return await axe.run(document, {
        runOnly: ['wcag2a', 'wcag2aa'],
      });
    });

    test.skip(!results, 'axe-core not available');
    if (!results) return;

    const critical = results.violations.filter((v: any) => v.impact === 'critical');
    const serious = results.violations.filter((v: any) => v.impact === 'serious');

    // Log violations for debugging in CI output
    if (critical.length + serious.length > 0) {
      // eslint-disable-next-line no-console
      console.log('A11y violations:', JSON.stringify(results.violations, null, 2));
    }

    expect(critical.length).toBe(0);
    expect(serious.length).toBe(0);
  });
});


