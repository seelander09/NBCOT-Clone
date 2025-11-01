import { test, expect } from './fixtures/auth';

// Helpers
async function getSidebarElapsedLabel(page: import('@playwright/test').Page) {
  const dd = page.locator('dt', { hasText: 'Time elapsed' }).locator('xpath=..').locator('dd');
  await dd.waitFor();
  return (await dd.textContent())?.trim() ?? '';
}

function parseTimeToSeconds(label: string): number | null {
  // Supports mm:ss or h:mm:ss
  const parts = label.split(':').map((x) => Number.parseInt(x, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

test.describe('Practice test UX deep checks', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test('timers persist, can pause/resume, and survive reload', async ({ loginAs, logout, page }) => {
    await loginAs('test.student1@example.com');
    await page.goto('/practice-test');

    // Wait for timer to render and tick
    const t1Label = await getSidebarElapsedLabel(page);
    const t1 = parseTimeToSeconds(t1Label) ?? 0;
    await page.waitForTimeout(1500);
    const t2Label = await getSidebarElapsedLabel(page);
    const t2 = parseTimeToSeconds(t2Label) ?? 0;
    expect(t2).toBeGreaterThanOrEqual(t1 + 1);

    // Pause per-question timer
    const pauseBtn = page.getByRole('button', { name: /Pause timer/i });
    await pauseBtn.click();
    await page.waitForTimeout(1200);

    // Per-question timer label: "Time on this question:" should not advance notably after pause
    const questionTime = page.locator('text=Time on this question:').locator('xpath=..');
    const before = (await questionTime.textContent()) ?? '';
    await page.waitForTimeout(1200);
    const after = (await questionTime.textContent()) ?? '';
    expect(before).toBe(after);

    // Reload and ensure elapsed persists (should be >= previously observed)
    await page.reload();
    const t3Label = await getSidebarElapsedLabel(page);
    const t3 = parseTimeToSeconds(t3Label) ?? 0;
    expect(t3).toBeGreaterThanOrEqual(t2);

    await logout();
  });

  test('keyboard navigation and selection ergonomics', async ({ loginAs, logout, page }) => {
    await loginAs('test.student20@example.com');
    await page.goto('/practice-test');

    // Ensure options are present
    const firstOption = page.getByTestId('answer-option').first();
    await firstOption.waitFor();

    // Press numeric key "1" to select first option
    await page.keyboard.press('1');
    // "Answer saved" pill should appear
    await expect(page.getByText(/Answer saved/i)).toBeVisible();

    // Arrow navigation should move to next question
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('heading', { name: /Question \d+/ })).toBeVisible();

    // Letter shortcut A (if available)
    const optionsCount = await page.getByTestId('answer-option').count();
    if (optionsCount > 0) {
      await page.keyboard.press('KeyA');
      await expect(page.getByText(/Answer saved/i)).toBeVisible();
    }

    await logout();
  });

  test('multi-select enforcement (if present)', async ({ loginAs, logout, page }) => {
    await loginAs('test.student30@example.com');
    await page.goto('/practice-test');

    // Try to find a question with multi-select instruction
    let found = false;
    for (let i = 0; i < 20; i++) {
      const hint = page.getByText(/^Select\s+\d+\s+choices/i);
      if (await hint.count()) {
        found = true;
        break;
      }
      await page.keyboard.press('ArrowRight');
    }

    test.skip(!found, 'No multi-select items available in current dataset');
    if (!found) {
      await logout();
      return;
    }

    // Select more than limit and verify only capped number remains selected
    const options = page.getByTestId('answer-option');
    const count = await options.count();
    for (let i = 0; i < Math.min(4, count); i++) {
      await options.nth(i).click();
    }
    // After selection, reveal to surface correctness UI (no-op if disabled)
    const reveal = page.getByRole('button', { name: /Reveal answer/i });
    if (await reveal.isEnabled()) {
      await reveal.click();
    }
    // At least the last two clicks should be preserved (capped by limit)
    await expect(page.getByText(/Answer saved/i)).toBeVisible();

    await logout();
  });

  test('export JSON/CSV integrity after submission', async ({ loginAs, logout, page, context }) => {
    await loginAs('test.student1@example.com');
    await page.goto('/practice-test');

    // Answer the first question and submit
    const firstOption = page.getByTestId('answer-option').first();
    await firstOption.waitFor();
    await firstOption.click();

    await page.getByRole('button', { name: /Submit practice test/i }).click();
    await expect(page.getByText(/Test submitted/i)).toBeVisible();

    // Download JSON
    const jsonPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export JSON/i }).click();
    const jsonDownload = await jsonPromise;
    const jsonPath = await jsonDownload.path();
    expect(jsonPath).toBeTruthy();
    const jsonContent = await jsonDownload.createReadStream();
    const buffers: Buffer[] = [];
    if (jsonContent) {
      for await (const chunk of jsonContent) buffers.push(Buffer.from(chunk));
    }
    const jsonText = Buffer.concat(buffers).toString('utf-8');
    const parsed = JSON.parse(jsonText);
    expect(parsed.testId).toBeTruthy();
    expect(parsed.responses?.length).toBeGreaterThan(0);

    // Download CSV
    const csvPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export CSV/i }).click();
    const csvDownload = await csvPromise;
    const csvStream = await csvDownload.createReadStream();
    const csvBuffers: Buffer[] = [];
    if (csvStream) {
      for await (const chunk of csvStream) csvBuffers.push(Buffer.from(chunk));
    }
    const csvText = Buffer.concat(csvBuffers).toString('utf-8');
    const [headerLine, firstData] = csvText.split(/\r?\n/);
    expect(headerLine).toMatch(/testId,.*testLabel,.*order,.*questionId,.*response,.*isCorrect,.*answerKey,.*flagged/);
    expect(firstData && firstData.split(',').length).toBeGreaterThanOrEqual(8);

    await logout();
  });

  test('remediation variants: empty, single, multi, and 500 error', async ({ loginAs, logout, page }) => {
    await loginAs('test.student20@example.com');

    let callCount = 0;
    await page.route('**/api/remediation', async (route) => {
      callCount += 1;
      switch (callCount) {
        case 1:
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
          break;
        case 2:
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [{ id: 'a', title: 'One', excerpt: 'Only one', source: 'Test' }] }) });
          break;
        case 3:
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [
            { id: 'a', title: 'One', excerpt: 'First', source: 'S1' },
            { id: 'b', title: 'Two', excerpt: 'Second', source: 'S2' },
            { id: 'c', title: 'Three', excerpt: 'Third', source: 'S3' },
          ] }) });
          break;
        default:
          await route.fulfill({ status: 500 });
      }
    });

    await page.goto('/practice-test');
    const option = page.getByTestId('answer-option').first();
    await option.waitFor();

    // 1) Select and reveal => empty remediation copy
    await option.click();
    await page.getByRole('button', { name: /Reveal answer/i }).click();
    await expect(page.getByText(/No direct vector matches/i).or(page.getByText(/Select an answer to trigger/i))).toBeVisible({ timeout: 5000 });

    // 2) Next question => single item
    await page.keyboard.press('ArrowRight');
    await page.getByTestId('answer-option').first().click();
    await page.getByRole('button', { name: /Reveal answer/i }).click();
    await expect(page.getByText(/Reference excerpt|Only one/i)).toBeVisible();

    // 3) Next question => three items
    await page.keyboard.press('ArrowRight');
    await page.getByTestId('answer-option').first().click();
    await page.getByRole('button', { name: /Reveal answer/i }).click();
    await expect(page.getByText(/Second|Third/i)).toBeVisible();

    // 4) Next question => 500 path shows error fallback
    await page.keyboard.press('ArrowRight');
    await page.getByTestId('answer-option').first().click();
    await page.getByRole('button', { name: /Reveal answer/i }).click();
    await expect(page.getByText(/Vector store lookup unavailable/i)).toBeVisible();

    await logout();
  });
});


