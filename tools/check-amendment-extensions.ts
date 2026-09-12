import { launchBrowser } from './browser.ts';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { specimen } from '../tests/fixtures.ts';
import { enact, pair } from '../modules/document.ts';
import { newAmendment } from '../modules/amendments.ts';
import { publicCatalogue } from '../modules/references.ts';
import { recoveryKey } from '../editor/storage.ts';
import { parseFile } from '../modules/project.ts';
import { exportXml } from '../modules/xml.ts';
const g = specimen(),
  n = g.nodes[0].children[0];
n.blocks!.push({
  id: 'master',
  type: 'definitions',
  master: true,
  items: [
    { id: 'original', term: pair('original', '原有'), meaning: pair('means original', '指原有') },
  ],
});
const base = enact(g, { date: '2026-01-01', effective: '2026-01-01', authority: 'Test' }),
  a = await newAmendment(base);
a.titles = pair('Amendment Guide 2027', '2027年修訂指引');
const ext = specimen();
ext.id = 'external';
await mkdir('work/amendment-extensions', { recursive: true });
await writeFile(
  'work/amendment-extensions/start.json',
  JSON.stringify({
    format: 'lifehouse-workspace/2',
    document: a,
    source: base,
    catalogues: [publicCatalogue(ext, 'https://example.org/', 'r')],
  }),
);
const browser = await launchBrowser();
try {
  const page = await browser.newPage(),
    errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('dialog', (d) => d.accept());
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:5173/');
  const click = async (t: string) => {
    await page.waitForFunction(
      (t) =>
        [...document.querySelectorAll('button')].some(
          (b) => b.textContent?.trim() === t && !b.disabled,
        ),
      {},
      t,
    );
    await page.evaluate(
      (t) =>
        [...document.querySelectorAll('button')]
          .find((b) => b.textContent?.trim() === t && !b.disabled)!
          .click(),
      t,
    );
  };
  const field = async (label: string, value: string) => {
    await page.evaluate(
      ({ label, value }) => {
        const el = [...document.querySelectorAll('label')]
          .find((l) => l.querySelector('span')?.textContent === label)
          ?.querySelector('input,select,textarea')!;
        if (!el) throw Error(label);
        const proto =
          el.tagName === 'SELECT'
            ? HTMLSelectElement.prototype
            : el.tagName === 'TEXTAREA'
              ? HTMLTextAreaElement.prototype
              : HTMLInputElement.prototype;
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
    process.cwd() + '/work/amendment-extensions/start.json',
  );
  await click('Add action');
  await field('Operation', 'insert-definition');
  await field('Target provision', n.id);
  await field('Amending clause number', '3');
  await field('Subclause number', '1');
  await field('Definition list', 'master');
  await click('Create definition');
  await field('Defined term — English', 'branch');
  await field('Defined term — 繁體中文', '分支');
  for (const [label, value] of [
    ['English meaning', 'means—'],
    ['繁體中文釋義', '指——'],
  ]) {
    await page.click(`[role=textbox][aria-label="${label}"]`);
    await page.keyboard.type(value);
  }
  await click('Add definition paragraph');
  await field('Manual number', 'a');
  await click('Add block');
  for (const [label, value] of [
    ['English text', 'a nested branch;'],
    ['繁體中文文本', '內層分支；'],
  ]) {
    await page.click(`[role=textbox][aria-label="${label}"]`);
    await page.keyboard.type(value);
  }
  await click('Add checked action');
  await click('Add action');
  await field('Operation', 'insert-defined-name');
  await field('Target provision', n.id);
  await field('Amending clause number', '3');
  await field('Subclause number', '2');
  await field('Definition list', 'master');
  await field('Defined document', 'external');
  await field('Defined short name — English', 'the Other Guide');
  await field('Defined short name — 繁體中文', '其他指引');
  await click('Add checked action');
  await click('Supplemental provisions');
  await field('Manual supplemental number', '4');
  await click('Add supplemental provision');
  await field('Heading — English', 'Transitional arrangements');
  await field('Heading — 繁體中文', '過渡安排');
  await click('Add block');
  for (const [label, value] of [
    ['English text', 'Existing publications may retain their spelling.'],
    ['繁體中文文本', '現有刊物可保留原有拼法。'],
  ]) {
    await page.click(`[role=textbox][aria-label="${label}"]`);
    await page.keyboard.type(value);
  }
  await click('Save supplemental provision');
  await click('Proof');
  await page.waitForSelector('#proof-frame');
  await page.select('[aria-label="Proof language"]', 'parallel');
  await page.waitForFunction(
    () =>
      document
        .querySelector<HTMLIFrameElement>('#proof-frame')
        ?.srcdoc.includes('a nested branch;') &&
      document
        .querySelector<HTMLIFrameElement>('#proof-frame')
        ?.srcdoc.includes('Transitional arrangements'),
  );
  const frame = await (await page.$('#proof-frame'))!.contentFrame();
  await frame!.waitForSelector('.definition-branches');
  await page.screenshot({ path: 'work/amendment-extensions/proof.png', fullPage: true });
  const workspace = parseFile(await page.evaluate((k) => localStorage.getItem(k)!, recoveryKey));
  assert.equal(workspace.document.type, 'amendment');
  if (workspace.document.type !== 'amendment') throw Error();
  assert.equal(workspace.document.actions.length, 2);
  assert.equal(workspace.document.supplemental?.length, 1);
  await writeFile('work/amendment-extensions/project.json', JSON.stringify(workspace));
  for (const l of ['en', 'zh'] as const)
    await writeFile(`work/amendment-extensions/${l}.xml`, await exportXml(workspace, l));
  assert.deepEqual(errors, []);
  console.log(
    'Extended amendment browser: nested definition insertion, automatic name insertion, supplemental section, generated parallel proof and saved XML passed.',
  );
} finally {
  await browser.close();
}
