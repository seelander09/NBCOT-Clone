import { test, expect } from './fixtures/auth';

const ACTIVE_STUDENTS = ['test.student1@example.com', 'test.student20@example.com', 'test.student30@example.com'];

const REVOKED_STUDENT = 'test.student10@example.com';

test.describe('Fake student automation flows', () => {
test.describe.configure({ mode: 'serial' });
test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  await page.context().clearPermissions();
  await page.route('**/api/remediation', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    });
  });
});

  test('auth onboarding greets seeded students by name', async ({ loginAs, logout, page }) => {
    for (const email of ACTIVE_STUDENTS) {
      await test.step(`Login as ${email}`, async () => {
        await loginAs(email);
        const expectedName = email.match(/test\.student(\d+)/i)?.[1] ?? '';
        await expect(page.getByRole('heading', { level: 1, name: /Welcome back/i })).toContainText(
          new RegExp(`Test${expectedName}`, 'i'),
        );
        await logout();
      });
    }
  });

  test('active student can access practice lab and practice test surfaces', async ({ loginAs, logout, page }) => {
    await loginAs(ACTIVE_STUDENTS[1]);

    await test.step('Practice test landing', async () => {
      await page.goto('/practice-test');
      await expect(page).toHaveURL(/\/practice-test$/);
      await expect(page.getByRole('heading', { name: /OTR Baseline Practice Test/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Submit practice test/i })).toBeVisible();
    });

    await logout();
    await loginAs(ACTIVE_STUDENTS[1]);

    await test.step('Practice lab catalog', async () => {
      await page.goto('/practice-lab');
      await expect(page).toHaveURL(/\/practice-lab$/);
      await expect(page.getByRole('heading', { name: /Practice sets library/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Start practice test/i })).toBeVisible();
    });

    await logout();
  });

  test('active student can complete core exam journey', async ({ loginAs, logout, page }) => {
    await loginAs(ACTIVE_STUDENTS[0]);

    await page.goto('/practice-test');
    await expect(page).toHaveURL(/\/practice-test$/);

    const firstOption = page.getByTestId('answer-option').first();
    await firstOption.waitFor();
    await firstOption.click();

    const revealButton = page.getByRole('button', { name: /Reveal answer & rationale/i });
    await revealButton.click();
    await expect(page.getByRole('button', { name: /Hide answer & rationale/i })).toBeVisible();

    await page.getByRole('button', { name: /Submit practice test/i }).click();
    const resultsSection = page.locator('section').filter({ hasText: 'Results summary' });
    await expect(resultsSection).toBeVisible();
    await expect(resultsSection.getByText(/Accuracy:/i).first()).toBeVisible();

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Session timeline/i })).toBeVisible();

    await logout();
  });

  test('revoked student receives upgrade gating on exam creation', async ({
    loginAs,
    logout,
    page,
    setEntitlementStatus,
  }) => {
    await setEntitlementStatus(REVOKED_STUDENT, 'CANCELED');

    await loginAs(REVOKED_STUDENT);

    const status = await page.evaluate(async () => {
      const response = await fetch('/api/exams/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      return response.status;
    });

    expect(status).toBe(403);

    await logout();
    await setEntitlementStatus(REVOKED_STUDENT, 'COMPLETED');
  });

  test('progress dashboard surfaces placeholders after activity', async ({ loginAs, logout, page }) => {
    await loginAs(ACTIVE_STUDENTS[2]);

    await page.goto('/dashboard');
    await expect(page.getByText(/Session timeline/i)).toBeVisible();
    await expect(page.getByText(/Next-up queue/i)).toBeVisible();
    await expect(page.getByText(/Today.?s focus/i)).toBeVisible();

    await logout();
  });
});
