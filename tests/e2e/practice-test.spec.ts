import { test, expect } from '@playwright/test';

test.describe('Practice test reveal flow', () => {
  test('keeps rationale hidden until the student opts to reveal it', async ({ page }) => {
    await page.goto('/practice-test');

    await expect(
      page.getByRole('heading', { level: 1, name: /practice test experience/i }),
    ).toBeVisible();

    const revealButton = page.getByRole('button', { name: /Reveal answer & rationale/i });
    await expect(revealButton).toBeDisabled();

    const answerOptions = page.getByTestId('answer-option');
    await expect(answerOptions.first()).toBeVisible();
    await answerOptions.first().click();

    await expect(revealButton).toBeEnabled();
    await expect(
      page.getByText('Answer saved. Click Reveal answer & rationale when you want to check your work.'),
    ).toBeVisible();
    await expect(
      page.getByText('Reveal the answer to view the detailed rationale.'),
    ).toBeVisible();

    await revealButton.click();

    await expect(page.getByRole('button', { name: /Hide answer & rationale/i })).toBeVisible();
    await expect(page.getByText('Reveal the answer to view the detailed rationale.')).toHaveCount(0);
    await expect(
      page.getByText('Review the detailed rationale and supporting citations', { exact: false }),
    ).toBeVisible();
    await expect(
      page.locator('article').filter({ hasText: 'AI deep dive & rationale' }).getByText('Why this is right', { exact: false }),
    ).toBeVisible();
    const bookAnchorArticle = page.locator('article').filter({ hasText: 'Book anchor (vector store)' });
    await expect(bookAnchorArticle).toContainText(/MiniLM Reference|Case-Smith/i);
  });
});
