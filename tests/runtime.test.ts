import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { saveDraft } from '../packages/runtime/src/files.ts';
import { translationGuide } from '../fixtures/examples.ts';
import { canonical } from '../packages/domain/src/index.ts';
test('saving drafts refuses to overwrite certified or corrupted originals', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sg-save-')),
    path = join(dir, 'guide.sg.json'),
    p = translationGuide();
  try {
    await writeFile(path, canonical(p));
    const draft = structuredClone(p);
    draft.stage = 'draft';
    await assert.rejects(saveDraft(path, draft), /cannot be overwritten/);
    assert.equal(await readFile(path, 'utf8'), canonical(p));
    await writeFile(path, 'corrupt');
    await assert.rejects(saveDraft(path, draft));
    assert.equal(await readFile(path, 'utf8'), 'corrupt');
    const fresh = join(dir, 'draft.sg.json');
    await saveDraft(fresh, draft);
    assert.equal(JSON.parse(await readFile(fresh, 'utf8')).stage, 'draft');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
