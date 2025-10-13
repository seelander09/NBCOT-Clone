import { test, expect } from '@playwright/test';

test.describe('Practice test experience', () => {
  test('supports enhanced reveal flow, keyboard navigation, and post-submit summary', async ({ page }) => {
    await page.goto('/practice-test');

    await expect(
      page.getByRole('heading', { level: 1, name: /practice test experience/i }),
    ).toBeVisible();

    await expect(page.getByText(/Domain \d -/i).first()).toBeVisible();

    const pauseTimerButton = page.getByRole('button', { name: /Pause timer/i });
    await expect(pauseTimerButton).toBeVisible();
    await pauseTimerButton.click();
    const resumeTimerButton = page.getByRole('button', { name: /Resume timer/i });
    await expect(resumeTimerButton).toBeVisible();
    await resumeTimerButton.click();
    await expect(page.getByRole('button', { name: /Pause timer/i })).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('heading', { level: 1, name: /Question 2/i })).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('heading', { level: 1, name: /Question 1/i })).toBeVisible();

    const revealButton = page.getByRole('button', { name: /Reveal answer & rationale/i });
    await expect(revealButton).toBeDisabled();

    const answerOptions = page.getByTestId('answer-option');
    await expect(answerOptions.first()).toBeVisible();
    await answerOptions.first().click();

    await expect(revealButton).toBeEnabled();
    await expect(
      page.getByText(/Answer saved\./i),
    ).toBeVisible();
    await expect(
      page.getByText('Reveal the answer to view the detailed rationale.'),
    ).toBeVisible();

    await revealButton.click();

    await expect(page.getByRole('button', { name: /Hide answer & rationale/i })).toBeVisible();
    await expect(page.getByText('Reveal the answer to view the detailed rationale.')).toHaveCount(0);
    await expect(answerOptions.first().getByText('Correct')).toBeVisible();
    const bookAnchorArticle = page.locator('article').filter({ hasText: 'Book anchor (vector store)' });
    await expect(bookAnchorArticle).toContainText(/MiniLM Reference|Case-Smith/i);

    await page.getByRole('button', { name: /Submit practice test/i }).click();

    const resultsSection = page.locator('section').filter({ hasText: 'Results summary' });
    await expect(resultsSection).toBeVisible();
    await expect(resultsSection.getByText(/1 \/ 1 correct/i)).toBeVisible();
    await expect(resultsSection.getByText(/Accuracy: 100%/i)).toBeVisible();
    await expect(resultsSection.getByRole('button', { name: /Print summary/i })).toBeVisible();

    await expect(resultsSection.getByText(/Question review/i)).toBeVisible();
    const questionRow = resultsSection.locator('table tbody tr').first();
    await expect(questionRow.locator('td').first()).toHaveText(/1/);
    await expect(questionRow.locator('td').nth(1)).toContainText(/Domain/i);
    await expect(questionRow.locator('td').nth(2)).toContainText(/Correct/i);
  });
});
