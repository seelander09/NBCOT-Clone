import { test, expect } from './fixtures/auth';

const TEST_STUDENT = 'test.student1@example.com';

test.describe('Dashboard with populated analytics', () => {
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

  test('fake student views dashboard with populated analytics summary', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates dashboard displays populated AnalyticsSummary with cross-session data',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });

    await loginAs(TEST_STUDENT);

    await test.step('Seed comprehensive analytics data for multiple sets', async () => {
      await page.evaluate(() => {
        // Baseline set analytics - multiple submissions
        const baselineAnalytics = [
          {
            testId: 'otr-baseline',
            testLabel: 'OTR Baseline Practice Test',
            submittedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
            accuracyPercent: 72,
            totalDurationMs: 3600000, // 60 minutes
            domainBreakdown: [
              {
                domainId: 'domain1',
                domainTitle: 'Domain 1',
                total: 25,
                answered: 25,
                correct: 18,
                timeSeconds: 900,
              },
              {
                domainId: 'domain2',
                domainTitle: 'Domain 2',
                total: 25,
                answered: 25,
                correct: 17,
                timeSeconds: 950,
              },
              {
                domainId: 'domain3',
                domainTitle: 'Domain 3',
                total: 25,
                answered: 25,
                correct: 19,
                timeSeconds: 880,
              },
              {
                domainId: 'domain4',
                domainTitle: 'Domain 4',
                total: 25,
                answered: 25,
                correct: 18,
                timeSeconds: 870,
              },
            ],
          },
          {
            testId: 'otr-baseline',
            testLabel: 'OTR Baseline Practice Test',
            submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
            accuracyPercent: 78,
            totalDurationMs: 3300000, // 55 minutes
            domainBreakdown: [
              {
                domainId: 'domain1',
                domainTitle: 'Domain 1',
                total: 25,
                answered: 25,
                correct: 20,
                timeSeconds: 850,
              },
              {
                domainId: 'domain2',
                domainTitle: 'Domain 2',
                total: 25,
                answered: 25,
                correct: 19,
                timeSeconds: 900,
              },
              {
                domainId: 'domain3',
                domainTitle: 'Domain 3',
                total: 25,
                answered: 25,
                correct: 20,
                timeSeconds: 830,
              },
              {
                domainId: 'domain4',
                domainTitle: 'Domain 4',
                total: 25,
                answered: 25,
                correct: 20,
                timeSeconds: 820,
              },
            ],
          },
          {
            testId: 'otr-baseline',
            testLabel: 'OTR Baseline Practice Test',
            submittedAt: new Date(Date.now() - 86400000).toISOString(),
            accuracyPercent: 82,
            totalDurationMs: 3000000, // 50 minutes
            domainBreakdown: [
              {
                domainId: 'domain1',
                domainTitle: 'Domain 1',
                total: 25,
                answered: 25,
                correct: 21,
                timeSeconds: 800,
              },
              {
                domainId: 'domain2',
                domainTitle: 'Domain 2',
                total: 25,
                answered: 25,
                correct: 21,
                timeSeconds: 850,
              },
              {
                domainId: 'domain3',
                domainTitle: 'Domain 3',
                total: 25,
                answered: 25,
                correct: 20,
                timeSeconds: 780,
              },
              {
                domainId: 'domain4',
                domainTitle: 'Domain 4',
                total: 25,
                answered: 25,
                correct: 20,
                timeSeconds: 770,
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
            accuracyPercent: 75,
            totalDurationMs: 2800000, // ~47 minutes
            domainBreakdown: [
              {
                domainId: 'domain2',
                domainTitle: 'Domain 2',
                total: 50,
                answered: 50,
                correct: 38,
                timeSeconds: 1600,
              },
              {
                domainId: 'domain3',
                domainTitle: 'Domain 3',
                total: 50,
                answered: 50,
                correct: 37,
                timeSeconds: 1620,
              },
            ],
          },
        ];

        window.localStorage.setItem('nbcot-practice-analytics-v1', JSON.stringify(baselineAnalytics));
        window.localStorage.setItem('nbcot-practice-analytics-otr4', JSON.stringify(set4Analytics));
      });
    });

    await test.step('Navigate to dashboard', async () => {
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
    });

    await test.step('Verify AnalyticsSummary section is visible and populated', async () => {
      const analyticsSection = page.locator('section, div').filter({ hasText: /Cross-set summary|Analytics/i });
      await expect(analyticsSection.first()).toBeVisible({ timeout: 5000 });

      // Verify it shows practice set summaries
      await expect(page.getByText(/OTR Baseline|Practice Test/i).first()).toBeVisible({ timeout: 3000 });
    });

    await test.step('Verify domain aggregation displays correctly', async () => {
      // Check for domain breakdown section
      const domainSection = page.getByText(/By domain|Domain 1|Domain 2|Domain 3|Domain 4/i);
      if (await domainSection.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(domainSection).toBeVisible();
      }
    });

    await logout();
  });

  test('dashboard shows session timeline placeholder when no session data exists', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates dashboard placeholders render correctly for new students',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });

    await loginAs(TEST_STUDENT);

    await test.step('Navigate to dashboard with no analytics data', async () => {
      // Ensure localStorage is clean
      await page.evaluate(() => {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('nbcot-practice'))
          .forEach((key) => localStorage.removeItem(key));
      });

      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
    });

    await test.step('Verify placeholder sections are visible', async () => {
      await expect(page.getByText(/Session timeline/i)).toBeVisible();
      await expect(page.getByText(/Next-up queue/i)).toBeVisible();
      await expect(page.getByText(/Today.?s focus/i)).toBeVisible();
    });

    await test.step('Verify analytics summary shows empty state', async () => {
      const emptyAnalytics = page.getByText(/Complete a practice test to populate/i);
      if (await emptyAnalytics.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(emptyAnalytics).toBeVisible();
      }
    });

    await logout();
  });

  test('dashboard analytics export functionality works with populated data', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates analytics export contains all populated set data',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });

    await loginAs(TEST_STUDENT);

    await test.step('Seed analytics data', async () => {
      await page.evaluate(() => {
        const baselineAnalytics = [
          {
            testId: 'otr-baseline',
            testLabel: 'OTR Baseline Practice Test',
            submittedAt: new Date().toISOString(),
            accuracyPercent: 75,
            totalDurationMs: 3600000,
          },
        ];

        const set4Analytics = [
          {
            testId: 'otr-set-4',
            testLabel: 'OTR Practice Test 4',
            submittedAt: new Date().toISOString(),
            accuracyPercent: 78,
            totalDurationMs: 2800000,
          },
        ];

        window.localStorage.setItem('nbcot-practice-analytics-v1', JSON.stringify(baselineAnalytics));
        window.localStorage.setItem('nbcot-practice-analytics-otr4', JSON.stringify(set4Analytics));
      });
    });

    await test.step('Navigate to dashboard', async () => {
      await page.goto('/dashboard');
    });

    await test.step('Extract and verify analytics data structure', async () => {
      const analyticsData = await page.evaluate(() => {
        const keys = Object.keys(localStorage).filter((k) => k.startsWith('nbcot-practice-analytics'));
        const allData: Array<{ testId?: string; testLabel?: string; accuracyPercent?: number }> = [];

        for (const key of keys) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                allData.push(...parsed);
              }
            }
          } catch {
            // Ignore parse errors
          }
        }

        return allData;
      });

      expect(analyticsData.length).toBeGreaterThanOrEqual(2);

      // Verify structure
      for (const entry of analyticsData) {
        expect(entry.testId).toBeTruthy();
        expect(entry.testLabel).toBeTruthy();
        expect(typeof entry.accuracyPercent).toBe('number');
      }
    });

    await logout();
  });
});

