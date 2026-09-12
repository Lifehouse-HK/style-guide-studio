import { definitionRows, definedDocument } from '../modules/definitions.ts';
import { richPlain } from '../modules/rich-text.ts';
import { ParagraphInput, type ParagraphInputHandle } from './paragraph-input.tsx';
import { alignments, paragraphRange, type Alignment } from '../modules/text-formatting.ts';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  allowed,
  entries,
  hasHeading,
  id,
  inSchedule,
  isGroup,
  languages,
  names,
  newNode,
  pair,
  textBlock,
  type Block,
  type DefinitionList,
  type Guide,
  type Kind,
  type Node,
  type Pair,
} from '../modules/document.ts';
import { resolve, type Catalogue } from '../modules/references.ts';
export const Icon = ({ name }: { name: string }) => (
  <i className={'bi bi-' + name} aria-hidden="true" />
);
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function PairFields({
  label,
  value,
  onChange,
  mode = 'parallel',
  multiline = false,
}: {
  label: string;
  value: Pair;
  onChange: (v: Pair) => void;
  mode?: Guide['mode'];
  multiline?: boolean;
}) {
  return (
    <div className={'paired-fields ' + (mode === 'parallel' ? 'two' : '')}>
      {languages({ mode }).map((l) => (
        <Field key={l} label={`${label} — ${l === 'en' ? 'English' : '繁體中文'}`}>
          {multiline ? (
            <textarea
              rows={4}
              value={value[l]}
              onChange={(e) => onChange({ ...value, [l]: e.target.value })}
            />
          ) : (
            <input value={value[l]} onChange={(e) => onChange({ ...value, [l]: e.target.value })} />
          )}
        </Field>
      ))}
    </div>
  );
}
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close dialog">
          <Icon name="x-lg" />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function TableFields({
  value,
  onChange,
}: {
  value: Extract<Block, { type: 'table' }> | { caption: Pair; numbered: boolean; rows: string[][] };
  onChange: (v: any) => void;
}) {
  const [row, setRow] = useState(0);
  const rows = value.rows;
  return (
    <>
      <PairFields
        label="Table caption"
        value={value.caption}
        onChange={(caption) => onChange({ ...value, caption })}
      />
      <label className="check">
        <input
          type="checkbox"
          checked={value.numbered}
          onChange={(e) => onChange({ ...value, numbered: e.target.checked })}
        />
        Automatically number data rows (not referenceable)
      </label>
      <p className="hint">
        This is one shared table. Enter both languages in the cells as needed. The first row
        contains column headings.
      </p>
      <div className="toolbar">
        <button
          type="button"
          onClick={() => {
            onChange({ ...value, rows: [...rows, rows[0].map(() => '')] });
            setRow(rows.length);
          }}
        >
          Add row
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...value, rows: rows.map((r) => [...r, '']) })}
        >
          Add column
        </button>
        <button
          type="button"
          disabled={row === 0}
          onClick={() => {
            onChange({ ...value, rows: rows.filter((_, i) => i !== row) });
            setRow(0);
          }}
        >
          Delete selected row
        </button>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Row</th>
              {rows[0].map((_, c) => (
                <th key={c}>
                  Column {c + 1}{' '}
                  <button
                    type="button"
                    aria-label={`Delete column ${c + 1}`}
                    disabled={rows[0].length === 1}
                    onClick={() =>
                      onChange({ ...value, rows: rows.map((r) => r.filter((_, i) => i !== c)) })
                    }
                  >
                    <Icon name="x" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={row === i ? 'selected-row' : ''}>
                <th>
                  <button type="button" onClick={() => setRow(i)}>
                    {i === 0 ? 'Headings' : i}
                  </button>
                </th>
                {r.map((cell, c) => (
                  <td key={c}>
                    <textarea
                      aria-label={`Row ${i === 0 ? 'headings' : i} column ${c + 1}`}
                      value={cell}
                      rows={2}
                      onFocus={() => setRow(i)}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          rows: rows.map((rr, ri) =>
                            ri === i ? rr.map((cc, ci) => (ci === c ? e.target.value : cc)) : rr,
                          ),
                        })
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function TextField({
  label,
  value,
  onChange,
  guide,
  catalogues,
  lang,
  align,
  html,
  allowAlignment = true,
}: {
  allowAlignment?: boolean;
  html?: boolean;
  label: string;
  value: string;
  onChange: (s: string, align?: Alignment[]) => void;
  guide: Guide;
  catalogues: Catalogue[];
  lang: 'en' | 'zh';
  align: Alignment[];
}) {
  const ref = useRef<ParagraphInputHandle>(null),
    [selection, setSelection] = useState<[number, number]>([0, 0]),
    [picker, setPicker] = useState(false),
    [key, setKey] = useState('');
  function put(text: string) {
    ref.current!.insert(text);
  }
  return (
    <div className="text-field">
      <div className="text-tools">
        <strong>{label}</strong>
        <button
          type="button"
          aria-label="Bold"
          aria-pressed={ref.current?.active('strong') ?? false}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => ref.current!.toggle('strong')}
        >
          <Icon name="type-bold" />
        </button>
        <button
          type="button"
          aria-label="Italic"
          aria-pressed={ref.current?.active('em') ?? false}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => ref.current!.toggle('em')}
        >
          <Icon name="type-italic" />
        </button>
        <button
          type="button"
          aria-label="Underline"
          aria-pressed={ref.current?.active('u') ?? false}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => ref.current!.toggle('u')}
        >
          <Icon name="type-underline" />
        </button>
        {allowAlignment &&
          (['left', 'center', 'right'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-label={`Align ${option}`}
              aria-pressed={(() => {
                const [a, b] = paragraphRange(html ? richPlain(value) : value, ...selection);
                return align.slice(a, b + 1).every((v) => v === option);
              })()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => ref.current!.align(option)}
            >
              <Icon name={`text-${option}`} />
            </button>
          ))}
        {(
          [
            ['Hyphen', '-'],
            ['En dash', '–'],
            ['Em dash', '—'],
          ] as const
        ).map(([name, char]) => (
          <button
            key={name}
            type="button"
            title={name}
            aria-label={`Insert ${name.toLowerCase()}`}
            onClick={() => put(char)}
          >
            {char}
          </button>
        ))}
        <button
          type="button"
          aria-label="Literal text"
          aria-pressed={ref.current?.active('code') ?? false}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => ref.current!.toggle('code')}
        >
          <Icon name="code" />
        </button>
        <button type="button" onClick={() => setPicker(!picker)}>
          <Icon name="link-45deg" /> Reference
        </button>
      </div>
      <small className="hint">
        {allowAlignment
          ? 'Alignment applies to the current or selected paragraphs. Enter starts a paragraph.'
          : 'Enter the meaning, including “means”, “includes” or equivalent wording. Final punctuation is generated.'}
      </small>
      {picker && (
        <div className="reference-picker">
          <select
            aria-label="Reference target"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          >
            <option value="">Choose provision or Schedule</option>
            {entries(guide.nodes).map((e) => (
              <option key={e.node.id} value={'#' + e.node.id}>
                {names[e.node.kind].en} {e.node.label} {e.node.heading?.en}
              </option>
            ))}
            {catalogues
              .flatMap((c) => c.documents)
              .map((d) => (
                <optgroup key={d.id} label={d.titles[lang]}>
                  {d.targets.map((t) => (
                    <option key={t.id} value={d.id + '#' + t.id}>
                      {t.label[lang]}
                    </option>
                  ))}
                </optgroup>
              ))}
          </select>
          <button
            type="button"
            disabled={!key}
            onClick={() => {
              put('[[' + key + ']]');
              setPicker(false);
            }}
          >
            Insert reference
          </button>
        </div>
      )}
      <ParagraphInput
        ref={ref}
        label={label}
        html={html}
        value={value}
        align={align}
        onSelection={setSelection}
        onChange={onChange}
      />
    </div>
  );
}
export function DefinitionFields({
  value,
  onChange,
  guide,
  catalogues,
  siblingMaster = false,
}: {
  siblingMaster?: boolean;
  value: DefinitionList;
  onChange: (value: DefinitionList) => void;
  guide: Guide;
  catalogues: Catalogue[];
}) {
  const [selected, setSelected] = useState('');
  const language = guide.mode === 'zh' ? 'zh' : 'en';
  const rows = definitionRows(value, guide, language);
  const item = value.items.find((i) => i.id === selected);
  const otherMaster = entries(guide.nodes).find(
    (e) =>
      ![...e.ancestors, e.node].some((n) => n.repealed) &&
      e.node.blocks?.some((b) => b.type === 'definitions' && b.master && b.id !== value.id),
  );
  const update = (next: typeof item) =>
    next && onChange({ ...value, items: value.items.map((i) => (i.id === next.id ? next : i)) });
  return (
    <>
      <label className="check">
        <input
          type="checkbox"
          checked={value.master}
          disabled={!value.master && (!!otherMaster || siblingMaster)}
          onChange={(e) => onChange({ ...value, master: e.target.checked })}
        />
        Master definition list
      </label>
      <p className="hint">
        {siblingMaster
          ? 'Another block in this provision is already the master list.'
          : otherMaster
            ? `The master list is already in ${names[otherMaster.node.kind].en} ${otherMaster.node.label}.`
            : 'Only one master list is allowed. It automatically includes all defined document names from References.'}{' '}
        Ordinary lists remain local; their terms do not change generated reference names.
      </p>
      <p className="hint">
        Sorted lexicographically; initial lowercase “the ” is ignored, capitalised “The” is
        retained. An Order by key overrides this rule. Parallel documents align entries using
        English order.
      </p>
      <table className="data-table">
        <thead>
          <tr>
            <th>Term</th>
            <th>Source</th>
            <th>Order by</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.id === selected ? 'selected-row' : ''}>
              <td>{row.term[language] || '(New term)'}</td>
              <td>{row.documentId ? 'References (automatic)' : 'This list'}</td>
              <td>{row.orderBy?.[language] || 'Automatic'}</td>
              <td>
                {row.documentId ? (
                  definedDocument(row, guide, language, catalogues).title
                ) : (
                  <button type="button" onClick={() => setSelected(row.id)}>
                    Edit term
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="toolbar">
        <button
          type="button"
          onClick={() => {
            const next = { id: id(), term: pair(), meaning: pair() };
            onChange({ ...value, items: [...value.items, next] });
            setSelected(next.id);
          }}
        >
          Add term
        </button>
        {item && (
          <button
            type="button"
            onClick={() => {
              onChange({ ...value, items: value.items.filter((i) => i.id !== item.id) });
              setSelected('');
            }}
          >
            Remove term
          </button>
        )}
      </div>
      {item && (
        <>
          <PairFields
            label="Defined term"
            value={item.term}
            mode={guide.mode}
            onChange={(term) => update({ ...item, term })}
          />
          <PairFields
            label="Order by (optional)"
            value={item.orderBy ?? pair()}
            mode={guide.mode}
            onChange={(orderBy) => update({ ...item, orderBy })}
          />
          {languages(guide).map((l) => (
            <TextField
              key={item.id + l}
              label={l === 'en' ? 'English meaning' : '繁體中文釋義'}
              value={item.meaning[l]}
              html
              lang={l}
              align={item.meaning[l].split('\n').map(() => 'left')}
              allowAlignment={false}
              onChange={(meaning) =>
                update({ ...item, meaning: { ...item.meaning, [l]: meaning } })
              }
              guide={guide}
              catalogues={catalogues}
            />
          ))}
        </>
      )}
    </>
  );
}
export function NodeFields({
  value,
  onChange,
  guide,
  catalogues = [],
  lockIdentity = false,
}: {
  value: Node;
  onChange: (n: Node) => void;
  guide: Guide;
  catalogues?: Catalogue[];
  lockIdentity?: boolean;
}) {
  const [active, setActive] = useState(value.blocks?.[0]?.id ?? ''),
    [contentType, setContentType] = useState<Block['type']>('text');
  const b = value.blocks?.find((b) => b.id === active);
  function updateBlock(next: Block) {
    onChange({ ...value, blocks: value.blocks!.map((b) => (b.id === next.id ? next : b)) });
  }
  return (
    <>
      <div className="field-row">
        <Field label="Manual number" hint="Numbering warnings never change or block your draft.">
          <input
            value={value.label}
            disabled={lockIdentity}
            onChange={(e) => onChange({ ...value, label: e.target.value })}
          />
        </Field>
        <div className="type-label">
          {names[value.kind].en} / {names[value.kind].zh}
        </div>
      </div>
      {hasHeading(value.kind) && (
        <PairFields
          label="Heading"
          mode={guide.mode}
          value={value.heading ?? pair()}
          onChange={(heading) => onChange({ ...value, heading })}
        />
      )}{' '}
      {!isGroup(value.kind) && (
        <>
          <h3>Content before child provisions</h3>
          <p className="hint">
            Select a block to edit. Add creates one named block here; Save applies the changes.
          </p>
          <div className="block-list">
            {value.blocks?.map((b, i) => (
              <button
                type="button"
                key={b.id}
                className={b.id === active ? 'active' : ''}
                onClick={() => setActive(b.id)}
              >
                {i + 1}.{' '}
                {b.type === 'definitions'
                  ? b.master
                    ? 'Master definitions'
                    : 'Definitions'
                  : b.type === 'table'
                    ? 'Shared table'
                    : b.type === 'quote'
                      ? 'Quotation'
                      : b.type === 'note'
                        ? 'Note'
                        : 'Text'}
              </button>
            ))}
          </div>
          <div className="toolbar">
            <select
              aria-label="New content type"
              value={contentType}
              onChange={(e) => setContentType(e.target.value as Block['type'])}
            >
              <option value="text">Text</option>
              <option value="quote">Quotation</option>
              <option value="note">Note</option>
              <option value="table">Shared table</option>
              <option value="definitions">Definition list</option>
            </select>
            <button
              type="button"
              onClick={() => {
                const next: Block =
                  contentType === 'definitions'
                    ? { id: id(), type: 'definitions', master: false, items: [] }
                    : contentType === 'table'
                      ? {
                          id: id(),
                          type: 'table',
                          caption: pair(),
                          numbered: false,
                          rows: [
                            ['', ''],
                            ['', ''],
                          ],
                        }
                      : { ...textBlock(), type: contentType };
                onChange({ ...value, blocks: [...(value.blocks ?? []), next] });
                setActive(next.id);
              }}
            >
              <Icon name="plus-lg" /> Add block
            </button>
            {b && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const blocks = value.blocks!.filter((x) => x.id !== b.id);
                    onChange({ ...value, blocks });
                    setActive(blocks[0]?.id ?? '');
                  }}
                >
                  Remove selected block
                </button>
                <button
                  type="button"
                  disabled={value.blocks![0].id === b.id}
                  onClick={() => {
                    const blocks = [...value.blocks!],
                      i = blocks.indexOf(b);
                    [blocks[i - 1], blocks[i]] = [blocks[i], blocks[i - 1]];
                    onChange({ ...value, blocks });
                  }}
                >
                  Move block up
                </button>
              </>
            )}
          </div>
          {b &&
            (b.type === 'definitions' ? (
              <DefinitionFields
                key={b.id}
                value={b}
                siblingMaster={value.blocks?.some(
                  (x) => x.type === 'definitions' && x.master && x.id !== b.id,
                )}
                onChange={updateBlock}
                guide={guide}
                catalogues={catalogues}
              />
            ) : b.type === 'table' ? (
              <TableFields value={b} onChange={updateBlock} />
            ) : (
              <div className={'paired-fields ' + (guide.mode === 'parallel' ? 'two' : '')}>
                {languages(guide).map((l) => (
                  <TextField
                    key={b.id + l}
                    label={l === 'en' ? 'English text' : '繁體中文文本'}
                    value={b.text[l]}
                    html={b.textFormat?.[l] === 'html'}
                    lang={l}
                    align={alignments(b, l)}
                    onChange={(text, align) =>
                      updateBlock({
                        ...b,
                        text: { ...b.text, [l]: text },
                        textFormat: { ...b.textFormat, [l]: 'html' },
                        paragraphAlign: { ...b.paragraphAlign, [l]: align ?? alignments(b, l) },
                      })
                    }
                    guide={guide}
                    catalogues={catalogues}
                  />
                ))}
              </div>
            ))}
          <details>
            <summary>Closing text after child provisions</summary>
            <PairFields
              label="Closing text"
              value={value.closing ?? pair()}
              mode={guide.mode}
              multiline
              onChange={(closing) => onChange({ ...value, closing })}
            />
          </details>
        </>
      )}
    </>
  );
}
