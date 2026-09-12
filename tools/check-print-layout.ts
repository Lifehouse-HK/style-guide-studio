import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { specimen } from '../tests/fixtures.ts';
import { newNode, pair, textBlock } from '../modules/document.ts';
import { render, type Layout } from '../modules/render.ts';
import { printHtml } from '../editor/print.ts';
import { launchBrowser } from './browser.ts';
const g = specimen();
g.id = 'layout-specimen';
g.titles = pair('Church Publication (English) Style Guide 2026', '2026年教會英文刊物格式指引');
g.preamble = {
  mode: 'paragraph',
  paragraph: pair(
    'Clear and consistent publications assist the work of the Translation Team.',
    '清晰一致的刊物有助翻譯團隊的工作。',
  ),
  items: [],
};
const part = g.nodes[0];
part.children = [];
for (let i = 1; i <= 8; i++) {
  const section = newNode('section', String(i));
  section.id = 'layout-section-' + i;
  section.heading = pair(
    i === 1 ? 'Application and interpretation' : 'Preparation of publications',
    i === 1 ? '適用範圍及釋義' : '刊物的編製',
  );
  for (let j = 1; j <= 3; j++) {
    const sub = newNode('subsection', String(j));
    sub.id = `layout-sub-${i}-${j}`;
    sub.blocks = [
      {
        ...textBlock(),
        text: pair(
          'A writer must prepare the publication in accordance with this Style Guide. The reviewer must check the wording and references before the publication is released to readers.',
          '作者須按照本格式指引編製刊物。審閱者須在刊物向讀者發布前核對字句及引稱，確保文字清晰、準確，而且各項用語前後一致。',
        ),
      },
    ];
    if (j === 1) {
      for (const label of ['a', 'b']) {
        const p = newNode('paragraph', label);
        p.id = `layout-para-${i}-${label}`;
        p.blocks = [
          {
            ...textBlock(),
            text: pair(
              'use the terminology specified in the Schedule and preserve the meaning of the source text, including any qualifications or exceptions;',
              '使用附表訂明的用語，並保留原文的意思，包括任何限制或例外情況；',
            ),
          },
        ];
        sub.children.push(p);
      }
      sub.closing = pair('and record the outcome of that review.', '並記錄審閱的結果。');
    }
    section.children.push(sub);
  }
  if (i === 1)
    section.children[2].blocks!.push({
      id: 'layout-definitions',
      type: 'definitions',
      master: false,
      items: [
        {
          id: 'publication',
          term: pair('publication', '刊物'),
          meaning: pair(
            'means a document intended for circulation by the church, whether distributed electronically or in printed form',
            '指教會擬以電子方式或印刷形式傳閱的文件',
          ),
        },
      ],
    });
  part.children.push(section);
}
const schedule = newNode('schedule', '1A');
schedule.id = 'layout-schedule';
schedule.heading = pair('Terminology', '用語');
schedule.blocks = [
  {
    id: 'layout-table',
    type: 'table',
    caption: pair('Approved terms', '認可用語'),
    numbered: true,
    rows: [
      ['English', '繁體中文'],
      ...Array.from({ length: 70 }, (_, i) => ['Term ' + (i + 1), '詞彙' + (i + 1)]),
    ],
  },
];
g.nodes.push(schedule);
const workspace = { format: 'lifehouse-workspace/2' as const, document: g, catalogues: [] };
const logo =
  'data:image/png;base64,' +
  (await readFile('assets/branding/lifehouse-hong-kong-stacked.png')).toString('base64');
await mkdir('work/print-layout', { recursive: true });
const browser = await launchBrowser();
try {
  for (const layout of ['en', 'zh', 'parallel'] as Layout[]) {
    const html = await render(g, { layout, logo, pdf: true });
    // The editor's Print action and the standalone renderer use the identical expression.
    assert.equal(await printHtml(workspace, layout, logo), html);
    await writeFile(`work/print-layout/${layout}.html`, html);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => i.decode()));
    });
    await page.emulateMediaType('print');
    assert.equal(await page.$eval('.contents', (el) => getComputedStyle(el).display), 'none');
    const geometry = await page.evaluate(() => {
      return [
        ...document.querySelectorAll(
          '#layout-sub-1-1 > .pair > div > p.numbered-line, #layout-sub-1-1 > p.numbered-line',
        ),
      ].map((p) => ({
        body: { x: p.getBoundingClientRect().x },
        label: { x: p.querySelector('.number')!.getBoundingClientRect().x },
        font: getComputedStyle(p).fontSize,
        leading: getComputedStyle(p).lineHeight,
      }));
    });
    for (const p of geometry) {
      assert.ok(Math.abs(p.body.x - p.label.x - 48) < 0.1);
      assert.equal(p.font, '14.6667px');
    }
    if (layout === 'parallel') assert.equal(geometry.length, 2);
    await writeFile(`work/print-layout/${layout}-geometry.json`, JSON.stringify(geometry, null, 2));
    await page.pdf({
      path: `work/print-layout/${layout}.pdf`,
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
      outline: true,
      displayHeaderFooter: false,
    });
    await page.close();
  }
  console.log(
    'UK print profile: browser/renderer equality, print-only navigation, hanging numbers and aligned language columns passed.',
  );
} finally {
  await browser.close();
}
