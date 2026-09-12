import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { specimen } from '../tests/fixtures.ts';
import { newNode, pair } from '../modules/document.ts';
import { publicCatalogue } from '../modules/references.ts';
import { recoveryKey } from '../editor/storage.ts';
import { parseFile } from '../modules/project.ts';
import { exportXml } from '../modules/xml.ts';
const g = specimen(),
  section = g.nodes[0].children[0],
  sub = newNode('subsection', '1');
section.heading = pair('Interpretation', '釋義');
section.blocks![0] = {
  id: 'intro',
  type: 'text',
  text: pair('In this Style Guide—', '在本指引中——'),
};
sub.blocks = [
  {
    id: 'local',
    type: 'definitions',
    master: false,
    items: [
      {
        id: 'local-item',
        term: pair('local', '局部'),
        meaning: pair('means this section only', '只指本條'),
      },
    ],
  },
];
section.children = [sub];
const external = specimen();
external.id = 'translation-guide';
external.titles = pair('Church Publication Translation Style Guide 2026', '2026年教會刊物翻譯指引');
const catalogues = [publicCatalogue(external, 'https://example.org/guides/', 'r1')];
await mkdir('work/definitions', { recursive: true });
await writeFile(
  'work/definitions/start.json',
  JSON.stringify({ format: 'lifehouse-workspace/2', document: g, catalogues }),
);
const browser = await puppeteer.launch();
try {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('dialog', (d) => d.accept());
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:5173/');
  const click = async (t: string) => {
    await page.waitForFunction(
      (t) => [...document.querySelectorAll('button')].some((b) => b.textContent?.trim() === t),
      {},
      t,
    );
    await page.evaluate((t) => {
      const b = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === t)!;
      if (b.disabled) throw Error('Disabled ' + t);
      b.click();
    }, t);
  };
  const field = async (label: string, value: string) => {
    await page.evaluate(
      ({ label, value }) => {
        const l = [...document.querySelectorAll('label')].find(
          (l) => l.querySelector('span')?.textContent === label,
        );
        const el = l?.querySelector('input,select')!;
        const proto =
          el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
        el.dispatchEvent(
          new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }),
        );
      },
      { label, value },
    );
  };
  await click('Open');
  await (await page.$('input[type=file]'))!.uploadFile(
    process.cwd() + '/work/definitions/start.json',
  );
  await page.waitForFunction(() => document.body.textContent?.includes('2026年教會刊物格式指引'));
  await click('References');
  await field('Document', external.id);
  await field('Short name — English', 'the Translation Guide');
  await field('Short name — 繁體中文', '翻譯指引');
  await field('Order by (optional) — English', 'Cat');
  await click('Save defined name');
  await click('Document');
  await page.evaluate(() =>
    [...document.querySelectorAll('.tree button')]
      .find((b) => b.textContent?.includes('Interpretation'))!
      .dispatchEvent(new MouseEvent('click', { bubbles: true })),
  );
  await page.waitForSelector('select[aria-label="New content type"]');
  await page.select('select[aria-label="New content type"]', 'definitions');
  await click('Add block');
  await page.click('label.check input');
  await page.waitForFunction(() => document.body.textContent?.includes('References (automatic)'));
  for (const [term, zh, key] of [
    ['Zebra', '斑馬', ''],
    ['the Apple', '蘋果', ''],
    ['The Author', '作者', ''],
    ['Last', '末', 'Bee'],
  ]) {
    await click('Add term');
    await field('Defined term — English', term);
    await field('Defined term — 繁體中文', zh);
    if (key) await field('Order by (optional) — English', key);
    await page.click('[role=textbox][aria-label="English meaning"]');
    await page.keyboard.type(
      'means an example with enough wording to demonstrate how a long definition wraps consistently within its indented area',
    );
    await page.click('[role=textbox][aria-label="繁體中文釋義"]');
    await page.keyboard.type('指用作展示釋義縮排方式的例子');
  }
  assert.deepEqual(
    await page.$$eval('fieldset .data-table tbody tr', (rs) =>
      rs.map((r) => r.children[0].textContent),
    ),
    ['the Apple', 'Last', 'the Translation Guide', 'The Author', 'Zebra'],
  );
  await click('Save provision');
  await click('2. Master definitions');
  await page.screenshot({ path: 'work/definitions/editor.png', fullPage: true });
  await page.click('.child-section tbody button');
  await page.waitForSelector('label.check input');
  assert.equal(
    await page.$eval('label.check input', (el) => (el as HTMLInputElement).disabled),
    true,
  );
  assert.doesNotMatch(
    await page.$eval('fieldset .data-table', (el) => el.textContent!),
    /Translation Guide/,
  );
  await click('Proof');
  await page.waitForSelector('#proof-frame');
  await page.select('select[aria-label="Proof language"]', 'parallel');
  await page.waitForFunction(
    () =>
      document
        .querySelector<HTMLIFrameElement>('#proof-frame')
        ?.srcdoc.includes('class="definitions"') &&
      document
        .querySelector<HTMLIFrameElement>('#proof-frame')
        ?.srcdoc.includes('class="parallel"'),
  );
  const frame = (await page.$('#proof-frame'))!;
  const content = (await frame.contentFrame())!;
  await content.waitForSelector('.definitions .definition-entry');
  assert.equal(await content.$$eval('.definitions', (els) => els.length), 2);
  assert.equal(await content.$$eval('.definitions .pair', (els) => els.length), 6);
  await page.screenshot({ path: 'work/definitions/proof.png', fullPage: true });
  const saved = await page.evaluate((key) => localStorage.getItem(key)!, recoveryKey);
  const workspace = parseFile(saved);
  await writeFile('work/definitions/project.json', saved);
  for (const l of ['en', 'zh'] as const)
    await writeFile(`work/definitions/${l}.xml`, await exportXml(workspace, l));
  assert.deepEqual(errors, []);
  console.log(
    'Browser definitions: master from References, four sorted terms, override, local subsection, master exclusion, bilingual proof and saved source passed.',
  );
} finally {
  await browser.close();
}
