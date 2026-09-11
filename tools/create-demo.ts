import { mkdir, writeFile } from 'node:fs/promises';
import { translationGuide } from '../fixtures/examples.ts';
import { canonical, digest } from '../packages/domain/src/index.ts';
await mkdir('work/demo', { recursive: true });
const p = translationGuide(12);
await writeFile('work/demo/translation.sg.json', canonical(p));
await writeFile(
  'work/demo/build.json',
  canonical({
    format: 'sg-build/1',
    baseUrl: 'https://example.invalid/',
    asOf: '2026-09-11',
    mode: 'certified',
    files: ['translation.sg.json'],
    approvals: [
      {
        publisher: p.publisher,
        id: p.id,
        revision: p.revision,
        digest: await digest(canonical(p)),
      },
    ],
  }),
);
