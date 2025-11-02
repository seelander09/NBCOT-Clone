import { test, expect } from './fixtures/auth';

const TEST_STUDENT = 'test.student1@example.com';

test.describe('Practice set catalog', () => {
  test.describe.configure({ mode: 'serial' });

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

  test('fake student can browse catalog with metadata display', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates practice lab catalog displays all sets with correct metadata',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });

    await loginAs(TEST_STUDENT);

    await test.step('Navigate to practice lab catalog', async () => {
      await page.goto('/practice-lab');
      await expect(page).toHaveURL(/\/practice-lab$/);
    });

    await test.step('Verify catalog header and description', async () => {
      await expect(page.getByRole('heading', { name: /Practice sets library/i })).toBeVisible();
      await expect(page.getByText(/Choose from the available full-length exams/i)).toBeVisible();
    });

    await test.step('Verify baseline set displays correct metadata', async () => {
      const baselineCard = page.locator('article').filter({ hasText: /OTR Baseline Practice Test/i });
      await expect(baselineCard).toBeVisible();

      await test.step('Check status badge', async () => {
        await expect(baselineCard.getByText(/Available/i)).toBeVisible();
      });

      await test.step('Check question count', async () => {
        await expect(baselineCard.getByText(/Questions/i)).toBeVisible();
      });

      await test.step('Check release date', async () => {
        await expect(baselineCard.getByText(/Release/i)).toBeVisible();
      });

      await test.step('Check domain coverage', async () => {
        await expect(baselineCard.getByText(/Domains/i)).toBeVisible();
      });

      await test.step('Check coverage meters', async () => {
        await expect(baselineCard.getByText(/Rationales/i)).toBeVisible();
        await expect(baselineCard.getByText(/Book anchors/i)).toBeVisible();
        await expect(baselineCard.getByText(/Remediation/i)).toBeVisible();
      });

      await test.step('Check CTA button', async () => {
        await expect(baselineCard.getByRole('link', { name: /Start practice test/i })).toBeVisible();
      });
    });

    await test.step('Verify Set 4 displays correct metadata', async () => {
      const set4Card = page.locator('article').filter({ hasText: /OTR Practice Test 4/i });
      await expect(set4Card).toBeVisible();

      await test.step('Check status badge shows in progress', async () => {
        await expect(set4Card.getByText(/In QA/i)).toBeVisible();
      });

      await test.step('Verify View details button for in-progress set', async () => {
        await expect(set4Card.getByRole('link', { name: /View details/i })).toBeVisible();
      });
    });

    await logout();
  });

  test('catalog displays completion badges from analyticsStorageKey', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates completion badges render from localStorage analytics data',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });

    await loginAs(TEST_STUDENT);

    await test.step('Navigate to practice lab catalog', async () => {
      await page.goto('/practice-lab');
      await expect(page).toHaveURL(/\/practice-lab$/);
    });

    await test.step('Verify initial state shows no submissions', async () => {
      const baselineCard = page.locator('article').filter({ hasText: /OTR Baseline Practice Test/i });
      await expect(baselineCard.getByText(/Submissions: 0/i)).toBeVisible();
      await expect(baselineCard.getByText(/Last submitted: n\/a/i)).toBeVisible();
      await expect(baselineCard.getByText(/Average accuracy: n\/a/i)).toBeVisible();
    });

    await test.step('Seed analytics data for baseline set', async () => {
      await page.evaluate(() => {
        const analyticsData = [
          {
            submittedAt: new Date().toISOString(),
            accuracyPercent: 75,
          },
          {
            submittedAt: new Date(Date.now() - 86400000).toISOString(),
            accuracyPercent: 82,
          },
        ];
        window.localStorage.setItem('nbcot-practice-analytics-v1', JSON.stringify(analyticsData));
      });

      // Trigger storage event to update UI
      await page.evaluate(() => {
        window.dispatchEvent(new StorageEvent('storage', { key: 'nbcot-practice-analytics-v1' }));
      });
    });

    await test.step('Verify analytics data displays in catalog', async () => {
      const baselineCard = page.locator('article').filter({ hasText: /OTR Baseline Practice Test/i });
      
      await test.step('Check submission count', async () => {
        await expect(baselineCard.getByText(/Submissions: 2/i)).toBeVisible();
      });

      await test.step('Check last submitted date', async () => {
        await expect(baselineCard.getByText(/Last submitted:/i)).toBeVisible();
      });

      await test.step('Check average accuracy', async () => {
        await expect(baselineCard.getByText(/Average accuracy: 7[89]%/i)).toBeVisible();
      });
    });

    await logout();
  });

  test('catalog shows resume session indicator when sessionStorageKey has data', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates resume session indicator appears when in-progress session exists',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });

    await loginAs(TEST_STUDENT);

    await test.step('Seed session data for baseline set', async () => {
      await page.evaluate(() => {
        const sessionData = {
          currentQuestionId: 'otr-q-001',
          answers: { 'otr-q-001': ['A'] },
          startTime: Date.now(),
        };
        window.localStorage.setItem('nbcot-practice-session-v1', JSON.stringify(sessionData));
      });
    });

    await test.step('Navigate to practice lab catalog', async () => {
      await page.goto('/practice-lab');
      await expect(page).toHaveURL(/\/practice-lab$/);
    });

    await test.step('Verify resume session indicator appears', async () => {
      const baselineCard = page.locator('article').filter({ hasText: /OTR Baseline Practice Test/i });
      await expect(baselineCard.getByText(/Resume session in progress/i)).toBeVisible();
    });

    await logout();
  });

  test('fake student can navigate between available and in-progress sets', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates navigation between different practice sets from catalog',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });

    await loginAs(TEST_STUDENT);

    await test.step('Navigate to practice lab catalog', async () => {
      await page.goto('/practice-lab');
      await expect(page).toHaveURL(/\/practice-lab$/);
    });

    await test.step('Click baseline set and verify navigation', async () => {
      const baselineCard = page.locator('article').filter({ hasText: /OTR Baseline Practice Test/i });
      const startLink = baselineCard.getByRole('link', { name: /Start practice test/i });
      
      await startLink.click();
      await expect(page).toHaveURL(/\/practice-test$/);
      await expect(page.getByRole('heading', { name: /OTR Baseline Practice Test/i })).toBeVisible();
    });

    await test.step('Return to catalog and click Set 4', async () => {
      await page.goto('/practice-lab');
      await expect(page).toHaveURL(/\/practice-lab$/);

      const set4Card = page.locator('article').filter({ hasText: /OTR Practice Test 4/i });
      const detailsLink = set4Card.getByRole('link', { name: /View details/i });
      
      await detailsLink.click();
      await expect(page).toHaveURL(/\/practice-test-4$/);
    });

    await logout();
  });

  test('catalog visual snapshot - empty state', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Captures visual snapshot of catalog with no analytics data',
    });

    await loginAs(TEST_STUDENT);

    await page.goto('/practice-lab');
    await expect(page).toHaveURL(/\/practice-lab$/);

    const catalogSection = page.locator('main').filter({ hasText: /Practice sets library/i });
    await expect(catalogSection).toBeVisible();

    await expect(catalogSection).toHaveScreenshot('practice-catalog-empty-state.png');

    await logout();
  });
});
