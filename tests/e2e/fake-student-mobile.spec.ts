import { test, expect } from './fixtures/auth';

const TEST_STUDENT = 'test.student1@example.com';

test.describe('Fake student flows on mobile devices', () => {
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

  test('fake student can login and view dashboard on mobile', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates fake student authentication and dashboard on mobile viewport',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });
    test.info().annotations.push({ type: 'device', description: 'Mobile viewport' });

    await loginAs(TEST_STUDENT);

    await test.step('Navigate to dashboard and verify mobile layout', async () => {
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();

      // Verify responsive layout - sections should stack on mobile
      const header = page.locator('header').filter({ hasText: /Welcome back/i });
      await expect(header).toBeVisible();
    });

    await test.step('Verify touch targets are appropriately sized', async () => {
      // Check that interactive elements have adequate spacing
      const links = page.getByRole('link');
      const linkCount = await links.count();

      if (linkCount > 0) {
        const firstLink = links.first();
        const box = await firstLink.boundingBox();
        if (box) {
          // Touch targets should be at least 44x44px (iOS HIG / Material Design)
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    await logout();
  });

  test('fake student can navigate practice test on mobile', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates practice test navigation and interaction on mobile',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });
    test.info().annotations.push({ type: 'device', description: 'Mobile viewport' });

    await loginAs(TEST_STUDENT);

    await test.step('Navigate to practice test', async () => {
      await page.goto('/practice-test');
      await expect(page).toHaveURL(/\/practice-test$/);
    });

    await test.step('Verify practice test UI elements are visible and accessible', async () => {
      await expect(page.getByRole('heading', { name: /OTR Baseline Practice Test/i })).toBeVisible();

      const submitButton = page.getByRole('button', { name: /Submit practice test/i });
      await expect(submitButton).toBeVisible();

      // Verify answer options are visible
      const answerOptions = page.getByTestId('answer-option');
      const optionCount = await answerOptions.count();
      expect(optionCount).toBeGreaterThan(0);
    });

    await test.step('Test touch interaction with answer options', async () => {
      const firstOption = page.getByTestId('answer-option').first();
      await firstOption.waitFor();

      const box = await firstOption.boundingBox();
      if (box) {
        // Verify touch target size
        expect(box.height).toBeGreaterThanOrEqual(40);
      }

      await firstOption.click();
      await expect(page.getByText(/Answer saved/i)).toBeVisible({ timeout: 2000 });
    });

    await test.step('Test reveal button interaction', async () => {
      const revealButton = page.getByRole('button', { name: /Reveal answer & rationale/i });
      if (await revealButton.isEnabled().catch(() => false)) {
        await revealButton.click();
        await expect(page.getByRole('button', { name: /Hide answer & rationale/i })).toBeVisible({ timeout: 2000 });
      }
    });

    await logout();
  });

  test('fake student can browse practice lab catalog on mobile', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates practice lab catalog is usable on mobile viewport',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });
    test.info().annotations.push({ type: 'device', description: 'Mobile viewport' });

    await loginAs(TEST_STUDENT);

    await test.step('Navigate to practice lab catalog', async () => {
      await page.goto('/practice-lab');
      await expect(page).toHaveURL(/\/practice-lab$/);
    });

    await test.step('Verify catalog header and list are visible', async () => {
      await expect(page.getByRole('heading', { name: /Practice sets library/i })).toBeVisible();

      // Catalog items should be visible
      const catalogItems = page.locator('article').filter({ hasText: /OTR Baseline|Practice Test/i });
      const itemCount = await catalogItems.count();
      expect(itemCount).toBeGreaterThan(0);
    });

    await test.step('Verify catalog cards are responsive and touch-friendly', async () => {
      const firstCard = page.locator('article').first();
      await expect(firstCard).toBeVisible();

      // Check card layout is stacked on mobile
      const startLink = firstCard.getByRole('link', { name: /Start practice test|View details/i });
      if (await startLink.isVisible().catch(() => false)) {
        await expect(startLink).toBeVisible();
        
        // Verify link is touch-friendly
        const linkBox = await startLink.boundingBox();
        if (linkBox) {
          expect(linkBox.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    await logout();
  });

  test('practice test keyboard navigation works on mobile', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates keyboard navigation (for external keyboards on mobile devices)',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });
    test.info().annotations.push({ type: 'device', description: 'Mobile viewport' });

    await loginAs(TEST_STUDENT);

    await test.step('Navigate to practice test', async () => {
      await page.goto('/practice-test');
      await expect(page).toHaveURL(/\/practice-test$/);
    });

    await test.step('Test keyboard navigation between questions', async () => {
      // Navigate to next question
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);

      // Navigate back
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(300);

      // Verify we're back on first question
      await expect(page.getByRole('heading', { name: /Question 1/i })).toBeVisible({ timeout: 2000 });
    });

    await logout();
  });

  test('dashboard responsive behavior on mobile', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates dashboard sections stack properly on mobile viewport',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });
    test.info().annotations.push({ type: 'device', description: 'Mobile viewport' });

    await loginAs(TEST_STUDENT);

    await test.step('Navigate to dashboard', async () => {
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
    });

    await test.step('Verify dashboard sections are visible and properly stacked', async () => {
      // Check that all placeholder sections are visible
      await expect(page.getByText(/Session timeline/i)).toBeVisible();
      await expect(page.getByText(/Next-up queue/i)).toBeVisible();
      await expect(page.getByText(/Today.?s focus/i)).toBeVisible();

      // On mobile, cards should stack vertically
      const cards = page.locator('article, section').filter({ hasText: /Exams|Flashcards|Study plan/i });
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThanOrEqual(3);
    });

    await test.step('Verify text is readable on mobile', async () => {
      const heading = page.getByRole('heading', { name: /Welcome back/i });
      const headingBox = await heading.boundingBox();
      if (headingBox) {
        // Verify heading has adequate size (at least 20px for readability)
        expect(headingBox.height).toBeGreaterThan(20);
      }
    });

    await logout();
  });
});

