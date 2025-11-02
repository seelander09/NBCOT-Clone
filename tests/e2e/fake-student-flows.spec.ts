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
    test.info().annotations.push({ type: 'test', description: 'Validates personalized greeting for multiple fake student accounts' });
    
    for (const email of ACTIVE_STUDENTS) {
      await test.step(`Login as ${email} and verify personalized greeting`, async () => {
        test.info().annotations.push({ type: 'student', description: `Testing with fake student: ${email}` });
        
        await loginAs(email);
        const expectedName = email.match(/test\.student(\d+)/i)?.[1] ?? '';
        // Fake students are created with firstName "Test{number}" and lastName "Student"
        // So the display name will be "Test{number} Student"
        
        await test.step('Verify welcome message contains student name', async () => {
          await expect(page.getByRole('heading', { level: 1, name: /Welcome back/i })).toContainText(
            new RegExp(`Test${expectedName}\\s+Student`, 'i'),
          );
        });
        
        await logout();
      });
    }
  });

  test('active student can access practice lab and practice test surfaces', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({ 
      type: 'test', 
      description: 'Validates fake student can navigate practice test and catalog pages',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${ACTIVE_STUDENTS[1]}` });

    await loginAs(ACTIVE_STUDENTS[1]);

    await test.step('Navigate to practice test landing page', async () => {
      await page.goto('/practice-test');
      await expect(page).toHaveURL(/\/practice-test$/);
      
      await test.step('Verify practice test UI elements', async () => {
        await expect(page.getByRole('heading', { name: /OTR Baseline Practice Test/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Submit practice test/i })).toBeVisible();
      });
    });

    await logout();
    await loginAs(ACTIVE_STUDENTS[1]);

    await test.step('Navigate to practice lab catalog', async () => {
      await page.goto('/practice-lab');
      await expect(page).toHaveURL(/\/practice-lab$/);
      
      await test.step('Verify catalog UI elements', async () => {
        await expect(page.getByRole('heading', { name: /Practice sets library/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /Start practice test/i })).toBeVisible();
      });
    });

    await logout();
  });

  test('active student can complete core exam journey', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({ 
      type: 'test', 
      description: 'End-to-end journey: answer question, reveal rationale, submit, view results',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${ACTIVE_STUDENTS[0]}` });

    await loginAs(ACTIVE_STUDENTS[0]);

    await test.step('Navigate to practice test', async () => {
      await page.goto('/practice-test');
      await expect(page).toHaveURL(/\/practice-test$/);
    });

    await test.step('Answer a question', async () => {
      const firstOption = page.getByTestId('answer-option').first();
      await firstOption.waitFor();
      await firstOption.click();
    });

    await test.step('Reveal answer and rationale', async () => {
      const revealButton = page.getByRole('button', { name: /Reveal answer & rationale/i });
      await revealButton.click();
      await expect(page.getByRole('button', { name: /Hide answer & rationale/i })).toBeVisible();
    });

    await test.step('Submit practice test', async () => {
      await page.getByRole('button', { name: /Submit practice test/i }).click();
      const resultsSection = page.locator('section').filter({ hasText: 'Results summary' });
      await expect(resultsSection).toBeVisible();
      await expect(resultsSection.getByText(/Accuracy:/i).first()).toBeVisible();
    });

    await test.step('Verify dashboard shows session data', async () => {
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: /Session timeline/i })).toBeVisible();
    });

    await logout();
  });

  test('revoked student receives upgrade gating on exam creation', async ({
    loginAs,
    logout,
    page,
    setEntitlementStatus,
  }) => {
    test.info().annotations.push({ 
      type: 'test', 
      description: 'Validates entitlement gating blocks revoked students from creating exam sessions',
    });
    test.info().annotations.push({ type: 'student', description: `Using revoked fake student: ${REVOKED_STUDENT}` });

    await test.step('Revoke student entitlements', async () => {
      await setEntitlementStatus(REVOKED_STUDENT, 'CANCELED');
    });

    await loginAs(REVOKED_STUDENT);

    await test.step('Attempt to create exam session and verify 403 response', async () => {
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
    });

    await logout();
    
    await test.step('Restore student entitlements', async () => {
      await setEntitlementStatus(REVOKED_STUDENT, 'COMPLETED');
    });
  });

  test('progress dashboard surfaces placeholders after activity', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({ 
      type: 'test', 
      description: 'Validates dashboard placeholder sections render correctly',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${ACTIVE_STUDENTS[2]}` });

    await loginAs(ACTIVE_STUDENTS[2]);

    await test.step('Navigate to dashboard and verify placeholder sections', async () => {
      await page.goto('/dashboard');
      
      await test.step('Verify all placeholder sections are visible', async () => {
        await expect(page.getByText(/Session timeline/i)).toBeVisible();
        await expect(page.getByText(/Next-up queue/i)).toBeVisible();
        await expect(page.getByText(/Today.?s focus/i)).toBeVisible();
      });
    });

    await logout();
  });
});
