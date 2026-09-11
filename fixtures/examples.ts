import {
  newProject,
  text,
  type Project,
  type Provision,
  type Block,
} from '../packages/domain/src/index.ts';
export const provision = (id: string, label: string, en: string, zh: string): Provision => ({
  id,
  kind: 'section',
  label,
  heading: {},
  content: {
    en: [{ id: id + '-en', type: 'p', inlines: text(en) }],
    'zh-Hant': [{ id: id + '-zh', type: 'p', inlines: text(zh) }],
  },
  tail: {},
  children: [],
});
export function translationGuide(rows = 4): Project {
  const p = newProject();
  Object.assign(p, {
    id: 'translation-2026',
    revision: 'adopted-1',
    mode: 'bilingual',
    authority: 'both',
    stage: 'adopted',
    titles: {
      en: 'Church Publication Translation Style Guide 2026',
      'zh-Hant': '2026年教會刊物翻譯格式指引',
    },
    adoption: {
      date: '2026-01-01',
      effective: '2026-01-01',
      body: 'Synthetic test authority',
      sourceRevision: 'adopted-1',
    },
  });
  p.opening = {
    longTitle: {
      en: 'A guide to consistent translation in church publications.',
      'zh-Hant': '本指引旨在統一教會刊物的翻譯用語。',
    },
    recitals: {
      en: [
        {
          id: 'recital-en',
          type: 'p',
          inlines: text('Whereas clear communication serves the church:'),
        },
      ],
      'zh-Hant': [{ id: 'recital-zh', type: 'p', inlines: text('鑑於清晰的溝通有助教會服事：') }],
    },
    formula: { en: 'The church adopts this Guide.', 'zh-Hant': '教會現採納本指引。' },
    authentication: {
      en: 'Adopted for synthetic testing only.',
      'zh-Hant': '僅供模擬測試，並非正式教會文件。',
    },
  };
  p.provisions = [
    provision(
      's1',
      '1',
      'This Guide may be cited by its formal title.',
      '本指引可以其正式名稱引稱。',
    ),
    provision(
      's5',
      '5',
      'Use the terms in Schedule 1. Keep punctuation exact: “quoted”, not replaced.',
      '採用附表1的用語。標點符號須準確保留：「引文」。',
    ),
    provision('s5a', '5A', 'A manually inserted provision.', '手動插入的條文。'),
    provision('s6', '6', 'This text follows section 5A.', '本條位於第5A條之後。'),
  ];
  const table: Block = {
    id: 'terminology',
    type: 'table',
    inlines: [],
    numbered: true,
    caption: 'Terminology / 用語',
    rows: [
      [text('English'), text('繁體中文')],
      ...Array.from({ length: rows }, (_, i) => [
        text('Grace ' + (i + 1)),
        text('恩典 ' + (i + 1)),
      ]),
    ],
  };
  p.provisions.push({
    id: 'sch1',
    kind: 'schedule',
    label: '1',
    heading: { en: 'Terminology', 'zh-Hant': '用語' },
    content: {},
    tail: {},
    shared: [table],
    children: [],
  });
  return p;
}
