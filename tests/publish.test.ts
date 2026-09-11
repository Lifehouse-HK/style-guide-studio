import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { translationGuide } from '../fixtures/examples.ts';
import { canonical, digest } from '../packages/domain/src/index.ts';
import { publish } from '../tools/publish.ts';
import { CatalogueClient } from '../packages/engine/src/references.ts';
test('headless build emits three bilingual PDFs and a usable locked catalogue; failed approval preserves current', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sg-build-')),
    p = translationGuide(3),
    out = join(dir, 'output'),
    config = {
      format: 'sg-build/1',
      mode: 'certified',
      baseUrl: 'https://fixture.example/',
      asOf: '2026-09-11',
      files: ['source.sg.json'],
      approvals: [
        {
          publisher: p.publisher,
          id: p.id,
          revision: p.revision,
          digest: await digest(canonical(p)),
        },
      ],
    };
  p.provisions[0].content.en![0].inlines.push({
    text: '',
    ref: { publisher: p.publisher, document: p.id, target: 's5a', selector: 'original' },
  });
  config.approvals[0].digest = await digest(canonical(p));
  try {
    await writeFile(join(dir, 'source.sg.json'), canonical(p));
    await writeFile(join(dir, 'build.json'), canonical(config));
    const result = await publish(join(dir, 'build.json'), out);
    const folder = join(out, 'releases', result.release, p.id, p.revision),
      files = await readdir(folder);
    assert.deepEqual(files.filter((f) => f.endsWith('.pdf')).sort(), [
      'en.pdf',
      'parallel.pdf',
      'zh-Hant.pdf',
    ]);
    assert.match(
      await readFile(join(folder, 'en.xml'), 'utf8'),
      /section 5A of Church Publication Translation Style Guide 2026/,
    );
    const map = JSON.parse(await readFile(join(folder, 'parallel.destinations.json'), 'utf8'));
    assert.ok(map.destinations.n_s5 >= 1);
    const client = new CatalogueClient((url) => readFile(join(out, new URL(url).pathname), 'utf8'));
    const index = await client.document(config.baseUrl, p.id);
    assert.equal(index.revisions[0].targets.length, 5);
    assert.equal(
      index.revisions[0].targets.some((t) => t.id === 'terminology'),
      false,
    );
    const target = index.revisions[0].targets.find((t) => t.id === 'sch1')!;
    const content = (await client.targetContent(config.baseUrl, target)) as { shared: unknown[] };
    assert.equal(content.shared.length, 1);
    const previous = await readFile(join(out, 'catalogue.json'), 'utf8');
    config.approvals[0].digest = 'wrong';
    await writeFile(join(dir, 'build.json'), canonical(config));
    await assert.rejects(publish(join(dir, 'build.json'), out), /approval/);
    assert.equal(await readFile(join(out, 'catalogue.json'), 'utf8'), previous);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
