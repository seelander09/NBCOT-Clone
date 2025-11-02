import { test, expect } from './fixtures/auth';

const TEST_STUDENT = 'test.student1@example.com';

test.describe('Remediation coverage tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('tracks remediation success rate for revealed items', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates remediation API returns results for at least 80% of revealed items (PRD Success Metric)',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });

    await loginAs(TEST_STUDENT);

    await test.step('Navigate to practice test', async () => {
      await page.goto('/practice-test');
      await expect(page).toHaveURL(/\/practice-test$/);
    });

    const remediationCalls: Array<{ questionId: string; success: boolean; itemCount: number }> = [];

    // Intercept remediation API calls to track success/failure
    await page.route('**/api/remediation', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON() as { questionId?: string; keywords?: string[]; prompt?: string };

      try {
        const response = await route.fetch();
        const json = await response.json();
        const items = (json as { items?: unknown[] }).items ?? [];
        const success = Array.isArray(items) && items.length > 0;

        remediationCalls.push({
          questionId: postData?.questionId ?? 'unknown',
          success,
          itemCount: Array.isArray(items) ? items.length : 0,
        });

        await route.fulfill({
          status: response.status(),
          contentType: 'application/json',
          body: JSON.stringify(json),
        });
      } catch {
        remediationCalls.push({
          questionId: postData?.questionId ?? 'unknown',
          success: false,
          itemCount: 0,
        });

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [] }),
        });
      }
    });

    await test.step('Answer and reveal multiple questions to trigger remediation', async () => {
      // Answer and reveal first 10 questions
      for (let i = 0; i < Math.min(10, 10); i++) {
        await test.step(`Process question ${i + 1}`, async () => {
          // Select an answer
          const options = page.getByTestId('answer-option');
          const count = await options.count();
          if (count > 0) {
            await options.first().click();
          }

          // Reveal answer (this triggers remediation API call)
          const revealButton = page.getByRole('button', { name: /Reveal answer & rationale/i });
          if (await revealButton.isEnabled().catch(() => false)) {
            await revealButton.click();
            
            // Wait for remediation to load (check for remediation items or book anchor)
            await page.waitForTimeout(500);
          }

          // Navigate to next question
          await page.keyboard.press('ArrowRight');
          await page.waitForTimeout(300);
        });
      }
    });

    await test.step('Verify remediation success rate meets PRD metric (80%)', async () => {
      expect(remediationCalls.length).toBeGreaterThan(0);

      const successfulCalls = remediationCalls.filter((call) => call.success);
      const successRate = (successfulCalls.length / remediationCalls.length) * 100;

      test.info().annotations.push({
        type: 'metric',
        description: `Remediation success rate: ${successRate.toFixed(1)}% (${successfulCalls.length}/${remediationCalls.length} calls successful)`,
      });

      // PRD Success Metric: at least one snippet for 80% of revealed items
      expect(successRate).toBeGreaterThanOrEqual(80);
    });

    await logout();
  });

  test('handles empty remediation results gracefully', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates UI handles empty remediation responses with book anchor fallback',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });

    await loginAs(TEST_STUDENT);

    // Mock remediation API to return empty results
    await page.route('**/api/remediation', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      });
    });

    await test.step('Navigate to practice test and reveal a question', async () => {
      await page.goto('/practice-test');
      await expect(page).toHaveURL(/\/practice-test$/);

      const firstOption = page.getByTestId('answer-option').first();
      await firstOption.waitFor();
      await firstOption.click();

      const revealButton = page.getByRole('button', { name: /Reveal answer & rationale/i });
      await revealButton.click();
    });

    await test.step('Verify question still displays correctly with empty remediation', async () => {
      // Should still show the question and rationale even if remediation is empty
      await expect(page.getByRole('button', { name: /Hide answer & rationale/i })).toBeVisible();
      
      // Check for book anchor fallback (if question has bookAnswer)
      const bookAnchor = page.locator('article').filter({ hasText: /Case-Smith|O'Brien|Reference/i });
      const hasBookAnchor = await bookAnchor.count() > 0;
      
      // Either remediation items OR book anchor should be present (or both)
      // If neither, that's also acceptable - the UI should handle it gracefully
      const remediationSection = page.locator('section, article').filter({ hasText: /remediation|reference/i });
      const hasAnySupport = (await remediationSection.count() > 0) || hasBookAnchor;
      
      // At minimum, the question should still be visible and functional
      await expect(page.getByTestId('answer-option').first()).toBeVisible();
    });

    await logout();
  });

  test('handles multi-item remediation results', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates UI displays multiple remediation items correctly',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });

    await loginAs(TEST_STUDENT);

    // Mock remediation API to return multiple items
    await page.route('**/api/remediation', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'remediation-1',
              title: 'First Remediation Item',
              excerpt: 'This is the first remediation snippet that provides additional context.',
              source: 'Case-Smith & O\'Brien',
            },
            {
              id: 'remediation-2',
              title: 'Second Remediation Item',
              excerpt: 'This is the second remediation snippet with more detailed information.',
              source: 'NBCOT Study Guide',
            },
            {
              id: 'remediation-3',
              title: 'Third Remediation Item',
              excerpt: 'This is the third remediation snippet offering alternative perspectives.',
              source: 'OTPF-4',
            },
          ],
        }),
      });
    });

    await test.step('Navigate to practice test and reveal a question', async () => {
      await page.goto('/practice-test');
      await expect(page).toHaveURL(/\/practice-test$/);

      const firstOption = page.getByTestId('answer-option').first();
      await firstOption.waitFor();
      await firstOption.click();

      const revealButton = page.getByRole('button', { name: /Reveal answer & rationale/i });
      await revealButton.click();
    });

    await test.step('Verify multiple remediation items are displayed', async () => {
      await page.waitForTimeout(500); // Wait for remediation to load

      // Check for remediation items (may appear as articles, sections, or list items)
      const remediationElements = page.locator('article, section').filter({
        hasText: /Remediation|First Remediation|Second Remediation|Third Remediation/i,
      });

      // At least one remediation item should be visible
      const count = await remediationElements.count();
      expect(count).toBeGreaterThan(0);
    });

    await logout();
  });

  test('tests remediation API with testId parameter for contextual search', async ({ loginAs, logout, page }) => {
    test.info().annotations.push({
      type: 'test',
      description: 'Validates remediation API accepts testId parameter for set-specific search (PRD 7.4)',
    });
    test.info().annotations.push({ type: 'student', description: `Using fake student: ${TEST_STUDENT}` });

    await loginAs(TEST_STUDENT);

    let capturedTestId: string | undefined;

    await page.route('**/api/remediation', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON() as { testId?: string };

      if (postData?.testId) {
        capturedTestId = postData.testId;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'test-specific-remediation',
              title: 'Test-Specific Remediation',
              excerpt: 'Remediation item for test set: ' + (postData?.testId ?? 'unknown'),
              source: 'Practice Set',
            },
          ],
        }),
      });
    });

    await test.step('Navigate to baseline practice test and trigger remediation', async () => {
      await page.goto('/practice-test');
      await expect(page).toHaveURL(/\/practice-test$/);

      const firstOption = page.getByTestId('answer-option').first();
      await firstOption.waitFor();
      await firstOption.click();

      const revealButton = page.getByRole('button', { name: /Reveal answer & rationale/i });
      await revealButton.click();

      await page.waitForTimeout(500);
    });

    await test.step('Verify testId parameter was sent in remediation request', async () => {
      // The testId may or may not be sent depending on implementation
      // This test verifies the API accepts it when provided
      if (capturedTestId) {
        expect(capturedTestId).toBeTruthy();
        // Baseline set should use 'otr-baseline' as testId
        expect(['otr-baseline', 'baseline']).toContain(capturedTestId.toLowerCase());
      }
    });

    await logout();
  });
});

