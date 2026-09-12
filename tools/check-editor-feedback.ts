import { recoveryKey } from '../editor/storage.ts';
import { launchBrowser } from './browser.ts';
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
    text: pair(
      'Preview of subordinate provision\nSecond paragraph\nThird paragraph',
      '附屬條文預覽',
    ),
  },
];
g.nodes[0].children[0].children = [sub];
g.nodes[0].children[0].heading = pair();
await mkdir('work/feedback', { recursive: true });
await writeFile('work/feedback/source.json', JSON.stringify(g));
const browser = await launchBrowser();
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
    document.body.textContent?.includes(
      'Preview of subordinate provision\nSecond paragraph\nThird paragraph',
    ),
  );
  assert.equal(await page.$eval('.breadcrumb', (b) => b.querySelectorAll('button').length), 3);
  await page.click('.child-section tbody button');
  await page.waitForSelector('button[aria-label="Underline"]');
  const field = '[role="textbox"][aria-label="English text"]';
  await page.$eval(field, (el) => {
    const node = el.children[1].firstChild!;
    (el as HTMLElement).focus();
    const range = document.createRange();
    range.setStart(node, 2);
    range.setEnd(node, 5);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.click('button[aria-label="Align center"]');
  await page.waitForFunction(
    () =>
      (
        document.querySelector('[role="textbox"][aria-label="English text"]')!
          .children[1] as HTMLElement
      ).style.textAlign === 'center',
  );
  assert.deepEqual(
    await page.$$eval(field + ' p', (ps) => ps.map((p) => getComputedStyle(p).textAlign)),
    ['left', 'center', 'left'],
  );
  // Real editing stays in the aligned paragraph, including splitting and undo.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  assert.equal(await page.$$eval(field + ' p', (ps) => ps.length), 4);
  await page.keyboard.down(process.platform === 'darwin' ? 'Meta' : 'Control');
  await page.keyboard.press('z');
  await page.keyboard.up(process.platform === 'darwin' ? 'Meta' : 'Control');
  await page.waitForFunction(
    () =>
      document.querySelector('[role="textbox"][aria-label="English text"]')!.children.length === 3,
  );
  assert.deepEqual(
    await page.$$eval(field + ' p', (ps) => ps.map((p) => getComputedStyle(p).textAlign)),
    ['left', 'center', 'left'],
  );
  // Pasting consumes plain text even when HTML is on the clipboard.
  await page.$eval(field, (el) => {
    const data = new DataTransfer();
    data.setData('text/plain', '<b>literal</b>');
    data.setData('text/html', '<b>literal</b>');
    el.dispatchEvent(
      new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }),
    );
  });
  assert.equal(await page.$eval(field, (el) => el.querySelector('b')), null);
  assert.match(await page.$eval(field, (el) => el.textContent!), /<b>literal<\/b>/);
  await page.keyboard.down(process.platform === 'darwin' ? 'Meta' : 'Control');
  await page.keyboard.press('z');
  await page.keyboard.up(process.platform === 'darwin' ? 'Meta' : 'Control');
  await page.waitForFunction(() =>
    document
      .querySelector('[role="textbox"][aria-label="English text"]')!
      .textContent!.includes('Second paragraph'),
  );
  await page.$eval(field, (el) => {
    const node = el.children[1].firstChild!;
    (el as HTMLElement).focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.click('button[aria-label="Bold"]');
  await page.waitForSelector(field + ' strong');
  assert.equal(await page.$eval(field + ' strong', (el) => el.textContent), 'Second paragraph');
  assert.ok(
    Number(await page.$eval(field + ' strong', (el) => getComputedStyle(el).fontWeight)) >= 600,
  );
  await page.click('button[aria-label="Italic"]');
  assert.ok(await page.$(field + ' strong em, ' + field + ' em strong'));
  await page.$eval(field, (el) => {
    (el as HTMLElement).focus();
    const range = document.createRange();
    range.selectNodeContents(el.children[2]);
    range.collapse(false);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.keyboard.type(' *literal* < & &lt;');
  assert.match(await page.$eval(field, (el) => el.textContent!), /\*literal\* < & &lt;/);
  assert.equal(await page.$eval(field + ' p:last-child', (el) => el.querySelector('em')), null);
  await page.screenshot({ path: 'work/feedback/aligned-input.png' });
  // Exercise Chromium's composition path, then navigate out using the keyboard.
  // This verifies editor event handling, not a particular operating-system IME.
  const chinese = '[role="textbox"][aria-label="繁體中文文本"]';
  const chineseBox = await page.$(chinese);
  if (!chineseBox) throw Error('Missing labelled Chinese text editor');
  await chineseBox.focus();
  await page.keyboard.press('End');
  const cdp = await page.createCDPSession();
  await cdp.send('Input.imeSetComposition', {
    text: '神的話語',
    selectionStart: 4,
    selectionEnd: 4,
  });
  await cdp.send('Input.insertText', { text: '神的話語' });
  await page.keyboard.press('Tab');
  assert.match(await page.$eval(chinese, (el) => el.textContent!), /神的話語/);
  assert.equal(await page.$eval(chinese, (el) => el.contains(document.activeElement)), false);
  await cdp.detach();
  await click('Save provision');
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), recoveryKey);
  const savedBlock = saved.document.nodes[0].children[0].children[0].blocks[0];
  assert.equal(savedBlock.textFormat.en, 'html');
  assert.match(savedBlock.text.en, /<strong><em>Second paragraph<\/em><\/strong>/);
  assert.match(savedBlock.text.en, /\*literal\* &lt; &amp; &amp;lt;/);
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
  const paragraphs = await page.$eval('#proof-frame', (el) =>
    [...(el as HTMLIFrameElement).contentDocument!.querySelectorAll('p')]
      .filter((p) => p.textContent?.includes('paragraph') || p.textContent?.includes('Preview'))
      .map((p) => ({ text: p.textContent, align: p.style.textAlign })),
  );
  assert.equal(paragraphs.find((p) => p.text?.includes('Preview'))?.align, 'left');
  assert.equal(paragraphs.find((p) => p.text?.includes('Second'))?.align, 'center');
  assert.equal(paragraphs.find((p) => p.text?.includes('Third'))?.align, 'left');
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
