import type { Language } from './document.ts';
export const preambleOpening = (language: Language) => (language === 'en' ? 'WHEREAS—' : '鑑於——');
/** Older drafts sometimes include the opening in the stored recital. */
export const recitalText = (text: string, language: Language) =>
  text.replace(
    language === 'en' ? /^\s*whereas\b\s*(?:[—–:-]+\s*)?/i : /^\s*鑑於\s*(?:[—–：:-]+\s*)?/,
    '',
  );
