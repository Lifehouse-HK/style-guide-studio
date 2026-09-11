import type { Language, TextBlock } from './document.ts';
export type Alignment = 'left' | 'center' | 'right';
/** Each explicit newline starts a paragraph; soft wrapping does not. */
export function paragraphRange(text: string, start: number, end = start): [number, number] {
  const index = (offset: number) => text.slice(0, Math.max(0, offset)).split('\n').length - 1;
  return [index(start), index(end > start ? end - 1 : start)];
}
export function alignments(block: TextBlock, language: Language): Alignment[] {
  return block.text[language]
    .split('\n')
    .map((_, i) => block.paragraphAlign?.[language]?.[i] ?? block.align?.[language] ?? 'left');
}
export function alignSelection(
  block: TextBlock,
  language: Language,
  start: number,
  end: number,
  alignment: Alignment,
): TextBlock {
  const values = alignments(block, language),
    [first, last] = paragraphRange(block.text[language], start, end);
  for (let i = first; i <= last; i++) values[i] = alignment;
  return { ...block, paragraphAlign: { ...block.paragraphAlign, [language]: values } };
}
/** Keep following paragraph formatting attached when an edit inserts/removes newlines. */
export function editText(block: TextBlock, language: Language, text: string): TextBlock {
  const old = block.text[language];
  let start = 0,
    suffix = 0;
  while (start < old.length && start < text.length && old[start] === text[start]) start++;
  while (
    suffix < old.length - start &&
    suffix < text.length - start &&
    old[old.length - 1 - suffix] === text[text.length - 1 - suffix]
  )
    suffix++;
  const oldValues = alignments(block, language),
    offset = old.length - text.length;
  let position = 0;
  const values = text.split('\n').map((line) => {
    const origin =
      position <= start ? position : position >= text.length - suffix ? position + offset : start;
    const result = oldValues[paragraphRange(old, origin)[0]] ?? 'left';
    position += line.length + 1;
    return result;
  });
  return {
    ...block,
    text: { ...block.text, [language]: text },
    paragraphAlign: { ...block.paragraphAlign, [language]: values },
  };
}
