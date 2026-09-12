import { serveAPI } from '../tests/publication-fixture.ts';
import { buildPublicationAPI } from '../modules/publication-api.ts';
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { specimen } from '../tests/fixtures.ts';
import { enact, serialize } from '../modules/document.ts';
await mkdir('work/fresh-check', { recursive: true });
const source = enact(specimen(), {
  date: '2026-01-01',
  effective: '2026-01-01',
  authority: 'Synthetic authority',
});
await writeFile('work/fresh-check/source.json', serialize(source));
const api = await serveAPI();
Object.assign(api.files, await buildPublicationAPI([source], [], api.baseURL));
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
try {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://127.0.0.1:5173/');
  async function click(text: string) {
    await page.waitForFunction(
      (t) => [...document.querySelectorAll('button')].some((b) => b.textContent?.trim() === t),
      {},
      text,
    );
    await page.evaluate((t) => {
      const b = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === t)!;
      if (b.disabled) throw Error('Disabled button: ' + t);
      b.click();
    }, text);
  }
  async function field(label: string, value: string) {
    await page.evaluate(
      ({ label, value }) => {
        const l = [
          ...(document.querySelector('dialog[open]') ?? document).querySelectorAll('label'),
        ].find((l) => l.querySelector('span')?.textContent === label);
        const el = l?.querySelector('input,textarea,select') as HTMLInputElement;
        if (!el) throw Error('Missing field: ' + label);
        const proto =
          el.tagName === 'TEXTAREA'
            ? HTMLTextAreaElement.prototype
            : el.tagName === 'SELECT'
              ? HTMLSelectElement.prototype
              : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
        el.dispatchEvent(
          new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }),
        );
      },
      { label, value },
    );
  }
  await field('Formal title — English', 'Church Publication Style Guide 2026');
  await field('Formal title — 繁體中文', '2026年教會刊物格式指引');
  await field('Content languages', 'parallel');
  await click('Save settings');
  await click('Add structure…');
  await field('Structural level', 'part');
  await field('Manual number', '1A');
  await click('Add item');
  await field('Heading — English', 'Writing conventions');
  await field('Heading — 繁體中文', '寫作慣例');
  await click('Save provision');
  await click('Add structure…');
  await field('Manual number', '1');
  await click('Add item');
  await field('Heading — English', 'General rules');
  await field('Heading — 繁體中文', '一般規則');
  await click('Save provision');
  await click('Add structure…');
  await field('Structural level', 'subsection');
  await field('Manual number', '1');
  await click('Add item');
  assert.equal(
    await page.evaluate(() =>
      [...document.querySelectorAll('label>span')].some((s) =>
        s.textContent?.includes('Heading —'),
      ),
    ),
    false,
  );
  await click('Add block');
  for (const [label, value] of [
    ['English text', 'Use clear language.'],
    ['繁體中文文本', '使用清晰的語言。'],
  ]) {
    await page.click(`[role="textbox"][aria-label="${label}"]`);
    await page.keyboard.type(value);
  }
  await click('Save provision');
  await click('Move this provision…');
  await click('Cancel');
  await click('Proof');
  await page.waitForSelector('#proof-frame');
  await page.select('select[aria-label="Proof language"]', 'parallel');
  await page.waitForFunction(() =>
    (document.querySelector('#proof-frame') as HTMLIFrameElement)?.srcdoc.includes(
      'class="parallel"',
    ),
  );
  const content = await page.$eval('#proof-frame', (f) => (f as HTMLIFrameElement).srcdoc);
  assert.match(content, /Use clear language/);
  assert.match(content, /使用清晰/); // switch below explicitly for bilingual proof
  await page.screenshot({ path: 'work/fresh-check/editor-proof.png', fullPage: true });
  await click('Create amendment');
  await field('Publication API base URL', api.baseURL);
  await click('Load Guides');
  await page.waitForSelector('select');
  await page.waitForFunction(() =>
    [...document.querySelectorAll('button')].some(
      (b) => b.textContent?.trim() === 'Create amendment draft',
    ),
  );
  await click('Create amendment draft');
  await page.waitForFunction(() => document.body.textContent?.includes('Exact source loaded.'));
  await click('Add action');
  await field('Operation', 'repeal-guide');
  await field('Amending clause number', '2');
  await click('Add checked action');
  await page.waitForFunction(() => document.body.textContent?.includes('Guide repealed'));
  assert.equal(
    await page.evaluate(() => document.querySelectorAll('.generated textarea').length),
    0,
  );
  await page.screenshot({ path: 'work/fresh-check/editor-actions.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    'Browser workflow passed: bilingual draft, correct subsection form, generated whole-guide repeal; no page errors.',
  );
} finally {
  await browser.close();
  await api.close();
}
