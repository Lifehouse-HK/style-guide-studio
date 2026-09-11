import { newGuide, newNode, pair, textBlock } from '../modules/document.ts';
export function specimen() {
  const g = newGuide();
  g.titles = pair('Church Publication Style Guide 2026', '2026年教會刊物格式指引');
  g.mode = 'parallel';
  g.longTitle = pair(
    'A Style Guide to clear church publications.',
    '本格式指引旨在使教會刊物清晰易明。',
  );
  const p = newNode('part', '1');
  p.heading = pair('Preliminary', '導言');
  const s = newNode('section', '1');
  s.heading = pair('Citation', '引稱');
  s.blocks = [{ ...textBlock(), text: pair('This is the Style Guide.', '本指引為格式指引。') }];
  p.children = [s];
  g.nodes = [p];
  return g;
}
