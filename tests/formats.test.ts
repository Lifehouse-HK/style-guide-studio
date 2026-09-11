import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { translationGuide } from '../fixtures/examples.ts';
import { exportAKN, importAKN, saveProject } from '../packages/formats/src/index.ts';
import { parseProject } from '../packages/domain/src/index.ts';
test('portable bilingual project and shared table survive save and both AKN expressions', async () => {
  const p = translationGuide();
  assert.deepEqual(parseProject(saveProject(p)), p);
  for (const l of ['en', 'zh-Hant'] as const) {
    const xml = await exportAKN(p, l, '2026-09-11');
    assert.deepEqual(await importAKN(xml), p);
    const result = spawnSync('.venv/bin/python', ['tools/validate_xml.py'], {
      input: xml,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal((xml.match(/<table /g) ?? []).length, 1);
    await assert.rejects(importAKN(xml.replace('<num>5A</num>', '<num>7</num>')), /differs/);
  }
});
test('foreign XML, entities and malformed imports cannot silently discard data', async () => {
  for (const xml of [
    '<!DOCTYPE a [<!ENTITY x SYSTEM "file:///etc/passwd">]><a>&x;</a>',
    '<a>',
    '<akomaNtoso xmlns="http://docs.oasis-open.org/legaldocml/ns/akn/3.0"/>',
  ])
    await assert.rejects(importAKN(xml));
});
test('AKN amendment expressions include operative instructions and replacement payloads', async () => {
  const p = translationGuide();
  p.role = 'amendment';
  p.amendment = {
    targetDocument: 'principal',
    targetPublisher: p.publisher,
    expectedRevision: 'original',
    after: [],
    events: [],
    operations: [
      {
        id: 'replace',
        author: 's1',
        target: 'old-provision',
        type: 'substitute',
        scope: 'structure',
        expected: 'digest',
        instructions: { en: 'Substitute the following section.', 'zh-Hant': '以以下條文代替。' },
        node: structuredClone(p.provisions[1]),
      },
    ],
  };
  for (const l of ['en', 'zh-Hant'] as const) {
    const xml = await exportAKN(p, l, '2026-09-11');
    assert.ok(xml.includes(l === 'en' ? 'Substitute the following section.' : '以以下條文代替。'));
    const result = spawnSync('.venv/bin/python', ['tools/validate_xml.py'], {
      input: xml,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
  }
});
