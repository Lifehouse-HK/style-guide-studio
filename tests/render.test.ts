import { test } from 'node:test';
import assert from 'node:assert/strict';
import { specimen } from './fixtures.ts';
import { newNode, pair } from '../modules/document.ts';
import { render, inline } from '../modules/render.ts';
import { publicCatalogue, resolve } from '../modules/references.ts';
test('subsections have inline labels rather than HTML headings and shared tables appear once per output', async () => {
  const g = specimen();
  const sub = newNode('subsection', '1');
  sub.blocks = [{ id: 'text1', type: 'text', text: pair('<script>bad</script>', '字句') }];
  g.nodes[0].children[0].children = [sub];
  const sch = newNode('schedule', '1');
  sch.heading = pair('Terms', '用語');
  sch.blocks = [
    {
      id: 'table1',
      type: 'table',
      caption: pair('Terms', '用語'),
      numbered: true,
      rows: [
        ['English', '繁體中文'],
        ['Dream Team', '夢幻團隊'],
      ],
    },
  ];
  g.nodes.push(sch);
  const html = await render(g, { layout: 'parallel' });
  assert.equal((html.match(/<table>/g) ?? []).length, 1);
  assert.match(html, /@page\{size:A4 landscape;/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<h[1-6]>\(1\)/);
  assert.match(html, /<span class="number">\(1\)<\/span>/);
});
test('external references select HTML/PDF and use the document-scoped alias consistently', () => {
  const g = specimen(),
    external = specimen();
  external.id = 'external-guide';
  const c = publicCatalogue(external, 'https://example.org/guides/', 'r1');
  g.aliases[external.id] = pair('2026 Guide', '2026年指引');
  const key = external.id + '#' + external.nodes[0].id;
  assert.match(resolve(key, g, 'en', [c], true).href, /en.pdf#/);
  assert.match(resolve(key, g, 'en', [c]).label, /2026 Guide/);
  assert.doesNotMatch(inline('**<b>**', g, 'en'), /<b>/);
});

test('underlining and per-language alignment render on unheaded first blocks', async () => {
  const g = specimen();
  const sub = newNode('subsection', '1');
  sub.blocks = [
    {
      id: 'aligned',
      type: 'text',
      text: pair('__English__ — words', '__中文__'),
      align: { en: 'center', zh: 'right' },
    },
  ];
  g.nodes[0].children[0].children = [sub];
  const html = await render(g, { layout: 'parallel' });
  assert.match(html, /text-align:center[^>]*><span class="number">\(1\)<\/span><u>English<\/u>/);
  assert.match(html, /text-align:right[^>]*><span class="number">\(1\)<\/span><u>中文<\/u>/);
  assert.match(html, />Section 1 /);
});

test('preamble openings are automatic in both formats and ceremonial English uses small caps', async () => {
  const g = specimen();
  const originalFormula = structuredClone(g.formula);
  for (const mode of ['paragraph', 'list'] as const) {
    g.preamble.mode = mode;
    g.preamble.paragraph = pair('Readers need clarity.', '讀者需要清晰的文字。');
    g.preamble.items = [
      pair('Readers need clarity.', '讀者需要清晰的文字。'),
      pair('Second recital.', '第二項。'),
    ];
    for (const layout of ['en', 'zh', 'parallel'] as const) {
      const html = await render(g, { layout, pdf: true });
      assert.equal(
        (html.match(/<span class="small-caps">Whereas<\/span>—/g) ?? []).length,
        layout === 'zh' ? 0 : 1,
      );
      assert.equal((html.match(/鑑於——/g) ?? []).length, layout === 'en' ? 0 : 1);
      assert.equal(
        (html.match(/<span class="small-caps">Be it enacted<\/span>/g) ?? []).length,
        layout === 'zh' ? 0 : 1,
      );
      assert.match(html, /font-variant-caps:small-caps/);
      if (mode === 'list') assert.match(html, /class="number">2\.<\/span>/);
    }
  }
  g.preamble.mode = 'paragraph';
  g.preamble.paragraph = pair('WHEREAS— Readers need clarity.', '鑑於——讀者需要清晰的文字。');
  const html = await render(g, { layout: 'parallel' });
  assert.equal((html.match(/Whereas|WHEREAS/g) ?? []).length, 1);
  assert.equal((html.match(/鑑於/g) ?? []).length, 1);
  assert.deepEqual(g.formula, originalFormula);
  g.preamble.mode = 'none';
  assert.doesNotMatch(await render(g, { layout: 'parallel' }), /Whereas|鑑於/);
  g.formula.en = 'A custom formula without the usual phrase <remains literal>.';
  assert.match(await render(g, { layout: 'en' }), /&lt;remains literal&gt;/);
});
