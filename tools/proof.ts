import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { publish } from './publish.ts';
const config = resolve(process.env.CONFIGURATION ?? '');
const rel = relative(process.cwd(), config);
if (!rel || rel.startsWith('..') || rel.startsWith('/'))
  throw new Error('Select a tracked configuration within the checkout.');
execFileSync('git', ['ls-files', '--error-unmatch', '--', rel], { stdio: 'pipe' });
const original = JSON.parse(await readFile(config, 'utf8'));
// Preserve relative source resolution without modifying the tracked configuration.
const temp = resolve(dirname(config), '.proof-build-' + randomUUID() + '.json');
await writeFile(temp, JSON.stringify({ ...original, mode: 'proof', approvals: [] }));
try {
  await publish(temp, resolve('work/proof-output'));
} finally {
  await unlink(temp);
}
await mkdir('work/proof-output', { recursive: true });
await writeFile(
  'work/proof-output/submission.json',
  JSON.stringify({
    source: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    configuration: rel,
    kind: 'proof',
    effective: false,
  }),
);
