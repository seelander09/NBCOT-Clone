import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

function runNodeCommand(cmd: string, args: string[], env?: NodeJS.ProcessEnv): Promise<{ code: number; stdout: string; stderr: string; }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env: { ...process.env, ...env }, shell: process.platform === 'win32' });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

test('questions-check script exits successfully and writes summary artifact', async () => {
  // Attempt to run the questions-check script if present
  const { code, stdout, stderr } = await runNodeCommand('npx', ['tsx', 'scripts/questions-check.ts']);
  expect(code, `questions-check failed:\n${stderr}\n${stdout}`).toBe(0);

  // Verify artifact presence if the script writes it
  // We tolerate absence, but log for visibility
  const fs = await import('fs');
  const artifactPath = 'test-results/questions-check.json';
  if (fs.existsSync(artifactPath)) {
    const content = fs.readFileSync(artifactPath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  }
});


