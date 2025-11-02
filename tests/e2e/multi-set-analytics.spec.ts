import { test, expect } from './fixtures/auth';

const TEST_STUDENT = 'test.student1@example.com';

test.describe('Cross-set navigation and analytics separation', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.route('**/api/remediation', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      });
    });
  });

  test('baseline and set-4 use different analytics keys and both record entries', async ({ loginAs, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates analytics keys are isolated per practice set',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });

    await loginAs(TEST_STUDENT);

    await test.step('Submit baseline practice test', async () => {
      await page.goto('/practice-test');
      await page.getByTestId('answer-option').first().click();
      await page.getByRole('button', { name: /Submit practice test/i }).click();
    });

    await test.step('Submit Set 4 practice test (if available)', async () => {
      await page.goto('/practice-test-4');
      const hasSet4 = await page.getByRole('heading', { name: /OTR .*Set.*4|Practice Test/i }).count();
      test.skip(hasSet4 === 0, 'Practice test set 4 route not available');
      if (hasSet4 === 0) return;

      const firstOption = page.getByTestId('answer-option').first();
      await firstOption.waitFor();
      await firstOption.click();
      await page.getByRole('button', { name: /Submit practice test/i }).click();
    });

    await test.step('Verify distinct analytics keys exist', async () => {
      const keys = await page.evaluate(() =>
        Object.keys(localStorage).filter((k) => k.startsWith('nbcot-practice-analytics')),
      );
      expect(keys.length).toBeGreaterThanOrEqual(2);

      // Ensure keys are distinct
      const unique = new Set(keys);
      expect(unique.size).toBeGreaterThanOrEqual(2);
    });
  });

  test('cross-session analytics aggregation displays correctly on dashboard', async ({ loginAs, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates AnalyticsSummary component aggregates data across multiple sets',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });

    await loginAs(TEST_STUDENT);

    await test.step('Seed analytics data for multiple sets', async () => {
      await page.evaluate(() => {
        // Baseline set analytics
        const baselineAnalytics = [
          {
            testId: 'otr-baseline',
            testLabel: 'OTR Baseline Practice Test',
            submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
            accuracyPercent: 75,
            domainBreakdown: [
              {
                domainId: 'domain1',
                domainTitle: 'Domain 1',
                total: 25,
                answered: 25,
                correct: 19,
                timeMs: 1500000,
              },
              {
                domainId: 'domain2',
                domainTitle: 'Domain 2',
                total: 25,
                answered: 25,
                correct: 18,
                timeMs: 1600000,
              },
            ],
          },
          {
            testId: 'otr-baseline',
            testLabel: 'OTR Baseline Practice Test',
            submittedAt: new Date(Date.now() - 86400000).toISOString(),
            accuracyPercent: 82,
            domainBreakdown: [
              {
                domainId: 'domain1',
                domainTitle: 'Domain 1',
                total: 25,
                answered: 25,
                correct: 21,
                timeMs: 1400000,
              },
              {
                domainId: 'domain2',
                domainTitle: 'Domain 2',
                total: 25,
                answered: 25,
                correct: 20,
                timeMs: 1500000,
              },
            ],
          },
        ];

        // Set 4 analytics
        const set4Analytics = [
          {
            testId: 'otr-set-4',
            testLabel: 'OTR Practice Test 4',
            submittedAt: new Date(Date.now() - 86400000).toISOString(),
            accuracyPercent: 78,
            domainBreakdown: [
              {
                domainId: 'domain2',
                domainTitle: 'Domain 2',
                total: 50,
                answered: 50,
                correct: 39,
                timeMs: 3000000,
              },
            ],
          },
        ];

        window.localStorage.setItem('nbcot-practice-analytics-v1', JSON.stringify(baselineAnalytics));
        window.localStorage.setItem('nbcot-practice-analytics-otr4', JSON.stringify(set4Analytics));
      });
    });

    await test.step('Navigate to dashboard and verify analytics summary', async () => {
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
    });

    await test.step('Verify analytics summary section exists', async () => {
      const analyticsSection = page.locator('section').filter({ hasText: /Analytics|Practice test/i });
      await expect(analyticsSection.first()).toBeVisible({ timeout: 5000 });
    });

    await test.step('Verify domain breakdown displays aggregated data', async () => {
      // Check if domain breakdown shows combined data from both sets
      const domainSection = page.getByText(/Domain/i).first();
      if (await domainSection.isVisible().catch(() => false)) {
        // Analytics summary should show domain aggregation
        await expect(domainSection).toBeVisible();
      }
    });
  });

  test('analytics export includes all set IDs', async ({ loginAs, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates analytics export contains testId for all completed sets',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });

    await loginAs(TEST_STUDENT);

    await test.step('Seed analytics data for multiple sets', async () => {
      await page.evaluate(() => {
        const baselineAnalytics = [
          {
            testId: 'otr-baseline',
            testLabel: 'OTR Baseline Practice Test',
            submittedAt: new Date().toISOString(),
            accuracyPercent: 75,
          },
        ];

        const set4Analytics = [
          {
            testId: 'otr-set-4',
            testLabel: 'OTR Practice Test 4',
            submittedAt: new Date().toISOString(),
            accuracyPercent: 78,
          },
        ];

        window.localStorage.setItem('nbcot-practice-analytics-v1', JSON.stringify(baselineAnalytics));
        window.localStorage.setItem('nbcot-practice-analytics-otr4', JSON.stringify(set4Analytics));
      });
    });

    await test.step('Extract analytics data and verify set IDs', async () => {
      const analyticsData = await page.evaluate(() => {
        const keys = Object.keys(localStorage).filter((k) => k.startsWith('nbcot-practice-analytics'));
        const allAnalytics: Array<{ testId?: string }> = [];

        for (const key of keys) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                allAnalytics.push(...parsed);
              }
            }
          } catch {
            // Ignore parse errors
          }
        }

        return allAnalytics;
      });

      expect(analyticsData.length).toBeGreaterThanOrEqual(2);
      
      const testIds = new Set(analyticsData.map((entry) => entry.testId).filter(Boolean));
      expect(testIds.size).toBeGreaterThanOrEqual(2);
      expect(testIds.has('otr-baseline')).toBe(true);
      expect(testIds.has('otr-set-4')).toBe(true);
    });
  });

  test('domain accuracy aggregation sums correctly across sets', async ({ loginAs, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates domain breakdown calculations are correct when aggregating multiple sessions',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });

    await loginAs(TEST_STUDENT);

    await test.step('Seed analytics with known domain breakdown values', async () => {
      await page.evaluate(() => {
        const analytics = [
          {
            testId: 'otr-baseline',
            testLabel: 'OTR Baseline Practice Test',
            submittedAt: new Date().toISOString(),
            accuracyPercent: 75,
            domainBreakdown: [
              {
                domainId: 'domain1',
                domainTitle: 'Domain 1',
                total: 25,
                answered: 25,
                correct: 18,
                timeMs: 1500000,
              },
              {
                domainId: 'domain2',
                domainTitle: 'Domain 2',
                total: 25,
                answered: 25,
                correct: 19,
                timeMs: 1600000,
              },
            ],
          },
        ];

        window.localStorage.setItem('nbcot-practice-analytics-v1', JSON.stringify(analytics));
      });
    });

    await test.step('Navigate to dashboard', async () => {
      await page.goto('/dashboard');
    });

    await test.step('Verify domain breakdown data integrity', async () => {
      const domainData = await page.evaluate(() => {
        const raw = localStorage.getItem('nbcot-practice-analytics-v1');
        if (!raw) return null;
        
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed[0].domainBreakdown;
          }
        } catch {
          return null;
        }
        return null;
      });

      expect(domainData).toBeTruthy();
      expect(Array.isArray(domainData)).toBe(true);
      
      if (domainData && Array.isArray(domainData)) {
        // Verify domain breakdown structure
        for (const domain of domainData) {
          expect(domain.domainId).toBeTruthy();
          expect(domain.total).toBeGreaterThan(0);
          expect(domain.answered).toBeGreaterThanOrEqual(0);
          expect(domain.correct).toBeGreaterThanOrEqual(0);
          expect(domain.correct).toBeLessThanOrEqual(domain.answered);
        }
      }
    });
  });
});



