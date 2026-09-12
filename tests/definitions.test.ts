import { test } from 'node:test';
import assert from 'node:assert/strict';
import { definitionKey, definitionRows } from '../modules/definitions.ts';
import {
  type DefinitionList,
  pair,
  guideSchema,
  enact,
  issues,
  newNode,
} from '../modules/document.ts';
import { render } from '../modules/render.ts';
import { exportXml, importXml } from '../modules/xml.ts';
import { parseFile } from '../modules/project.ts';
import { publicCatalogue, resolve } from '../modules/references.ts';
import { addAction, newAmendment, proposed } from '../modules/amendments.ts';
import { specimen } from './fixtures.ts';
const list = (master = false): DefinitionList => ({
  id: 'definitions',
  type: 'definitions',
  master,
  items: [
    {
      id: 'zebra',
      term: pair('Zebra', '斑馬'),
      meaning: pair('means <strong>an animal</strong>', '指動物'),
    },
    { id: 'article', term: pair('the Apple', '蘋果'), meaning: pair('means a fruit', '指水果') },
    { id: 'capital', term: pair('The Author', '作者'), meaning: pair('means a writer', '指作者') },
    {
      id: 'override',
      term: pair('Last', '末'),
      meaning: pair('means the last', '指末項'),
      orderBy: pair('Bee', '甲'),
    },
  ],
});
function sample(master = false) {
  const g = specimen();
  g.nodes[0].children[0].blocks!.push(list(master));
  g.aliases.external = pair('the Translation Guide', '翻譯指引');
  g.aliasDetails = {
    external: {
      titles: pair('Church Publication Translation Style Guide 2026', '2026年教會刊物翻譯指引'),
      orderBy: pair('Cat', '乙'),
    },
  };
  return g;
}
test('local and master definitions share deterministic lexical sorting with article and override rules', () => {
  const g = sample();
  assert.deepEqual(
    definitionRows(list(), g, 'en').map((r) => r.id),
    ['article', 'override', 'capital', 'zebra'],
  );
  assert.deepEqual(
    definitionRows(list(true), g, 'en').map((r) => r.id),
    ['article', 'override', 'alias:external', 'capital', 'zebra'],
  );
  assert.equal(definitionKey('the Apple'), 'apple');
  assert.equal(definitionKey('The Apple'), 'the apple');
  assert.equal(definitionKey('Zebra', 'the Bee'), 'the bee');
  assert.deepEqual(
    list().items.map((i) => i.id),
    ['zebra', 'article', 'capital', 'override'],
  );
});
test('only one master is accepted and Checks catches incomplete or duplicate terms', () => {
  const g = sample(true),
    sub = newNode('subsection', '1');
  sub.blocks = [{ ...list(true), id: 'second' }];
  g.nodes[0].children[0].children.push(sub);
  assert.equal(guideSchema.safeParse(g).success, false);
  sub.blocks[0] = { ...list(false), id: 'second', items: [] };
  assert.equal(guideSchema.safeParse(g).success, true);
  assert.ok(issues(g).some((i) => i.code === 'definitions'));
  const original = g.nodes[0].children[0].blocks!.at(-1) as DefinitionList;
  original.items.push({
    id: 'duplicate',
    term: pair('the Translation Guide', '翻譯指引'),
    meaning: pair('means duplicate', '指重複'),
  });
  assert.ok(issues(g).some((i) => i.message.includes('Duplicate en definition')));
  original.items[0].meaning.en = '<script>bad</script>';
  assert.equal(guideSchema.safeParse(g).success, false);
});
test('definition lists round trip through JSON/XML and render sorted indented bilingual entries and automatic full-title references', async () => {
  const g = sample(true),
    external = specimen();
  external.id = 'external';
  const catalogue = publicCatalogue(external, 'https://example.org/', 'revision');
  const workspace = {
    format: 'lifehouse-workspace/2' as const,
    document: g,
    catalogues: [catalogue],
  };
  assert.deepEqual(parseFile(JSON.stringify(workspace)), workspace);
  for (const language of ['en', 'zh'] as const) {
    const xml = await exportXml(workspace, language);
    assert.match(xml, /<blockList><item><p>“<def>/);
    assert.deepEqual(await importXml(xml), workspace);
  }
  for (const layout of ['en', 'zh', 'parallel'] as const) {
    const html = await render(g, { layout, catalogues: [catalogue], pdf: true });
    assert.match(html, /class="definitions"/);
    assert.match(html, /class="definition-entry"/);
    if (layout !== 'zh') {
      assert.match(
        html,
        /means <a href="https:\/\/example.org\/external\/en.pdf">Church Publication Translation Style Guide 2026<\/a>/,
      );
      assert.ok(html.indexOf('“the Apple”') < html.indexOf('“Last”'));
    }
  }
  assert.match(
    resolve('external#' + external.nodes[0].id, g, 'en', [catalogue]).label,
    /of the Translation Guide$/,
  );
  assert.equal(issues(g).filter((i) => i.severity === 'error').length, 0);
});
test('definition lists work under subsections and replay through whole-provision amendments', async () => {
  const g = sample(),
    sub = newNode('subsection', '1');
  sub.blocks = [
    {
      ...list(),
      id: 'local',
      items: [
        {
          id: 'local-term',
          term: pair('Local', '局部'),
          meaning: pair('means this section only', '只指本條'),
        },
      ],
    },
  ];
  g.nodes[0].children[0].children.push(sub);
  const base = enact(g, { date: '2026-01-01', effective: '2026-01-01', authority: 'Test' });
  const replacement = structuredClone(base.nodes[0].children[0]);
  (replacement.blocks!.at(-1) as DefinitionList).items.push({
    id: 'added',
    term: pair('Added', '新增'),
    meaning: pair('means added', '指新增'),
  });
  let a = await newAmendment(base);
  a = await addAction(base, a, {
    type: 'replace-provision',
    target: replacement.id,
    node: replacement,
    clause: '3',
    subclause: '1',
  });
  const revised = (await proposed(base, a)).guide;
  assert.equal((revised.nodes[0].children[0].blocks!.at(-1) as DefinitionList).items.length, 5);
  assert.equal((base.nodes[0].children[0].blocks!.at(-1) as DefinitionList).items.length, 4);
  assert.equal(revised.nodes[0].children[0].children[0].id, sub.id);
  assert.match(await render(revised, { layout: 'en' }), /“Local” means this section only/);
});
