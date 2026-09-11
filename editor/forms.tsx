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
  onAlign,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  guide: Guide;
  catalogues: Catalogue[];
  lang: 'en' | 'zh';
  align: 'left' | 'center' | 'right';
  onAlign: (value: 'left' | 'center' | 'right') => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null),
    [picker, setPicker] = useState(false),
    [key, setKey] = useState('');
  function put(before: string, after = '') {
    const ta = ref.current!;
    const a = ta.selectionStart,
      b = ta.selectionEnd;
    onChange(value.slice(0, a) + before + value.slice(a, b) + after + value.slice(b));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(a + before.length, b + before.length);
    });
  }
  return (
    <div className="text-field">
      <div className="text-tools">
        <strong>{label}</strong>
        <button type="button" aria-label="Bold" onClick={() => put('**', '**')}>
          <Icon name="type-bold" />
        </button>
        <button type="button" aria-label="Italic" onClick={() => put('*', '*')}>
          <Icon name="type-italic" />
        </button>
        <button type="button" aria-label="Underline" onClick={() => put('__', '__')}>
          <Icon name="type-underline" />
        </button>
        {(['left', 'center', 'right'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`Align ${value}`}
            aria-pressed={align === value}
            onClick={() => onAlign(value)}
          >
            <Icon name={`text-${value}`} />
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
        <button type="button" aria-label="Literal text" onClick={() => put('`', '`')}>
          <Icon name="code" />
        </button>
        <button type="button" onClick={() => setPicker(!picker)}>
          <Icon name="link-45deg" /> Reference
        </button>
      </div>
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
      <textarea
        ref={ref}
        style={{ textAlign: align }}
        aria-label={label}
        rows={7}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
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
                {b.type === 'table'
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
            </select>
            <button
              type="button"
              onClick={() => {
                const next: Block =
                  contentType === 'table'
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
            (b.type === 'table' ? (
              <TableFields value={b} onChange={updateBlock} />
            ) : (
              <div className={'paired-fields ' + (guide.mode === 'parallel' ? 'two' : '')}>
                {languages(guide).map((l) => (
                  <TextField
                    key={b.id + l}
                    label={l === 'en' ? 'English text' : '繁體中文文本'}
                    value={b.text[l]}
                    lang={l}
                    align={b.align?.[l] ?? 'left'}
                    onAlign={(align) => updateBlock({ ...b, align: { ...b.align, [l]: align } })}
                    onChange={(text) => updateBlock({ ...b, text: { ...b.text, [l]: text } })}
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
