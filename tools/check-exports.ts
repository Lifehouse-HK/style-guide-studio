import { mkdir, writeFile } from 'node:fs/promises';
import { specimen } from '../tests/fixtures.ts';
import { newNode, pair, enact, serialize } from '../modules/document.ts';
import { exportXml } from '../modules/xml.ts';
import { newAmendment, addAction } from '../modules/amendments.ts';
await mkdir('work/fresh-check', { recursive: true });
const g = specimen(),
  sch = newNode('schedule', '1');
sch.heading = pair('Terminology', '用語');
sch.blocks = [
  {
    id: 'terms',
    type: 'table',
    caption: pair('Terms', '用語'),
    numbered: true,
    rows: [
      ['English', '繁體中文'],
      ['Dream Team', '夢幻團隊'],
      ...Array.from({ length: 65 }, (_, i) => ['Example ' + (i + 1), '例子' + (i + 1)]),
    ],
  },
];
g.nodes.push(sch);
const source = enact(g, {
  date: '2026-01-01',
  effective: '2026-01-01',
  authority: 'Synthetic test authority',
});
await writeFile('work/fresh-check/source.json', serialize(source));
await writeFile(
  'work/fresh-check/guide.xml',
  await exportXml({ format: 'lifehouse-workspace/2', document: source, catalogues: [] }, 'zh'),
);
let a = await newAmendment(source);
a.titles = pair(
  'Church Publication (Amendment) Style Guide 2027',
  '2027年教會刊物（修訂）格式指引',
);
const n = newNode('section', '1A');
n.heading = pair('Additional rule', '新增規則');
n.blocks = [
  { id: 'new-text', type: 'text', text: pair('Use consistent language.', '使用一致的語言。') },
];
a = await addAction(source, a, {
  type: 'insert-provision',
  target: source.nodes[0].children[0].id,
  position: 'after',
  node: n,
  clause: '3',
  subclause: '1',
});
await writeFile(
  'work/fresh-check/amendment.xml',
  await exportXml({ format: 'lifehouse-workspace/2', document: a, source, catalogues: [] }, 'en'),
);
console.log('Fresh source and amendment XML specimens generated.');
