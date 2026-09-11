import { mkdir, writeFile } from 'node:fs/promises';
import { translationGuide } from '../fixtures/examples.ts';
import { revise } from '../packages/engine/src/amendments.ts';
import { preparePublication, renderHTML, type Layout } from '../packages/presentation/src/index.ts';
const p = translationGuide(150);
p.provisions[1].content.en![0].inlines = [
  {
    text:
      'An exact long provision continues across pages without losing words. '.repeat(90) +
      ' EN-END',
  },
];
p.provisions[1].content['zh-Hant']![0].inlines = [
  { text: '本條較長的繁體中文內容須跨頁延續，並與英文條文的起點對齊。'.repeat(70) + ' 中文結束' },
];
const state = await revise(p, [], '2026-09-11'),
  pub = preparePublication(state, [], 'https://example.invalid/');
await mkdir('work/qualification', { recursive: true });
for (const layout of ['en', 'zh-Hant', 'parallel'] as Layout[])
  await writeFile(`work/qualification/${layout}.html`, renderHTML(pub, layout, 'pdf'));
