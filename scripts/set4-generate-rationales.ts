/*
  Convenience wrapper to batch-generate Set 4 answer keys, rationales, and book anchors.

  Usage:
    OPENAI_API_KEY=... npx tsx scripts/set4-generate-rationales.ts
*/

import path from 'node:path';

async function main() {
  const input = 'data/staging/otr4/questions.draft.json';
  const outputDir = 'data/staging/otr4/rationales';
  const provider = process.env.OPENAI_API_KEY ? 'openai' : 'stub';
  // Allow overriding order range via env, default to a safe full range for OTR (1-200)
  const orders = process.env.SET4_ORDERS?.trim() || '1-200';

  // Always spawn via tsx to match the CLI contract, passing required --orders
  const { spawn } = await import('node:child_process');
  await new Promise<void>((resolve, reject) => {
    const args = [
      'tsx',
      'scripts/rationale/batch-generate.ts',
      '--input',
      input,
      '--orders',
      orders,
      '--output-dir',
      outputDir,
      '--provider',
      provider,
    ];
    // eslint-disable-next-line no-console
    console.log('Running:', 'npx', args.join(' '));
    const child = spawn('npx', args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`batch-generate exit ${code}`))));
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});


