import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { specimen } from '../tests/fixtures.ts';
import { pair, newNode, textBlock, referenceTargets } from '../modules/document.ts';
import { publicCatalogue } from '../modules/references.ts';
import { render, type Layout } from '../modules/render.ts';
import { launchBrowser } from './browser.ts';
const g = specimen(),
  external = specimen();
external.id = 'external-pdf';
const sub = newNode('subsection', '1');
sub.blocks = [
  {
    ...textBlock(),
    text: pair(
      'An unheaded provision that can be reached from another PDF.',
      '可從其他PDF跳至本無標題條文。',
    ),
  },
];
g.nodes[0].children[0].children = [sub];
g.nodes[0].children[0].blocks!.push({
  id: 'definition-list',
  type: 'definitions',
  master: false,
  items: [
    {
      id: 'definition-term',
      term: pair('example', '例子'),
      meaning: pair('means an example', '指例子'),
    },
  ],
});
const block = g.nodes[0].children[0].blocks![0];
if (block.type !== 'text') throw Error();
block.text = pair(
  `See [[external-pdf#${external.nodes[0].id}]].`,
  `見[[external-pdf#${external.nodes[0].id}]]。`,
);
const schedule = newNode('schedule', '1');
schedule.blocks = [
  {
    id: 'shared',
    type: 'table',
    caption: pair('Terminology', '詞彙'),
    numbered: true,
    rows: [
      ['English', '繁體中文'],
      ...Array.from({ length: 70 }, (_, i) => ['Term ' + (i + 1), '詞彙' + (i + 1)]),
    ],
  },
];
g.nodes.push(schedule);
await mkdir('work/pdf-check', { recursive: true });
const logo =
  'data:image/png;base64,' +
  (await readFile('assets/branding/lifehouse-hong-kong-stacked.png')).toString('base64');
const browser = await launchBrowser();
try {
  for (const layout of ['en', 'zh', 'parallel'] as Layout[]) {
    const html = await render(g, {
      layout,
      pdf: true,
      logo,
      catalogues: [publicCatalogue(external, 'https://example.org/', 'r')],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => i.decode()));
    });
    await page.pdf({
      path: `work/pdf-check/${layout}.pdf`,
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
      outline: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  'work/pdf-check/expected.json',
  JSON.stringify({
    targets: ['document-title', ...referenceTargets(g).map((t) => t.id)],
    uri: `https://example.org/external-pdf/en.pdf#nameddest=${external.nodes[0].id}`,
  }),
);
console.log(
  'PDF specimens generated: EN/ZH portrait, aligned landscape, 70-row table and unheaded/definition destinations.',
);
