import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { specimen } from '../tests/fixtures.ts';
import { newNode, pair } from '../modules/document.ts';
const g = specimen();
const sub = newNode('subsection', '1');
sub.blocks = [
  {
    id: 'child-text',
    type: 'text',
    text: pair('Preview of subordinate provision', '附屬條文預覽'),
  },
];
g.nodes[0].children[0].children = [sub];
g.nodes[0].children[0].heading = pair();
await mkdir('work/feedback', { recursive: true });
await writeFile('work/feedback/source.json', JSON.stringify(g));
const browser = await puppeteer.launch();
try {
  const page = await browser.newPage();
  page.on('dialog', async (d) => {
    console.log('Dialog', d.type());
    await d.accept();
  });
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://127.0.0.1:5173/');
  const click = async (text: string) => {
    await page.evaluate((t) => {
      const b = [...document.querySelectorAll('button')].find(
        (b) =>
          b.textContent?.trim() === t ||
          (t === 'Checks' && b.textContent?.trim().startsWith('Checks')),
      );
      if (!b) throw Error('Missing ' + t);
      b.click();
    }, text);
  };
  await click('Open');
  await (await page.$('input[type=file]'))!.uploadFile(
    process.cwd() + '/work/feedback/source.json',
  );
  await page.waitForFunction(() => document.body.textContent?.includes('2026年教會刊物格式指引'));
  await click('Checks');
  const location = await page.$eval('.data-table tbody button', (b) => b.textContent);
  assert.match(location!, /Part 1 \/ Section 1/);
  await page.click('.data-table tbody button');
  await page.waitForFunction(() =>
    document.body.textContent?.includes('Preview of subordinate provision'),
  );
  assert.equal(await page.$eval('.breadcrumb', (b) => b.querySelectorAll('button').length), 3);
  await page.click('.child-section tbody button');
  await page.waitForSelector('button[aria-label="Underline"]');
  await page.click('button[aria-label="Align center"]');
  await page.click('button[aria-label="Insert em dash"]');
  await click('Save provision');
  await page.click('.breadcrumb button:nth-of-type(1)');
  await click('Proof');
  assert.ok(await page.$('[aria-label="Proof language"]'));
  await page.select('[aria-label="Proof language"]', 'parallel');
  await page.waitForFunction(() =>
    (document.querySelector('#proof-frame') as HTMLIFrameElement).srcdoc.includes(
      'class="parallel"',
    ),
  );
  await page.waitForFunction(() =>
    (
      document.querySelector('#proof-frame') as HTMLIFrameElement
    ).contentDocument?.body.classList.contains('parallel'),
  );
  for (const height of [800, 650]) {
    await page.setViewport({ width: 1280, height });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight),
      true,
    );
    await page.evaluate(() => window.scrollTo(0, 300));
    assert.equal(await page.evaluate(() => window.scrollY), 0);
  }
  await page.screenshot({ path: 'work/feedback/proof.png' });
  // A fresh monolingual document has no language switch.
  const fresh = await (await browser.createBrowserContext()).newPage();
  await fresh.goto('http://127.0.0.1:5173/');
  await fresh.evaluate(() =>
    [...document.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Proof')!
      .click(),
  );
  assert.equal(await fresh.$('[aria-label="Proof language"]'), null);
  console.log(
    'Feedback browser checks passed: fixed shell, preview snippets, breadcrumbs, checks navigation, formatting controls, bilingual parallel/monolingual proof.',
  );
} finally {
  await browser.close();
}
