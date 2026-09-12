import { test } from 'node:test';
import assert from 'node:assert/strict';
import { specimen } from './fixtures.ts';
import {
  enact,
  pair,
  newNode,
  textBlock,
  issues,
  definitionAnchor,
  type DefinitionList,
} from '../modules/document.ts';
import {
  addAction,
  newAmendment,
  proposed,
  generate,
  enactAmendment,
  revise,
} from '../modules/amendments.ts';
import { render } from '../modules/render.ts';
import { exportXml, importXml } from '../modules/xml.ts';
import { publicCatalogue, resolve } from '../modules/references.ts';
const record = { date: '2026-01-01', effective: '2026-01-01', authority: 'Test' };
function source() {
  const g = specimen(),
    n = g.nodes[0].children[0],
    p = newNode('paragraph', 'a');
  p.blocks = [{ ...textBlock(), text: pair('a member;', '成員；') }];
  n.blocks!.push({
    id: 'master',
    type: 'definitions',
    master: true,
    items: [
      { id: 'team', term: pair('Team', '團隊'), meaning: pair('means—', '指——'), children: [p] },
    ],
  });
  return enact(g, record);
}
test('definitions with numbered branches validate, render and survive XML round trips', async () => {
  const g = source();
  assert.equal(issues(g).filter((i) => i.severity === 'error').length, 0);
  const html = await render(g, { layout: 'parallel' });
  assert.match(html, /definition-branches/);
  assert.match(html, /class="number">\(a\)/);
  const workspace = { format: 'lifehouse-workspace/2' as const, document: g, catalogues: [] };
  const xml = await exportXml(workspace, 'en');
  assert.match(xml, /<blockList><item eId="[^"]+"><num>\(a\)<\/num>/);
  assert.deepEqual(await importXml(xml), workspace);
});
test('individual definitions and document names insert, substitute and repeal with replayable effects', async () => {
  const base = source(),
    n = base.nodes[0].children[0];
  const snapshot = JSON.stringify(base);
  let a = await newAmendment(base);
  a.titles = pair('Amendment', '修訂');
  a = await addAction(base, a, {
    type: 'insert-definition',
    target: n.id,
    block: 'master',
    definition: { id: 'word', term: pair('word', '詞'), meaning: pair('means text', '指文字') },
    clause: '3',
    subclause: '1',
  });
  a = await addAction(base, a, {
    type: 'replace-definition',
    target: n.id,
    block: 'master',
    definitionId: 'word',
    definition: {
      id: 'word',
      term: pair('word', '詞'),
      meaning: pair('means revised text', '指修訂文字'),
    },
    clause: '3',
    subclause: '2',
  });
  a = await addAction(base, a, {
    type: 'insert-defined-name',
    target: n.id,
    block: 'master',
    documentId: 'external',
    alias: {
      term: pair('the Translation Guide', '翻譯指引'),
      titles: pair('Translation Style Guide 2026', '2026年翻譯指引'),
    },
    clause: '3',
    subclause: '3',
  });
  const catGuide = specimen();
  catGuide.id = 'external';
  const catalogue = publicCatalogue(catGuide, 'https://example.org/', 'r');
  const now = (await proposed(base, a)).guide;
  assert.equal(now.aliases.external.en, 'the Translation Guide');
  assert.match(await render(a, { layout: 'en' }, base), /Translation Style Guide 2026/);
  const enacted = await enactAmendment(
    base,
    a,
    { ...record, date: '2027-01-01', effective: '2027-01-01' },
    [catalogue],
  );
  assert.equal(
    (await revise(base, [enacted], '2027-01-01')).guide.aliases.external.en,
    'the Translation Guide',
  );
  a = await addAction(base, a, {
    type: 'omit-defined-name',
    target: n.id,
    block: 'master',
    documentId: 'external',
    clause: '3',
    subclause: '4',
  });
  a = await addAction(base, a, {
    type: 'omit-definition',
    target: n.id,
    block: 'master',
    definitionId: 'word',
    clause: '3',
    subclause: '5',
  });
  const result = (await proposed(base, a)).guide;
  assert.equal(result.aliases.external, undefined);
  assert.equal(
    resolve('#' + definitionAnchor('master', 'word'), result, 'en', []).warning,
    'Repealed target',
  );
  assert.equal(
    resolve('#' + definitionAnchor('master', 'alias-external'), result, 'en', []).warning,
    'Repealed target',
  );
  assert.match((await generate(base, a))[0].items[4].text.en, /definition of “word”/);
  assert.equal(JSON.stringify(base), snapshot);
});
test('definition replacement rejects renumbering and preserves omitted child identities', async () => {
  const base = source(),
    n = base.nodes[0].children[0],
    d = (n.blocks!.at(-1) as DefinitionList).items[0];
  let a = await newAmendment(base);
  const bad = structuredClone(d);
  bad.children![0].label = 'b';
  await assert.rejects(
    addAction(base, a, {
      type: 'replace-definition',
      target: n.id,
      block: 'master',
      definitionId: d.id,
      definition: bad,
      clause: '3',
      subclause: '1',
    }),
    /renumber/,
  );
  const replacement = { ...d, children: [] };
  a = await addAction(base, a, {
    type: 'replace-definition',
    target: n.id,
    block: 'master',
    definitionId: d.id,
    definition: replacement,
    clause: '3',
    subclause: '1',
  });
  assert.equal(replacement.children.length, 0);
  assert.equal(
    ((await proposed(base, a)).guide.nodes[0].children[0].blocks!.at(-1) as DefinitionList).items[0]
      .children![0].repealed,
    true,
  );
});
test('word insertion and omission generate matching instructions; front matter changes protect formula', async () => {
  const base = source(),
    n = base.nodes[0].children[0],
    b = n.blocks![0];
  if (b.type !== 'text') throw Error();
  let a = await newAmendment(base);
  a = await addAction(base, a, {
    type: 'insert-text',
    target: n.id,
    block: b.id,
    language: 'en',
    find: 'Style Guide',
    replacement: 'English ',
    position: 'before',
    clause: '3',
    subclause: '1',
  });
  a = await addAction(base, a, {
    type: 'omit-text',
    target: n.id,
    block: b.id,
    language: 'en',
    find: 'English ',
    clause: '3',
    subclause: '2',
  });
  a = await addAction(base, a, {
    type: 'replace-front-matter',
    target: base.id,
    frontField: 'longTitle',
    frontPair: pair('A Style Guide to revised standards.', '本指引旨在訂立修訂標準。'),
    clause: '4',
    subclause: '1',
  });
  const result = (await proposed(base, a)).guide;
  const changed = result.nodes[0].children[0].blocks![0];
  if (changed.type !== 'text') throw Error();
  assert.deepEqual(changed.text, b.text);
  assert.match(result.longTitle.en, /revised/);
  assert.deepEqual(result.formula, base.formula);
  const cs = await generate(base, a);
  assert.match(cs[0].items[0].text.en, /Before/);
  assert.match(cs[0].items[1].text.en, /Omit/);
});

test('supplemental provisions remain in the amendment and cannot duplicate operative clause numbers', async () => {
  const base = source();
  let a = await newAmendment(base);
  a.titles = pair('Amendment', '修訂');
  a = await addAction(base, a, {
    type: 'repeal-guide',
    target: base.id,
    clause: '3',
    subclause: '1',
  });
  const s = newNode('section', '4');
  s.heading = pair('Savings', '保留條文');
  s.blocks = [
    { ...textBlock(), text: pair('Earlier publications remain valid.', '較早刊物仍然有效。') },
  ];
  a.supplemental = [s];
  assert.match(await render(a, { layout: 'en' }, base), /Earlier publications remain valid/);
  assert.equal(
    (await enactAmendment(base, a, { ...record, date: '2027-01-01', effective: '2027-01-01' }))
      .supplemental?.length,
    1,
  );
  assert.equal(
    (await proposed(base, a)).guide.nodes.some((n) => n.id === s.id),
    false,
  );
  s.label = '3';
  await assert.rejects(
    enactAmendment(base, a, { ...record, date: '2027-01-01', effective: '2027-01-01' }),
    /Duplicate/,
  );
});
