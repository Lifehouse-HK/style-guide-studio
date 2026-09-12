import { launchBrowser } from './browser.ts';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { serveFixture } from '../tests/publication-fixture.ts';
import { recoveryKey } from '../editor/storage.ts';
import { parseFile } from '../modules/project.ts';
import { proposed } from '../modules/amendments.ts';
import type { Publication } from '../modules/publication-api.ts';
const api = await serveFixture(),
  browser = await launchBrowser();
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://127.0.0.1:5173/');
  const click = async (label: string) => {
    await page.waitForFunction(
      (t) =>
        [...document.querySelectorAll('button')].some(
          (b) => b.textContent?.trim() === t && !b.disabled,
        ),
      {},
      label,
    );
    await page.evaluate(
      (t) =>
        [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === t)!.click(),
      label,
    );
  };
  const connect = async () => {
    await click('Create amendment');
    await page.waitForSelector('dialog input[type=url]');
    assert.equal(await page.$('dialog input[type=file]'), null);
    await page.$eval(
      'dialog input[type=url]',
      (el, value) => {
        const input = el as HTMLInputElement;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
          input,
          value,
        );
        input.dispatchEvent(new Event('input', { bubbles: true }));
      },
      api.baseURL,
    );
    await click('Load Guides');
    await click('Create amendment draft');
  };
  await connect();
  await page.waitForFunction(() =>
    document.body.textContent?.includes('Current revised source resolved from the API'),
  );
  const text = await page.evaluate((k) => localStorage.getItem(k)!, recoveryKey),
    saved = parseFile(text);
  assert.equal(saved.document.type, 'amendment');
  assert.equal(saved.source!.nodes[0].children[0].heading!.en, 'Current amended heading');
  assert.equal(saved.source!.revision!.instruments.length, 2);
  assert.equal(saved.instruments!.length, 3);
  assert.equal(saved.publication!.baseURL, api.baseURL);
  assert.ok(api.requests.filter((r) => r.startsWith('/sources/')).length >= 4);
  await click('Proof');
  await page.select('[aria-label="Proof document"]', 'proposed');
  await page.waitForFunction(
    () =>
      (document.querySelector('#proof-frame') as HTMLIFrameElement)?.srcdoc.includes(
        'Current amended heading',
      ),
    { polling: 100 },
  );
  const proofFrame = await (await page.$('#proof-frame'))!.contentFrame();
  await proofFrame!.waitForFunction(
    () => document.body.textContent?.includes('Current amended heading'),
    { polling: 100 },
  );
  await mkdir('work/api-check', { recursive: true });
  await page.screenshot({ path: 'work/api-check/current-proof.png' });
  // A failed reconnect must not replace the saved workspace with original/unverified text.
  const manifest = api.files['publication.json'] as Publication;
  api.files[manifest.guides[0].original.path] = { corrupt: true };
  await connect();
  await page.waitForFunction(() =>
    document.querySelector('dialog [role=alert]')?.textContent?.includes('fingerprint mismatch'),
  );
  assert.equal(await page.evaluate((k) => localStorage.getItem(k), recoveryKey), text);
  await click('Cancel');
  assert.deepEqual(errors, []);
  await api.close();
  if (saved.document.type !== 'amendment') throw Error();
  assert.equal(
    (await proposed(saved.source!, saved.document)).guide.nodes[0].children[0].heading!.en,
    'Current amended heading',
  );
  console.log(
    'API browser flow passed: no file upload, two current amendments resolved, future effect excluded, exact source retained offline, failed fetch preserves workspace.',
  );
} finally {
  await browser.close();
  await api.close().catch(() => {});
}
