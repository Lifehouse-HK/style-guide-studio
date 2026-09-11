import { Icon } from './Icon.tsx';
import { useEffect, useState } from 'react';
import {
  activeLanguages,
  blocks,
  kinds,
  walk,
  type Block,
  type Project,
  type Provision,
  type Operation,
  type Language,
} from '../../../packages/domain/src/index.ts';
import { type Revision } from '../../../packages/engine/src/amendments.ts';
import { amendmentDraft, appendOperation, proposedState } from './amendment-model.ts';
import { uid } from './model.ts';
import { RichText } from './RichText.tsx';
export function AmendmentPanel({
  project,
  base,
  onLoad,
  onCreate,
  onCommit,
  onNotice,
  onPreview,
}: {
  project: Project;
  base: Project | null;
  onLoad: () => void;
  onCreate: (p: Project) => void;
  onCommit: (p: Project) => void;
  onNotice: (s: string) => void;
  onPreview: (state: Revision) => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [state, setState] = useState<Revision | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState('');
  const [kind, setKind] = useState<Operation['type']>('insert');
  const [scope, setScope] = useState<Operation['scope']>('structure');
  const [position, setPosition] = useState<NonNullable<Operation['position']>>('after');
  const [clause, setClause] = useState('');
  const [instructions, setInstructions] = useState<Partial<Record<Language, string>>>({});
  const [node, setNode] = useState<Provision | null>(null);
  const [block, setBlock] = useState<Block | null>(null);
  const [titles, setTitles] = useState({ en: '', 'zh-Hant': '' });
  useEffect(() => {
    let active = true;
    setState(null);
    if (base && project.amendment) {
      void proposedState(base, project, date)
        .then((s) => {
          if (active) {
            setState(s);
            setError('');
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }
    return () => {
      active = false;
    };
  }, [base, project, date]);
  const langs = activeLanguages(project);
  const nodes = state ? walk(state.project.provisions).filter((n) => !n.repealed) : [];
  const options =
    scope === 'structure'
      ? nodes
      : nodes.flatMap((n) =>
          (scope === 'shared' ? (n.shared ?? []) : (n.content[scope] ?? [])).map((b) => ({
            ...b,
            heading: n.heading,
            label: n.label,
          })),
        );
  function choose(id: string, nextKind = kind, nextScope = scope) {
    setTarget(id);
    const n = nodes.find((n) => n.id === id);
    if (nextScope === 'structure' && n) {
      setBlock(null);
      setNode(
        nextKind === 'insert'
          ? {
              id: uid(),
              kind: n.kind,
              label: '',
              heading: {},
              content: Object.fromEntries(
                langs.map((l) => [l, [{ id: uid(), type: 'p', inlines: [] }]]),
              ),
              tail: {},
              children: [],
            }
          : structuredClone(n),
      );
    } else {
      const b = nodes.flatMap(blocks).find((b) => b.id === id);
      setNode(null);
      setBlock(b ? structuredClone(b) : null);
    }
  }
  const updateNode = (fn: (n: Provision) => void) =>
    setNode((n) => {
      if (!n) return n;
      const next = structuredClone(n);
      fn(next);
      return next;
    });
  const updateBlock = (fn: (b: Block) => void) =>
    setBlock((b) => {
      if (!b) return b;
      const next = structuredClone(b);
      fn(next);
      return next;
    });
  function payload(b: Block, change: (fn: (b: Block) => void) => void, l: Language) {
    return b.type === 'table' ? (
      <div>
        <p className="hint">The entire table will be replaced, including its header.</p>
        <table className="payload-table">
          <tbody>
            {b.rows?.map((row, r) => (
              <tr key={r}>
                {row.map((xs, c) => (
                  <td key={c}>
                    <RichText
                      label={`Replacement table ${r + 1}, ${c + 1}`}
                      value={xs}
                      editable
                      onFocus={() => {}}
                      onNotice={onNotice}
                      onChange={(v) =>
                        change((b) => {
                          b.rows![r][c] = v;
                        })
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={() =>
            change((b) => {
              b.rows!.push(b.rows![0].map(() => []));
            })
          }
        >
          <Icon name="plus-lg" /> Row
        </button>
        <button
          onClick={() =>
            change((b) => {
              b.rows!.forEach((row) => row.push([]));
            })
          }
        >
          <Icon name="plus-lg" /> Column
        </button>
      </div>
    ) : b.type === 'figure' ? (
      <p className="hint">
        Figure payload is retained unchanged. Use the source asset workflow for a replacement
        figure.
      </p>
    ) : (
      <RichText
        label={`${l} replacement text`}
        value={b.inlines}
        editable
        onFocus={() => {}}
        onNotice={onNotice}
        onChange={(v) =>
          change((b) => {
            b.inlines = v;
          })
        }
      />
    );
  }
  async function add() {
    if (!base || !state) return;
    setBusy(true);
    setError('');
    try {
      const input: Omit<Operation, 'id' | 'author' | 'expected'> = {
        type: kind,
        scope,
        target,
        instructions,
        ...(kind === 'insert' ? { position } : {}),
        ...(kind !== 'omit' ? (scope === 'structure' ? { node: node! } : { block: block! }) : {}),
      };
      const next = await appendOperation(base, project, date, clause, input);
      onCommit(next);
      setTarget('');
      setNode(null);
      setBlock(null);
      setClause('');
      setInstructions({});
      onNotice('Amendment operation added and checked against the proposed text.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!project.amendment)
    return (
      <>
        <p className="hint">
          Create a separate amendment instrument from an adopted principal source. The original
          remains unchanged.
        </p>
        {project.stage === 'adopted' && project.role === 'principal' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                onCreate(amendmentDraft(project, titles));
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <label>
              Amendment’s English formal title
              <input
                required
                value={titles.en}
                onChange={(e) => setTitles({ ...titles, en: e.target.value })}
              />
            </label>
            <label>
              修訂指引的中文正式名稱
              <input
                required
                value={titles['zh-Hant']}
                onChange={(e) => setTitles({ ...titles, 'zh-Hant': e.target.value })}
              />
            </label>
            <button className="primary">Create amendment draft</button>
          </form>
        ) : (
          <p>Open an adopted principal project from File to begin.</p>
        )}
        {error && <p className="error">{error}</p>}
      </>
    );
  return (
    <>
      <p className="hint">
        Target: {project.amendment.targetDocument}. Proposed changes never take effect.
      </p>
      <button onClick={onLoad}>
        {base ? 'Replace principal source…' : 'Load principal source…'}
      </button>
      <label>
        Review as of
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {project.amendment.operations.map((op) => (
        <details key={op.id}>
          <summary>
            {op.type} · {op.instructions.en || op.instructions['zh-Hant']}
          </summary>
          {Object.entries(op.instructions).map(([l, s]) => (
            <p key={l} lang={l}>
              {s}
            </p>
          ))}
          <p className="hint">
            Exact target precondition recorded. Use Undo to remove a newly added operation.
          </p>
        </details>
      ))}
      {state && (
        <button className="primary" onClick={() => onPreview(state)}>
          Preview proposed guide
        </button>
      )}
      {project.stage === 'draft' && state && (
        <>
          <hr />
          <h3>Add an amendment operation</h3>
          <label>
            Operation
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as typeof kind);
                setTarget('');
                setNode(null);
                setBlock(null);
                setScope('structure');
              }}
            >
              <option value="insert">Insert provision</option>
              <option value="substitute">Substitute</option>
              <option value="omit">Omit / repeal</option>
            </select>
          </label>
          {kind !== 'insert' && (
            <label>
              Target type
              <select
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value as typeof scope);
                  setTarget('');
                  setNode(null);
                  setBlock(null);
                }}
              >
                <option value="structure">Whole provision</option>
                {langs.map((l) => (
                  <option key={l} value={l}>
                    {l === 'en' ? 'English' : 'Chinese'} content block
                  </option>
                ))}
                <option value="shared">Shared table or block</option>
              </select>
            </label>
          )}
          <label>
            Target
            <select value={target} onChange={(e) => choose(e.target.value)}>
              <option value="">Select target</option>
              {options.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label} {n.heading.en ?? n.heading['zh-Hant']}{' '}
                  {'type' in n ? '· ' + n.type : ''}
                </option>
              ))}
            </select>
          </label>
          {kind === 'insert' && (
            <label>
              Position
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as typeof position)}
              >
                <option value="before">Before target</option>
                <option value="after">After target</option>
                <option value="first">First child of target</option>
                <option value="last">Last child of target</option>
              </select>
            </label>
          )}
          {node && kind !== 'omit' && (
            <div className="replacement">
              <h3>{kind === 'insert' ? 'Inserted provision' : 'Replacement provision'}</h3>
              {kind === 'insert' && (
                <>
                  <label>
                    Level
                    <select
                      value={node.kind}
                      onChange={(e) =>
                        updateNode((n) => {
                          n.kind = e.target.value as Provision['kind'];
                        })
                      }
                    >
                      {kinds.map((k) => (
                        <option key={k}>{k}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Manual number
                    <input
                      required
                      value={node.label ?? ''}
                      onChange={(e) =>
                        updateNode((n) => {
                          n.label = e.target.value;
                        })
                      }
                    />
                  </label>
                </>
              )}
              {langs.map((l) => (
                <div key={l}>
                  <label>
                    {l === 'en' ? 'English heading' : '中文標題'}
                    <input
                      value={node.heading[l] ?? ''}
                      onChange={(e) =>
                        updateNode((n) => {
                          n.heading[l] = e.target.value;
                        })
                      }
                    />
                  </label>
                  {(node.content[l] ?? []).map((b, i) => (
                    <div className="payload-block" key={b.id}>
                      {payload(b, (fn) => updateNode((n) => fn(n.content[l]![i])), l)}
                    </div>
                  ))}
                  {!node.content[l]?.length && (
                    <button
                      onClick={() =>
                        updateNode((n) => {
                          (n.content[l] ??= []).push({ id: uid(), type: 'p', inlines: [] });
                        })
                      }
                    >
                      <Icon name="plus-lg" /> {l} text
                    </button>
                  )}
                </div>
              ))}
              {!!node.children.length && (
                <p className="hint">
                  {node.children.length} child provisions retained unchanged. Target a child
                  separately to amend it.
                </p>
              )}
              {!!node.shared?.length && (
                <p className="hint">
                  Shared content retained. Choose “Shared table or block” to replace it.
                </p>
              )}
            </div>
          )}
          {block && kind !== 'omit' && payload(block, updateBlock, langs[0])}
          {target && (
            <>
              <label>
                Clause number in this amendment
                <input
                  required
                  pattern="[A-Za-z0-9]+"
                  value={clause}
                  placeholder="e.g. 1"
                  onChange={(e) => setClause(e.target.value)}
                />
              </label>
              {langs.map((l) => (
                <label key={l}>
                  {l === 'en' ? 'English amendment instruction' : '中文修訂指示'}
                  <textarea
                    required
                    value={instructions[l] ?? ''}
                    onChange={(e) => setInstructions({ ...instructions, [l]: e.target.value })}
                    placeholder={l === 'en' ? 'After section 5, insert—' : '在第5條之後加入——'}
                  />
                </label>
              ))}
              <button
                className="primary"
                disabled={busy || !clause || langs.some((l) => !instructions[l]?.trim())}
                onClick={() => void add()}
              >
                {busy ? 'Checking…' : 'Check and add operation'}
              </button>
            </>
          )}
          <details>
            <summary>Proposed provision order</summary>
            {state.project.provisions
              .flatMap((n) => walk([n]))
              .map((n) => (
                <p key={n.id}>
                  {n.kind} {n.label} {n.heading.en} {n.repealed ? '[repealed]' : ''}
                </p>
              ))}
          </details>
        </>
      )}
    </>
  );
}
