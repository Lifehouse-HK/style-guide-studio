import {
  type DefinitionList,
  type Definition,
  type Guide,
  type Language,
  pair,
} from './document.ts';
import { type Catalogue } from './references.ts';

export type DefinitionRow = Definition & { documentId?: string };
/** Locale-independent lexical order, ignoring only an exact lowercase English article.
 * A supplied key is literal: no article is removed from an override. */
export function definitionKey(term: string, override = ''): string {
  return (override.trim() || term.trim().replace(/^the\s+/, '')).normalize('NFC').toLowerCase();
}
export function definitionRows(
  list: DefinitionList,
  guide: Pick<Guide, 'aliases' | 'aliasDetails'>,
  language: Language,
): DefinitionRow[] {
  const rows: DefinitionRow[] = [...list.items];
  if (list.master)
    for (const [documentId, term] of Object.entries(guide.aliases))
      rows.push({
        id: 'alias:' + documentId,
        term,
        meaning: pair(),
        documentId,
        orderBy: guide.aliasDetails?.[documentId]?.orderBy,
      });
  // IDs break equal-key ties consistently without changing source order or identity.
  return rows.sort((a, b) => {
    const x = definitionKey(a.term[language], a.orderBy?.[language]),
      y = definitionKey(b.term[language], b.orderBy?.[language]);
    return x < y ? -1 : x > y ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
export function definedDocument(
  row: DefinitionRow,
  guide: Pick<Guide, 'aliasDetails'>,
  language: Language,
  catalogues: Catalogue[] = [],
  pdf = false,
) {
  const document = catalogues.flatMap((c) => c.documents).find((d) => d.id === row.documentId);
  return {
    title:
      guide.aliasDetails?.[row.documentId!]?.titles[language] ||
      document?.titles[language] ||
      `[Missing formal title: ${row.documentId}]`,
    href: (pdf ? document?.pdf : document?.html)?.[language],
  };
}
