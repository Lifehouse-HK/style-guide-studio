import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignSelection, alignments, editText } from '../modules/text-formatting.ts';
import { pair, type TextBlock } from '../modules/document.ts';
import { specimen } from './fixtures.ts';
import { render } from '../modules/render.ts';
const block = (): TextBlock => ({
  id: 'paragraphs',
  type: 'text',
  text: pair('First\nSecond\nThird', '甲\n乙\n丙'),
});
test('cursor and selections align only touched paragraphs, preserving the other language', async () => {
  let b = alignSelection(block(), 'en', 7, 7, 'center');
  assert.deepEqual(alignments(b, 'en'), ['left', 'center', 'left']);
  b = alignSelection(b, 'en', 1, 6, 'right'); // ends at the start of paragraph 2
  assert.deepEqual(alignments(b, 'en'), ['right', 'center', 'left']);
  b = alignSelection(b, 'en', 7, 16, 'center');
  assert.deepEqual(alignments(b, 'en'), ['right', 'center', 'center']);
  assert.deepEqual(alignments(b, 'zh'), ['left', 'left', 'left']);
  const g = specimen();
  g.nodes[0].children[0].blocks = [b];
  const html = await render(g, { layout: 'en' });
  assert.match(
    html,
    /text-align:right">First<\/p><p[^>]*style="text-align:center">Second<\/p><p[^>]*style="text-align:center">Third/,
  );
});
test('new paragraphs inherit alignment and following paragraphs keep their own alignment', () => {
  let b = alignSelection(block(), 'en', 6, 6, 'center');
  b = alignSelection(b, 'en', 13, 13, 'right');
  const split = editText(b, 'en', 'First\nSec\nond\nThird');
  assert.deepEqual(alignments(split, 'en'), ['left', 'center', 'center', 'right']);
  const joined = editText(split, 'en', 'First\nSecond\nThird');
  assert.deepEqual(alignments(joined, 'en'), ['left', 'center', 'right']);
  assert.deepEqual(alignments(editText(b, 'en', 'First\nNew\nSecond\nThird'), 'en'), [
    'left',
    'center',
    'center',
    'right',
  ]);
});
