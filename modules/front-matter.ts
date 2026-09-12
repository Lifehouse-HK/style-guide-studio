import type { Language } from './document.ts';
export const preambleOpening = (language: Language) => (language === 'en' ? 'WHEREAS—' : '鑑於——');
/** Older drafts sometimes include the opening in the stored recital. */
export const recitalText = (text: string, language: Language) =>
  text.replace(
    language === 'en' ? /^\s*whereas\b\s*(?:[—–:-]+\s*)?/i : /^\s*鑑於\s*(?:[—–：:-]+\s*)?/,
    '',
  );

export function preambleText(
  preamble: {
    mode: 'none' | 'paragraph' | 'list';
    paragraph: { en: string; zh: string };
    items: { en: string; zh: string }[];
  },
  language: Language,
) {
  if (preamble.mode === 'none') return '';
  if (preamble.mode === 'paragraph')
    return preambleOpening(language) + ' ' + recitalText(preamble.paragraph[language], language);
  return (
    preambleOpening(language) +
    '\n' +
    preamble.items
      .map((p, i) => `${i + 1}. ${i === 0 ? recitalText(p[language], language) : p[language]}`)
      .join('\n')
  );
}
