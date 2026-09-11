import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Editor } from '@tiptap/core';
import {
  activeLanguages,
  canonical,
  newProject,
  parseProject,
  validate,
  walk,
  kinds,
  type Block,
  type Inline,
  type Kind,
  type Language,
  type Project,
  type Provision,
  type Reference,
  referenceValues,
} from '../../../packages/domain/src/index.ts';
import { importAKN, exportAKN } from '../../../packages/formats/src/index.ts';
import {
  targets,
  provisionLabel,
  makeIndex,
  indexRevision,
  resolveReference,
  CatalogueClient,
  indexSchema,
  type DocumentIndex,
  type Catalogue,
} from '../../../packages/engine/src/references.ts';
import {
  preparePublication,
  renderHTML,
  type Layout,
} from '../../../packages/presentation/src/index.ts';
import type { Revision } from '../../../packages/engine/src/amendments.ts';
import { change, findBlock, insertProvision, sample, uid, setProvisionLabel } from './model.ts';
import { RichText } from './RichText.tsx';
import './style.css';
import { Icon } from './Icon.tsx';
import { AmendmentPanel } from './AmendmentPanel.tsx';
import { workspaceIndex, lockedIndexes } from './preview.ts';
import { recoveryKey as CACHE, saveRecovery } from './recovery.ts';
const names: Record<Kind, string> = {
  part: 'Part',
  chapter: 'Chapter',
  division: 'Division',
  subdivision: 'Subdivision',
  crossheading: 'Cross-heading',
  section: 'Section',
  subsection: 'Subsection',
  paragraph: 'Paragraph',
  subparagraph: 'Sub-paragraph',
  point: 'Point',
  schedule: 'Schedule',
  appendix: 'Appendix',
};
function initial() {
  try {
    const saved = localStorage.getItem(CACHE);
    if (saved)
      return {
        p: parseProject(saved),
        message: 'Recovered the last project on this device. Download a copy for durable storage.',
      };
  } catch {
    return {
      p: sample(),
      message:
        'Recovery could not be read. The stored copy has been preserved; open a downloaded project to recover.',
    };
  }
  return { p: sample(), message: 'Example draft · replace it with your own document from File.' };
}
function download(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function snapshot(p: Project): Revision {
  return {
    project: p,
    revision: p.revision,
    asOf: new Date().toISOString().slice(0, 10),
    state:
      p.stage === 'draft'
        ? 'proposed'
        : p.adoption && p.adoption.effective > new Date().toISOString().slice(0, 10)
          ? 'not-effective'
          : 'effective',
    applied: [],
    history: [],
  };
}
function localIndex(p: Project) {
  return workspaceIndex(snapshot(p));
}
function App() {
  const [start] = useState(initial);
  const [project, setProject] = useState(start.p);
  const [notice, setNotice] = useState(start.message);
  const [cacheStatus, setCacheStatus] = useState('Recovery ready');
  const [selected, setSelected] = useState(
    walk(start.p.provisions).find((n) => n.kind === 'section' && n.label === '5')?.id ?? 'titles',
  );
  const [tab, setTab] = useState('Home');
  const [layout, setLayout] = useState<Layout>(
    start.p.mode === 'bilingual' ? 'parallel' : start.p.mode,
  );
  const [outline, setOutline] = useState(true);
  const [panel, setPanel] = useState('');
  const [pendingOpen, setPendingOpen] = useState<{
    p: Project;
    options: { new?: boolean; base?: Project; panel?: string };
  } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [amendmentBase, setAmendmentBase] = useState<Project | null>(null);
  const baseFile = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState(100);
  const [filter, setFilter] = useState('');
  const [dirty, setDirty] = useState(false);
  const [version, setVersion] = useState(0);
  const past = useRef<Project[]>([]),
    future = useRef<Project[]>([]);
  const lastEdit = useRef({ key: '', at: 0 });
  const live = useRef(project);
  live.current = project;
  const focused = useRef<Editor | null>(null);
  const focusedLanguage = useRef<Language>('en');
  const file = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState('');
  const [source, setSource] = useState('');
  const [figureFile, setFigureFile] = useState<File | null>(null);
  const [figureAlt, setFigureAlt] = useState('');
  const [figureShared, setFigureShared] = useState(false);
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [external, setExternal] = useState<DocumentIndex | null>(null);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [refScope, setRefScope] = useState('local');
  const [refRevision, setRefRevision] = useState('');
  const [refSearch, setRefSearch] = useState('');
  const [addKind, setAddKind] = useState<Kind>('section');
  const [addPosition, setAddPosition] = useState<'after' | 'child' | 'end'>('after');
  const [addLabel, setAddLabel] = useState('');
  const [numberDraft, setNumberDraft] = useState('');
  const client = useRef<CatalogueClient | null>(null);
  const sourceIndexes = useMemo(() => {
    try {
      return lockedIndexes(project);
    } catch {
      return [];
    }
  }, [project.locks]);
  const editable = project.stage === 'draft';
  const diagnostics = useMemo(() => validate(project), [project]);
  const all = useMemo(() => walk(project.provisions), [project]);
  const chosen = all.find((n) => n.id === selected);
  useEffect(() => {
    setNumberDraft(chosen?.label ?? '');
    setFormError('');
  }, [selected, chosen?.label, panel]);
  const langs: Language[] = layout === 'parallel' ? ['en', 'zh-Hant'] : [layout];
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      try {
        saveRecovery(localStorage, project);
        setCacheStatus('Recovery saved on this device');
      } catch {
        setCacheStatus('Recovery unavailable — download your project');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [project, dirty]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  function commit(next: Project, key = '') {
    const now = Date.now();
    if (!key || lastEdit.current.key !== key || now - lastEdit.current.at > 1000) {
      past.current.push(live.current);
      if (past.current.length > 80) past.current.shift();
    }
    lastEdit.current = { key, at: now };
    future.current = [];
    live.current = next;
    setProject(next);
    setDirty(true);
    setVersion((v) => v + 1);
    setPreview(null);
  }
  function edit(fn: (p: Project) => void, key = '') {
    try {
      commit(change(live.current, fn), key);
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function undo(redo = false) {
    const from = redo ? future : past,
      to = redo ? past : future;
    const p = from.current.pop();
    if (p) {
      to.current.push(live.current);
      live.current = p;
      setProject(p);
      setDirty(true);
      setVersion((v) => v + 1);
      setPreview(null);
      lastEdit.current = { key: '', at: 0 };
    }
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === 'z' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        undo(e.shiftKey);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  function save() {
    try {
      saveRecovery(localStorage, live.current);
      setCacheStatus('Recovery saved on this device');
    } catch {
      setCacheStatus('Recovery unavailable — keep your download');
    }
    download(live.current.id + '.sg.json', canonical(live.current));
    setDirty(false);
    setNotice('Project download requested. Keep the downloaded file as your durable copy.');
  }
  function openPanel(name: string) {
    setFormError('');
    setPanel(name);
  }
  function select(id: string) {
    setSelected(id);
    if (id === 'titles') {
      openPanel('Document details');
      return;
    }
    document
      .getElementById('provision-' + id)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function replace(
    p: Project,
    options: { new?: boolean; base?: Project; panel?: string } = {},
    force = false,
  ) {
    if (dirty && !force) {
      setPendingOpen({ p, options });
      return;
    }
    setPendingOpen(null);
    setAmendmentBase(options.base ?? null);
    past.current = [];
    future.current = [];
    live.current = p;
    setProject(p);
    setSelected(p.provisions[0]?.id ?? 'titles');
    setLayout(p.mode === 'bilingual' ? 'parallel' : p.mode);
    setPreview(null);
    setDirty(!!options.new);
    try {
      saveRecovery(localStorage, p);
      setCacheStatus('Recovery saved on this device');
    } catch {
      setCacheStatus('Recovery unavailable — download your project');
    }
    setPanel(options.panel ?? '');
    focused.current = null;
    setNotice(
      p.stage === 'draft' ? 'Project opened.' : 'Certified or withdrawn source opened read-only.',
    );
  }
  async function load(f?: File) {
    if (!f) return;
    try {
      if (f.size > 40_000_000) throw new Error('File exceeds the 40 MB import limit.');
      const s = await f.text();
      replace(f.name.endsWith('.xml') ? await importAKN(s) : parseProject(s));
    } catch (e) {
      setNotice('Could not open file: ' + (e as Error).message);
    }
    if (file.current) file.current.value = '';
  }
  async function showPreview() {
    try {
      const indexes = [localIndex(project), ...lockedIndexes(project)];
      const html = renderHTML(
        preparePublication(snapshot(project), indexes, location.href, true),
        layout,
      );
      setPreview(html);
      setPanel('');
    } catch (e) {
      setNotice('Preview unavailable: ' + (e as Error).message);
      openPanel('Review');
    }
  }
  function updateInline(block: string, xs: Inline[], row?: number, col?: number) {
    edit(
      (p) => {
        const b = findBlock(p, block);
        if (!b) return;
        if (row !== undefined && col !== undefined) b.rows![row][col] = xs;
        else b.inlines = xs;
      },
      block + ':' + row + ':' + col,
    );
  }
  function rich(xs: Inline[], id: string, label: string, row?: number, col?: number) {
    return (
      <RichText
        value={xs}
        resolveLabel={(i) => {
          const l = label.startsWith('zh-Hant') ? 'zh-Hant' : 'en';
          if (i.term) return project.definitions.find((d) => d.id === i.term)?.names[l] ?? i.text;
          if (!i.ref) return i.text;
          try {
            const idx =
              i.ref.document === project.id && i.ref.publisher === project.publisher
                ? localIndex(project)
                : sourceIndexes.find(
                    (d) => d.id === i.ref!.document && d.publisher === i.ref!.publisher,
                  );
            return idx
              ? resolveReference(project, i.ref, idx, l, location.href).label
              : '[Unresolved reference] ' + i.text;
          } catch {
            return '[Unresolved reference] ' + i.text;
          }
        }}
        label={label}
        editable={editable}
        onChange={(v) => updateInline(id, v, row, col)}
        onFocus={(e) => {
          focused.current = e;
          focusedLanguage.current = label.startsWith('zh-Hant') ? 'zh-Hant' : 'en';
        }}
        onNotice={setNotice}
      />
    );
  }
  function removeBlock(id: string) {
    edit((p) => {
      for (const n of walk(p.provisions)) {
        if (n.shared) n.shared = n.shared.filter((b) => b.id !== id);
        for (const l of ['en', 'zh-Hant'] as const) {
          if (n.content[l]) n.content[l] = n.content[l]!.filter((b) => b.id !== id);
          if (n.tail[l]) n.tail[l] = n.tail[l]!.filter((b) => b.id !== id);
        }
      }
      for (const l of ['en', 'zh-Hant'] as const)
        if (p.opening.recitals[l])
          p.opening.recitals[l] = p.opening.recitals[l]!.filter((b) => b.id !== id);
    });
  }
  function renderBlock(b: Block, l: Language | 'shared') {
    return (
      <div key={b.id} className={'block block-' + b.type}>
        {editable && (
          <button
            className="remove-block"
            aria-label={'Remove ' + b.type + ' block'}
            title="Remove block (can undo)"
            onClick={() => removeBlock(b.id)}
          >
            <Icon name="x-lg" />
          </button>
        )}
        {b.type === 'table' ? (
          <>
            <input
              className="caption"
              aria-label="Table caption"
              placeholder="Table caption"
              value={b.caption ?? ''}
              disabled={!editable}
              onChange={(e) =>
                edit((p) => {
                  findBlock(p, b.id)!.caption = e.target.value;
                }, b.id + 'caption')
              }
            />
            <table>
              <tbody>
                {b.rows?.map((row, r) => (
                  <tr key={r}>
                    {b.numbered && <th className="row-number">{r === 0 ? '' : r}</th>}
                    {row.map((cell, c) =>
                      r === 0 ? (
                        <th key={c}>{rich(cell, b.id, `Table header ${c + 1}`, r, c)}</th>
                      ) : (
                        <td key={c}>{rich(cell, b.id, `Table row ${r}, column ${c + 1}`, r, c)}</td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {editable && (
              <div className="table-tools">
                <button
                  onClick={() =>
                    edit((p) => {
                      const t = findBlock(p, b.id)!;
                      t.rows!.push(t.rows![0].map(() => []));
                    })
                  }
                >
                  <Icon name="plus-lg" /> Row
                </button>
                <button
                  onClick={() =>
                    edit((p) => {
                      findBlock(p, b.id)!.rows!.forEach((r) => r.push([]));
                    })
                  }
                >
                  <Icon name="plus-lg" /> Column
                </button>
                <button
                  disabled={(b.rows?.length ?? 0) < 2}
                  onClick={() =>
                    edit((p) => {
                      findBlock(p, b.id)!.rows!.pop();
                    })
                  }
                >
                  <Icon name="dash-lg" /> Last row
                </button>
                <button
                  disabled={(b.rows?.[0]?.length ?? 0) < 2}
                  onClick={() =>
                    edit((p) => {
                      findBlock(p, b.id)!.rows!.forEach((r) => r.pop());
                    })
                  }
                >
                  <Icon name="dash-lg" /> Last column
                </button>
                <label>
                  <input
                    type="checkbox"
                    checked={!!b.numbered}
                    onChange={(e) =>
                      edit((p) => {
                        findBlock(p, b.id)!.numbered = e.target.checked;
                      })
                    }
                  />{' '}
                  Number rows
                </label>
              </div>
            )}
          </>
        ) : b.type === 'definition' && b.definition ? (
          <p>
            {(() => {
              const d = project.definitions.find((d) => d.id === b.definition);
              const language = l === 'shared' ? 'en' : l;
              const idx = d?.document
                ? sourceIndexes.find(
                    (i) =>
                      i.id === d.document && i.publisher === (d.publisher ?? project.publisher),
                  )
                : undefined;
              return d
                ? '“' +
                    (d.names[language] ?? '') +
                    '” ' +
                    (language === 'en' ? 'means ' : '指') +
                    (idx?.titles[language] ?? d.meaning[language] ?? '')
                : 'Missing definition';
            })()}
          </p>
        ) : b.type === 'figure' ? (
          <figure>
            {project.assets[b.asset ?? ''] && (
              <img
                src={
                  'data:' +
                  project.assets[b.asset!].mediaType +
                  ';base64,' +
                  project.assets[b.asset!].data
                }
                alt={b.alt}
              />
            )}
            <figcaption>{b.caption ?? b.alt}</figcaption>
          </figure>
        ) : (
          <>
            {b.type !== 'p' && <span className="block-type">{b.type}</span>}
            {rich(b.inlines, b.id, `${l} ${b.type}`)}
          </>
        )}
      </div>
    );
  }
  function renderNode(n: Provision, depth = 0): React.ReactNode {
    const group = ['part', 'chapter', 'division', 'subdivision'].includes(n.kind);
    return (
      <section
        id={'provision-' + n.id}
        key={n.id}
        className={`provision ${group ? 'group' : ''} ${selected === n.id ? 'selected' : ''} ${n.repealed ? 'repealed' : ''}`}
        onFocus={(e) => {
          e.stopPropagation();
          setSelected(n.id);
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelected(n.id);
        }}
      >
        <div className={'language-pair ' + (layout === 'parallel' ? 'parallel' : '')}>
          {langs.map((l) => (
            <div
              key={l}
              lang={l}
              className="language-cell"
              style={{ paddingLeft: group ? 0 : Math.min(depth, 3) * 12 }}
            >
              <div
                className={
                  'provision-heading ' +
                  (!group &&
                  n.kind !== 'section' &&
                  !['schedule', 'appendix'].includes(n.kind) &&
                  !n.heading[l]
                    ? 'compact-heading'
                    : '')
                }
              >
                <button
                  type="button"
                  className="number number-button"
                  hidden={n.kind === 'crossheading'}
                  disabled={!editable || n.repealed}
                  aria-label={`Edit number for ${names[n.kind]} ${n.label ?? ''}`}
                  title={`Edit ${names[n.kind]} number`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(n.id);
                    openPanel('Provision properties');
                  }}
                >
                  {l === 'zh-Hant' && n.label
                    ? ((
                        {
                          part: '第' + n.label + '部',
                          chapter: '第' + n.label + '章',
                          division: '第' + n.label + '分部',
                          subdivision: '第' + n.label + '次分部',
                          section: '第' + n.label + '條',
                          schedule: '附表' + n.label,
                          appendix: '附錄' + n.label,
                        } as Partial<Record<Kind, string>>
                      )[n.kind] ?? '(' + n.label + ')')
                    : group || ['schedule', 'appendix'].includes(n.kind)
                      ? names[n.kind] + ' ' + n.label
                      : n.kind === 'section'
                        ? n.label + '.'
                        : n.label
                          ? '(' + n.label + ')'
                          : ''}
                  <Icon name="pencil" className="number-edit-icon" />
                </button>
                <input
                  aria-label={`${l} heading ${n.label ?? n.kind}`}
                  placeholder={group ? 'Heading' : n.kind === 'section' ? 'Section heading' : ''}
                  value={n.heading[l] ?? ''}
                  disabled={!editable || n.repealed}
                  onChange={(e) =>
                    edit(
                      (p) => {
                        walk(p.provisions).find((v) => v.id === n.id)!.heading[l] = e.target.value;
                      },
                      n.id + l + 'heading',
                    )
                  }
                />
              </div>
              {n.repealed ? (
                <p className="muted">Repealed</p>
              ) : (
                <>
                  {(n.content[l] ?? []).map((b) => renderBlock(b, l))}
                  {editable && !group && !n.content[l]?.length && (
                    <button
                      className="add-translation"
                      onClick={() =>
                        edit((p) => {
                          const node = walk(p.provisions).find((v) => v.id === n.id)!;
                          (node.content[l] ??= []).push({ id: uid(), type: 'p', inlines: [] });
                        })
                      }
                    >
                      <Icon name="plus-lg" /> {l === 'en' ? 'Add English text' : '新增中文內容'}
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        {!!n.shared?.length && (
          <div className="shared">
            <div className="shared-label">Shared content · used in both language outputs</div>
            {n.shared.map((b) => renderBlock(b, 'shared'))}
          </div>
        )}
        {project.amendment?.operations
          .filter((op) => op.author === n.id)
          .map((op) => (
            <div className="operative" key={op.id}>
              <div className={'language-pair ' + (layout === 'parallel' ? 'parallel' : '')}>
                {langs.map((l) => (
                  <div key={l}>
                    <p>{op.instructions[l]}</p>
                    {op.node && (
                      <blockquote>
                        <strong>
                          {op.node.label} {op.node.heading[l]}
                        </strong>
                        {(op.node.content[l] ?? []).map((b) => (
                          <p key={b.id}>{b.inlines.map((i) => i.text).join('')}</p>
                        ))}
                        {op.node.children.length > 0 && (
                          <p className="hint">
                            Includes {op.node.children.length} child provisions; open Publication
                            preview for the full quotation.
                          </p>
                        )}
                      </blockquote>
                    )}
                    {op.block && op.scope === l && (
                      <blockquote>
                        {op.block.type === 'table' ? (
                          <p>Whole-table replacement · {op.block.rows?.length} rows</p>
                        ) : (
                          op.block.inlines.map((i) => i.text).join('')
                        )}
                      </blockquote>
                    )}
                  </div>
                ))}
              </div>
              {op.block && op.scope === 'shared' && (
                <div className="shared-label">
                  Shared {op.block.type} replacement · {op.block.rows?.length ?? 0} rows
                </div>
              )}
              <button className="operation-edit" onClick={() => openPanel('Amendments')}>
                Review amendment operation
              </button>
            </div>
          ))}
        {n.children.map((c) => renderNode(c, depth + 1))}
        <div className={'language-pair ' + (layout === 'parallel' ? 'parallel' : '')}>
          {langs.map((l) => (
            <div key={l}>{(n.tail[l] ?? []).map((b) => renderBlock(b, l))}</div>
          ))}
        </div>
      </section>
    );
  }
  function addBlock(type: Block['type'], shared = false) {
    if (!chosen) {
      setNotice('Select a provision in the outline first.');
      return;
    }
    edit((p) => {
      const n = walk(p.provisions).find((n) => n.id === selected)!;
      const b: Block = {
        id: uid(),
        type,
        inlines: [],
        ...(type === 'table'
          ? {
              rows: [
                [[{ text: 'English' }], [{ text: '繁體中文' }]],
                [[], []],
              ],
            }
          : {}),
      };
      if (shared) (n.shared ??= []).push(b);
      else (n.content[langs[0]] ??= []).push(b);
    });
  }
  async function connect() {
    setBusy(true);
    setFormError('');
    try {
      const c = new CatalogueClient(async (url) => {
        const r = await fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(15000) });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      }, offline);
      await c.addLocks(project.locks);
      const result = await c.discover(source);
      client.current = c;
      setCatalogue(result.catalogue);
      setExternal(null);
      setNotice(
        `Catalogue dated ${result.staleAsOf} · ${result.cached ? 'saved copy' : 'loaded from publisher'}`,
      );
      edit((p) => {
        p.locks = c.locks();
      });
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function getExternal(id: string) {
    setBusy(true);
    try {
      const idx = await client.current!.document(source, id);
      setExternal(idx);
      setRefRevision(idx.current);
      edit((p) => {
        p.locks = client.current!.locks();
      });
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function insertRef(target: string) {
    const idx = refScope === 'local' ? localIndex(project) : external;
    if (!idx || !focused.current || focused.current.isDestroyed) {
      setFormError('Place the text cursor in the document before inserting a reference.');
      return;
    }
    const rev = refScope === 'local' ? idx.current : refRevision;
    const draft = idx.revisions.find((r) => r.id === rev)?.kind === 'draft';
    const ref: Reference = {
      publisher: idx.publisher,
      document: idx.id,
      target,
      selector: draft ? 'draft' : refScope === 'local' ? 'current' : 'revision',
      ...(draft || refScope !== 'local' ? { revision: rev } : {}),
    };
    try {
      const resolved = resolveReference(
        project,
        ref,
        idx,
        focusedLanguage.current,
        refScope === 'local' ? location.href : source,
      );
      focused.current
        .chain()
        .focus()
        .insertContent({ type: 'citation', attrs: { value: { text: resolved.label, ref } } })
        .run();
      setNotice(resolved.warnings.join(' ') || 'Reference inserted.');
      setPanel('');
    } catch (e) {
      setFormError((e as Error).message);
    }
  }
  function tool(text: string, fn: () => void, disabled = false, icon?: string) {
    return (
      <button
        disabled={disabled}
        onMouseDown={(e) => {
          if (focused.current) e.preventDefault();
        }}
        onClick={fn}
      >
        {icon && <Icon name={icon} className="tool-icon" />}
        {text}
      </button>
    );
  }
  function format(mark: string) {
    if (!focused.current) {
      setNotice('Place the cursor in a text block first.');
      return;
    }
    focused.current.chain().focus().toggleMark(mark).run();
  }
  function group(label: string, children: React.ReactNode) {
    return (
      <div className="ribbon-group">
        <div className="ribbon-controls">{children}</div>
        <span className="ribbon-label">{label}</span>
      </div>
    );
  }
  const refTargets =
    refScope === 'local'
      ? targets(project)
      : (external?.revisions.find((r) => r.id === refRevision)?.targets ?? []);
  return (
    <div className="app">
      <header className="titlebar">
        <div className="brand">
          <span className="brand-icon">
            <Icon name="file-earmark-text" />
          </span>{' '}
          Style Guide Studio
        </div>
        <div className="document-name">
          {project.titles.en || 'Untitled guide'}{' '}
          <span className="badge">
            {project.stage === 'draft'
              ? 'Draft'
              : project.stage === 'adopted'
                ? 'Adopted · read-only'
                : 'Withdrawn · read-only'}
          </span>
        </div>
        <span className="saved">{cacheStatus}</span>
      </header>
      <nav className="tabs" aria-label="Ribbon">
        {['File', 'Home', 'Insert', 'Structure', 'References', 'Amendments', 'Review', 'View'].map(
          (t) => (
            <button
              aria-pressed={tab === t}
              className={tab === t ? 'active' : ''}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ),
        )}
        <div className="tab-spacer" />
        <button onClick={() => (preview ? setPreview(null) : void showPreview())}>
          <Icon name={preview ? 'arrow-left' : 'file-earmark-richtext'} />{' '}
          {preview ? 'Back to writing' : 'Publication preview'}
        </button>
        <button className="save" onClick={save}>
          <Icon name="download" /> Download project
        </button>
      </nav>
      <div className="ribbon">
        {tab === 'File' && (
          <>
            {group(
              'Project',
              <>
                {tool('New guide', () => openPanel('New guide'), false, 'plus-lg')}
                {tool('Open project', () => file.current?.click(), false, 'folder2-open')}
                {tool(
                  'Document details',
                  () => openPanel('Document details'),
                  false,
                  'file-earmark-text',
                )}
              </>,
            )}
            {group(
              'Portable files',
              <>
                {tool('Download project', save, false, 'download')}
                {tool(
                  'Export AKN',
                  () => {
                    void exportAKN(project, langs[0], new Date().toISOString().slice(0, 10))
                      .then((s) => download(project.id + '.xml', s, 'application/xml'))
                      .catch((e) => setNotice(e.message));
                  },
                  false,
                  'file-earmark-code',
                )}
              </>,
            )}
            <p className="ribbon-help">
              Files stay on your device.
              <br />
              Downloading does not certify or publish a guide.
            </p>
          </>
        )}
        {tab === 'Home' && (
          <>
            {group(
              'History',
              <>
                {tool('Undo', () => undo(), !past.current.length, 'arrow-counterclockwise')}
                {tool('Redo', () => undo(true), !future.current.length, 'arrow-clockwise')}
              </>,
            )}
            {group(
              'Text',
              <div className="format-tools">
                <button
                  aria-label="bold"
                  title="bold"
                  disabled={!editable}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => format('bold')}
                >
                  <Icon name="type-bold" />
                </button>
                <button
                  aria-label="italic"
                  title="italic"
                  disabled={!editable}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => format('italic')}
                >
                  <Icon name="type-italic" />
                </button>
                <button
                  aria-label="code"
                  title="code"
                  disabled={!editable}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => format('code')}
                >
                  <Icon name="code" />
                </button>
                <button
                  aria-label="superscript"
                  title="superscript"
                  disabled={!editable}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => format('superscript')}
                >
                  <Icon name="superscript" />
                </button>
                <button
                  aria-label="subscript"
                  title="subscript"
                  disabled={!editable}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => format('subscript')}
                >
                  <Icon name="subscript" />
                </button>
              </div>,
            )}
            {group(
              'Content',
              <>
                {tool('Paragraph', () => addBlock('p'), !editable, 'paragraph')}
                {tool('Quotation', () => addBlock('quote'), !editable, 'quote')}
              </>,
            )}
            {group(
              'Provisions',
              <>
                {tool('Add provision', () => openPanel('Add provision'), !editable, 'plus-lg')}
                {tool(
                  'Properties',
                  () => openPanel('Provision properties'),
                  !editable || !chosen,
                  'list-ol',
                )}
              </>,
            )}
            {group(
              'References',
              <>
                {tool(
                  'Insert reference',
                  () => openPanel('Insert reference'),
                  !editable,
                  'link-45deg',
                )}
                {tool('Defined names', () => openPanel('Defined names'), !editable, 'book')}
              </>,
            )}
          </>
        )}
        {tab === 'Insert' && (
          <>
            {group(
              'Text blocks',
              <>
                {(['p', 'quote', 'note', 'example', 'footnote', 'bullet'] as const).map((t) => (
                  <React.Fragment key={t}>
                    {tool(t === 'p' ? 'Paragraph' : t, () => addBlock(t), !editable)}
                  </React.Fragment>
                ))}
              </>,
            )}
            {group(
              'Figures',
              tool(
                'Image',
                () => openPanel('Insert image'),
                !editable || !chosen,
                'file-earmark-richtext',
              ),
            )}
            {group(
              'Tables',
              <>
                {tool('Table', () => addBlock('table'), !editable, 'table')}
                {tool('Shared table', () => addBlock('table', true), !editable, 'table')}
              </>,
            )}
            {group(
              'References',
              <>
                {tool(
                  'Insert reference',
                  () => openPanel('Insert reference'),
                  !editable,
                  'link-45deg',
                )}
                {tool('Defined names', () => openPanel('Defined names'), !editable, 'book')}
              </>,
            )}
          </>
        )}
        {tab === 'Structure' && (
          <>
            {group(
              'Structure',
              <>
                {tool('Add provision', () => openPanel('Add provision'), !editable, 'plus-lg')}
                {tool(
                  'Properties',
                  () => openPanel('Provision properties'),
                  !editable || !chosen,
                  'list-ol',
                )}
                {tool(
                  'Titles & opening',
                  () => openPanel('Document details'),
                  false,
                  'file-earmark-text',
                )}
              </>,
            )}
            <p className="ribbon-help">
              Manual labels preserve citations.
              <br />
              Insert 5A between 5 and 6; no automatic renumbering.
            </p>
          </>
        )}
        {tab === 'References' && (
          <>
            {group(
              'References',
              <>
                {tool(
                  'Insert reference',
                  () => openPanel('Insert reference'),
                  !editable,
                  'link-45deg',
                )}
                {tool('Defined names', () => openPanel('Defined names'), !editable, 'book')}
              </>,
            )}
            {group(
              'Sources',
              tool(
                'Published catalogues',
                () => {
                  setRefScope('external');
                  openPanel('Insert reference');
                },
                !editable,
                'file-earmark-text',
              ),
            )}
            {group(
              'Checks',
              tool('Review document', () => openPanel('Review'), false, 'check2-circle'),
            )}
          </>
        )}
        {tab === 'Amendments' && (
          <>
            {group(
              'Amendment instrument',
              tool(
                project.amendment ? 'Compose amendments' : 'Create amendment',
                () => openPanel('Amendments'),
                false,
                'list-ol',
              ),
            )}
            <p className="ribbon-help">
              Insert, omit or substitute against an exact source.
              <br />
              Review proposed changes before adoption.
            </p>
          </>
        )}
        {tab === 'Review' && (
          <>
            {group(
              'Checks',
              tool('Review document', () => openPanel('Review'), false, 'check2-circle'),
            )}
            {group(
              'Source',
              tool(
                'Document details',
                () => openPanel('Document details'),
                false,
                'file-earmark-text',
              ),
            )}
            <p className="ribbon-help">
              {diagnostics.length} checks to review ·{' '}
              {project.role === 'amendment' ? 'Amendment instrument' : 'Principal guide'}
              <br />
              Drafts do not take effect.
            </p>
          </>
        )}
        {tab === 'View' && (
          <>
            {group(
              'Workspace',
              tool(
                outline ? 'Hide outline' : 'Show outline',
                () => setOutline(!outline),
                false,
                'layout-sidebar',
              ),
            )}
            {group(
              'Document language',
              <select
                aria-label="Document view"
                value={layout}
                onChange={(e) => {
                  setLayout(e.target.value as Layout);
                  setPreview(null);
                }}
              >
                {activeLanguages(project).map((l) => (
                  <option key={l} value={l}>
                    {l === 'en' ? 'English' : '繁體中文'}
                  </option>
                ))}
                {project.mode === 'bilingual' && <option value="parallel">Side by side</option>}
              </select>,
            )}
            {group(
              'Preview',
              tool('Publication preview', () => void showPreview(), false, 'file-earmark-richtext'),
            )}
            <p className="ribbon-help">
              Bilingual outputs: English, Chinese,
              <br />
              and a provision-aligned landscape document.
            </p>
          </>
        )}
      </div>
      <div className="workspace">
        {outline && (
          <aside className="outline">
            <div className="outline-title">
              Document outline <span>{all.length}</span>
            </div>
            <input
              aria-label="Find provision"
              placeholder="Find a provision…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <button
              className={selected === 'titles' ? 'selected' : ''}
              onClick={() => select('titles')}
            >
              <Icon name="file-earmark-text" /> <span>Titles & opening</span>
            </button>
            {(function tree(ns: Provision[], depth = 0): React.ReactNode {
              return ns.map((n) => (
                <React.Fragment key={n.id}>
                  {(!filter ||
                    (n.label + ' ' + Object.values(n.heading).join(' '))
                      .toLowerCase()
                      .includes(filter.toLowerCase())) && (
                    <button
                      style={{ paddingLeft: 14 + depth * 13 }}
                      className={`${selected === n.id ? 'selected' : ''} ${['part', 'schedule', 'appendix'].includes(n.kind) ? 'outline-group' : ''}`}
                      onClick={() => select(n.id)}
                    >
                      <span className="outline-number">
                        {['part', 'schedule', 'appendix'].includes(n.kind)
                          ? names[n.kind] + ' '
                          : ''}
                        {n.label}
                      </span>
                      <span>{n.heading[langs[0]] || n.heading.en || names[n.kind]}</span>
                    </button>
                  )}
                  {tree(n.children, depth + 1)}
                </React.Fragment>
              ));
            })(project.provisions)}
            <div className="outline-bottom">
              <button disabled={!editable} onClick={() => openPanel('Add provision')}>
                <Icon name="plus-lg" /> Add provision
              </button>
            </div>
          </aside>
        )}
        <main className="writing" aria-label={preview ? 'Publication preview' : 'Document editor'}>
          {preview ? (
            <iframe
              title="Publication preview — not certified"
              sandbox=""
              srcDoc={preview.replaceAll('href="#', 'href="about:srcdoc#')}
            />
          ) : (
            <>
              <div className="canvas-meta">
                <span>{project.stage === 'draft' ? 'DRAFT DOCUMENT' : 'READ-ONLY SOURCE'}</span>
                <span>
                  {layout === 'parallel'
                    ? 'ENGLISH / 繁體中文'
                    : layout === 'en'
                      ? 'ENGLISH'
                      : '繁體中文'}
                </span>
              </div>
              <article
                className={'paper ' + (layout === 'parallel' ? 'wide' : '')}
                style={{ fontSize: (18 * zoom) / 100 }}
              >
                <div className="paper-title" onClick={() => openPanel('Document details')}>
                  <h1>{project.titles.en || 'Untitled guide'}</h1>
                  <p lang="zh-Hant">{project.titles['zh-Hant'] || '中文正式名稱尚未填寫'}</p>
                </div>
                {langs.map((l) => (
                  <div key={l} className="opening" lang={l}>
                    {project.opening.longTitle[l] && <p>{project.opening.longTitle[l]}</p>}
                    {project.opening.recitals[l]?.map((b) => renderBlock(b, l))}
                    {project.opening.formula[l] && <p>{project.opening.formula[l]}</p>}
                  </div>
                ))}
                {layout === 'parallel' && (
                  <div className="column-heads">
                    <span>English</span>
                    <span>繁體中文</span>
                  </div>
                )}
                {project.provisions.length ? (
                  project.provisions.map((n) => renderNode(n))
                ) : (
                  <div className="empty">
                    <h2>Begin your guide</h2>
                    <p>Add a section, Part or Schedule. You choose each provision’s number.</p>
                    <button
                      onClick={() => {
                        setAddPosition('end');
                        openPanel('Add provision');
                      }}
                    >
                      <Icon name="plus-lg" /> Add first provision
                    </button>
                  </div>
                )}
                {langs.map(
                  (l) =>
                    project.opening.authentication[l] && (
                      <p key={l}>{project.opening.authentication[l]}</p>
                    ),
                )}
              </article>
              <div className="page-end">End of document</div>
            </>
          )}
        </main>
        {panel && (
          <aside className="inspector" aria-label={panel}>
            <div className="panel-title">
              <h2>{panel}</h2>
              <button aria-label="Close panel" onClick={() => setPanel('')}>
                <Icon name="x-lg" />
              </button>
            </div>
            {formError && (
              <p role="alert" className="error">
                {formError}
              </p>
            )}
            {panel === 'Amendments' && (
              <AmendmentPanel
                project={project}
                base={amendmentBase}
                onLoad={() => baseFile.current?.click()}
                onCreate={(p) => {
                  replace(p, { new: true, base: project, panel: 'Amendments' });
                }}
                onCommit={(p) => {
                  if (live.current !== project) {
                    setNotice(
                      'The draft changed during checking. Review and add the operation again.',
                    );
                    return;
                  }
                  commit(p);
                }}
                onNotice={setNotice}
                onPreview={(state) => {
                  try {
                    setPreview(
                      renderHTML(
                        preparePublication(
                          { ...state, history: [] },
                          [workspaceIndex(state), ...lockedIndexes(state.project)],
                          location.href,
                          true,
                        ),
                        layout,
                      ),
                    );
                    setPanel('');
                    setNotice(
                      'Proposed amended text — not in force. Operation history is available in the amendment panel.',
                    );
                  } catch (e) {
                    setNotice((e as Error).message);
                  }
                }}
              />
            )}
            {panel === 'New guide' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  const p = newProject();
                  p.id = 'guide-' + crypto.randomUUID();
                  p.titles = { en: String(data.get('en')), 'zh-Hant': String(data.get('zh')) };
                  p.mode = String(data.get('mode')) as Project['mode'];
                  p.authority = p.mode === 'bilingual' ? 'both' : p.mode;
                  replace(p, { new: true });
                }}
              >
                <label>
                  English formal title
                  <input name="en" required />
                </label>
                <label>
                  中文正式名稱
                  <input name="zh" required lang="zh-Hant" />
                </label>
                <label>
                  Document languages
                  <select name="mode">
                    <option value="en">English</option>
                    <option value="zh-Hant">繁體中文</option>
                    <option value="bilingual">English and 繁體中文</option>
                  </select>
                </label>
                <p className="hint">
                  Every guide has both formal titles, including monolingual guides.
                </p>
                <button className="primary">Create draft</button>
              </form>
            )}
            {panel === 'Document details' && (
              <>
                <label>
                  English formal title
                  <input
                    value={project.titles.en}
                    disabled={!editable}
                    onChange={(e) =>
                      edit((p) => {
                        p.titles.en = e.target.value;
                      }, 'title-en')
                    }
                  />
                </label>
                <label>
                  中文正式名稱
                  <input
                    value={project.titles['zh-Hant']}
                    disabled={!editable}
                    onChange={(e) =>
                      edit((p) => {
                        p.titles['zh-Hant'] = e.target.value;
                      }, 'title-zh')
                    }
                  />
                </label>
                <label>
                  Document languages
                  <select
                    disabled={!editable}
                    value={project.mode}
                    onChange={(e) => {
                      const mode = e.target.value as Project['mode'];
                      edit((p) => {
                        p.mode = mode;
                        p.authority = mode === 'bilingual' ? 'both' : mode;
                      });
                      setLayout(mode === 'bilingual' ? 'parallel' : mode);
                    }}
                  >
                    <option value="en">English</option>
                    <option value="zh-Hant">繁體中文</option>
                    <option value="bilingual">English and 繁體中文</option>
                  </select>
                </label>
                <p className="hint">
                  Changing the view never removes stored translations. Missing translations appear
                  in Review.
                </p>
                {activeLanguages(project).map((l) => (
                  <div key={l}>
                    <h3>{l === 'en' ? 'English opening' : '中文引言'}</h3>
                    <button
                      disabled={!editable}
                      onClick={() =>
                        edit((p) => {
                          (p.opening.recitals[l] ??= []).push({
                            id: uid(),
                            type: 'p',
                            inlines: [],
                          });
                        })
                      }
                    >
                      <Icon name="plus-lg" /> {l === 'en' ? 'Recital' : '序言'}
                    </button>
                    {(['longTitle', 'formula', 'authentication'] as const).map((k) => (
                      <label key={k}>
                        {k === 'longTitle'
                          ? 'Long title'
                          : k === 'formula'
                            ? 'Enacting formula'
                            : 'Authentication'}
                        <textarea
                          value={project.opening[k][l] ?? ''}
                          disabled={!editable}
                          onChange={(e) =>
                            edit((p) => {
                              p.opening[k][l] = e.target.value;
                            }, k + l)
                          }
                        />
                      </label>
                    ))}
                  </div>
                ))}
                <details>
                  <summary>Source metadata</summary>
                  <p>
                    {project.id} · {project.revision}
                  </p>
                  <p>
                    {project.stage} · {project.role}
                  </p>
                </details>
              </>
            )}
            {panel === 'Add provision' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  try {
                    commit(insertProvision(project, selected, addPosition, addKind, addLabel));
                    setPanel('');
                    setNotice('Provision inserted. Existing numbers are unchanged.');
                    setAddLabel('');
                  } catch (err) {
                    setFormError((err as Error).message);
                  }
                }}
              >
                <label>
                  Insert
                  <select
                    value={addPosition}
                    onChange={(e) => setAddPosition(e.target.value as typeof addPosition)}
                  >
                    <option value="after">After selected provision</option>
                    <option value="child">Inside selected provision, at end</option>
                    <option value="end">At end of document</option>
                  </select>
                </label>
                <p className="hint">
                  Selected: {chosen ? names[chosen.kind] + ' ' + chosen.label : 'none'}
                </p>
                <label>
                  Level
                  <select value={addKind} onChange={(e) => setAddKind(e.target.value as Kind)}>
                    {kinds.map((k) => (
                      <option key={k} value={k}>
                        {names[k]}
                      </option>
                    ))}
                  </select>
                </label>
                {addKind !== 'crossheading' && (
                  <label>
                    Manual number
                    <input
                      required
                      pattern="[A-Za-z0-9]+"
                      placeholder="e.g. 5A"
                      value={addLabel}
                      onChange={(e) => setAddLabel(e.target.value)}
                    />
                  </label>
                )}
                <p className="hint">
                  No existing provision is renumbered. The new provision receives its own permanent
                  reference identity.
                </p>
                <button className="primary" disabled={!editable}>
                  Insert provision
                </button>
              </form>
            )}
            {panel === 'Provision properties' && chosen && (
              <>
                <p>
                  {names[chosen.kind]} {chosen.label}
                </p>
                {chosen.kind !== 'crossheading' && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      try {
                        commit(setProvisionLabel(project, chosen.id, numberDraft));
                        setNotice(
                          `${names[chosen.kind]} number updated to ${numberDraft}. References retain their permanent targets.`,
                        );
                        setFormError('');
                      } catch (error) {
                        setFormError((error as Error).message);
                      }
                    }}
                  >
                    <label>
                      Manual number
                      <input
                        key={chosen.id}
                        autoFocus
                        required
                        pattern="[A-Za-z0-9]+"
                        placeholder="e.g. 1A"
                        disabled={!editable}
                        value={numberDraft}
                        onChange={(e) => setNumberDraft(e.target.value)}
                      />
                    </label>
                    <button
                      className="primary"
                      disabled={!editable || numberDraft === chosen.label}
                    >
                      Apply number
                    </button>
                  </form>
                )}
                <p className="hint">
                  Draft labels can be edited. Review detects duplicates; published sources cannot be
                  renumbered here.
                </p>
                <button
                  disabled={!editable}
                  onClick={() =>
                    edit((p) => {
                      const n = walk(p.provisions).find((n) => n.id === selected)!;
                      (n.tail[langs[0]] ??= []).push({ id: uid(), type: 'p', inlines: [] });
                    })
                  }
                >
                  <Icon name="plus-lg" /> Trailing parent text
                </button>
                <button
                  disabled={!editable}
                  onClick={() =>
                    edit((p) => {
                      const ids = new Set(walk([chosen]).map((n) => n.id));
                      if (
                        referenceValues(p).some(
                          (r) =>
                            r.document === p.id &&
                            r.publisher === p.publisher &&
                            r.target &&
                            ids.has(r.target),
                        )
                      )
                        throw new Error(
                          'This provision is referenced. Remove its references before deleting it.',
                        );
                      if (p.amendment?.operations.some((op) => ids.has(op.author)))
                        throw new Error(
                          'This clause authors an amendment operation. Remove the operation first.',
                        );
                      const remove = (ns: Provision[]): Provision[] =>
                        ns
                          .filter((n) => n.id !== selected)
                          .map((n) => ({ ...n, children: remove(n.children) }));
                      p.provisions = remove(p.provisions);
                    })
                  }
                >
                  Remove draft provision (can undo)
                </button>
                <details>
                  <summary>Permanent identity</summary>
                  <code>{chosen.id}</code>
                </details>
              </>
            )}
            {panel === 'Insert image' && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!figureFile || !chosen) return;
                  try {
                    if (
                      !['image/png', 'image/jpeg'].includes(figureFile.type) ||
                      figureFile.size > 8_000_000
                    )
                      throw new Error('Choose a PNG or JPEG smaller than 8 MB.');
                    const imageSource = await new Promise<string>((resolve, reject) => {
                      const r = new FileReader();
                      r.onload = () => resolve(String(r.result).split(',')[1]);
                      r.onerror = () => reject(new Error('Could not read the image.'));
                      r.readAsDataURL(figureFile);
                    });
                    edit((p) => {
                      const n = walk(p.provisions).find((n) => n.id === selected);
                      if (!n) throw new Error('The selected provision no longer exists.');
                      const asset = uid();
                      p.assets[asset] = {
                        mediaType: figureFile.type as 'image/png' | 'image/jpeg',
                        data: imageSource,
                      };
                      const b: Block = {
                        id: uid(),
                        type: 'figure',
                        asset,
                        alt: figureAlt,
                        inlines: [],
                      };
                      if (figureShared) (n.shared ??= []).push(b);
                      else (n.content[langs[0]] ??= []).push(b);
                    });
                    setFigureFile(null);
                    setFigureAlt('');
                    setPanel('');
                  } catch (e) {
                    setFormError((e as Error).message);
                  }
                }}
              >
                <label>
                  Image file
                  <input
                    required
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => setFigureFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <label>
                  Alternative text
                  <textarea
                    required
                    value={figureAlt}
                    onChange={(e) => setFigureAlt(e.target.value)}
                  />
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={figureShared}
                    onChange={(e) => setFigureShared(e.target.checked)}
                  />{' '}
                  Shared across both languages
                </label>
                <p className="hint">
                  The image is embedded in the project file. No upload is made.
                </p>
                <button className="primary">Insert image</button>
              </form>
            )}
            {panel === 'Defined names' && (
              <>
                <p className="hint">
                  Definitions supply consistent wording for terms and document names. They do not
                  replace ordinary typed prose.
                </p>
                {project.definitions.map((d) => (
                  <div className="definition-editor" key={d.id}>
                    {(['en', 'zh-Hant'] as const).map((l) => (
                      <React.Fragment key={l}>
                        <label>
                          {l === 'en' ? 'English name' : '中文名稱'}
                          <input
                            value={d.names[l] ?? ''}
                            onChange={(e) =>
                              edit(
                                (p) => {
                                  p.definitions.find((v) => v.id === d.id)!.names[l] =
                                    e.target.value;
                                },
                                d.id + l + 'name',
                              )
                            }
                          />
                        </label>
                        {!d.document && (
                          <label>
                            {l === 'en' ? 'Meaning' : '釋義'}
                            <textarea
                              value={d.meaning[l] ?? ''}
                              onChange={(e) =>
                                edit(
                                  (p) => {
                                    p.definitions.find((v) => v.id === d.id)!.meaning[l] =
                                      e.target.value;
                                  },
                                  d.id + l + 'meaning',
                                )
                              }
                            />
                          </label>
                        )}
                      </React.Fragment>
                    ))}
                    <label>
                      Meaning refers to
                      <select
                        value={d.document ?? ''}
                        onChange={(e) =>
                          edit((p) => {
                            const def = p.definitions.find((v) => v.id === d.id)!;
                            if (!e.target.value) {
                              delete def.document;
                              delete def.publisher;
                            } else {
                              const idx = lockedIndexes(p).find((i) => i.id === e.target.value)!;
                              def.document = idx.id;
                              def.publisher = idx.publisher;
                            }
                          })
                        }
                      >
                        <option value="">An explanation</option>
                        {sourceIndexes
                          .filter((i) => i.stage === 'adopted')
                          .map((i) => (
                            <option key={i.publisher + i.id} value={i.id}>
                              {i.titles.en}
                            </option>
                          ))}
                      </select>
                    </label>
                    <button
                      disabled={!chosen}
                      onClick={() =>
                        edit((p) => {
                          const n = walk(p.provisions).find((n) => n.id === selected)!;
                          for (const l of activeLanguages(p))
                            (n.content[l] ??= []).push({
                              id: uid(),
                              type: 'definition',
                              definition: d.id,
                              inlines: [],
                            });
                        })
                      }
                    >
                      Insert definition in selected provision
                    </button>
                    <button
                      onClick={() => {
                        if (!focused.current || focused.current.isDestroyed) {
                          setNotice('Place the cursor in a text block first.');
                          return;
                        }
                        focused.current
                          .chain()
                          .focus()
                          .insertContent({
                            type: 'citation',
                            attrs: {
                              value: { text: d.names[focusedLanguage.current] ?? '', term: d.id },
                            },
                          })
                          .run();
                      }}
                    >
                      Insert defined term at cursor
                    </button>
                  </div>
                ))}
                <button
                  className="primary"
                  onClick={() =>
                    edit((p) => {
                      p.definitions.push({
                        id: uid(),
                        names: { en: '', 'zh-Hant': '' },
                        meaning: { en: '', 'zh-Hant': '' },
                      });
                    })
                  }
                >
                  <Icon name="plus-lg" /> Define a name
                </button>
              </>
            )}
            {panel === 'Review' && (
              <>
                <p className="hint">
                  {diagnostics.length
                    ? `${diagnostics.length} checks require attention.`
                    : 'No domain validation issues found.'}{' '}
                  This does not certify the document.
                </p>
                {diagnostics.map((d, i) => (
                  <button
                    className="diagnostic"
                    key={i}
                    onClick={() => {
                      const node = all.find(
                        (n) =>
                          n.id === d.location ||
                          [
                            ...(n.shared ?? []),
                            ...Object.values(n.content).flat(),
                            ...Object.values(n.tail).flat(),
                          ].some((b) => b.id === d.location),
                      );
                      if (node) select(node.id);
                      else openPanel('Document details');
                    }}
                  >
                    <strong>
                      {d.severity === 'error' ? 'Error' : 'Review'}
                      {d.language ? ' · ' + d.language : ''}
                    </strong>
                    <span>{d.message}</span>
                  </button>
                ))}
                {project.amendment && (
                  <div className="hint">
                    This instrument contains {project.amendment.operations.length} amendment
                    operations. Open the Amendments ribbon to compose or review them.
                  </div>
                )}
              </>
            )}
            {panel === 'Insert reference' && (
              <>
                <div className="segmented">
                  <button
                    className={refScope === 'local' ? 'active' : ''}
                    onClick={() => setRefScope('local')}
                  >
                    This document
                  </button>
                  <button
                    className={refScope === 'external' ? 'active' : ''}
                    onClick={() => setRefScope('external')}
                  >
                    Published guides
                  </button>
                </div>
                {refScope === 'external' && (
                  <>
                    <label>
                      Publisher base URL
                      <input
                        type="url"
                        placeholder="https://…/guides/"
                        value={source}
                        onChange={(e) => {
                          setSource(e.target.value);
                          setExternal(null);
                          setCatalogue(null);
                        }}
                      />
                    </label>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={offline}
                        onChange={(e) => setOffline(e.target.checked)}
                      />{' '}
                      Use saved dependencies only
                    </label>
                    <button
                      className="primary"
                      disabled={busy || !source}
                      onClick={() => void connect()}
                    >
                      {busy ? 'Loading…' : 'Load catalogue'}
                    </button>
                    {catalogue && (
                      <label>
                        Guide
                        <select
                          onChange={(e) => void getExternal(e.target.value)}
                          value={external?.id ?? ''}
                        >
                          <option value="" disabled>
                            Select a guide
                          </option>
                          {catalogue.documents.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.titles.en}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {external && (
                      <label>
                        Reference version
                        <select
                          value={refRevision}
                          onChange={(e) => setRefRevision(e.target.value)}
                        >
                          {external.revisions.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.asOf} · {r.kind} · {r.id}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </>
                )}
                <label>
                  Find provision
                  <input
                    value={refSearch}
                    onChange={(e) => setRefSearch(e.target.value)}
                    placeholder="Number or heading"
                  />
                </label>
                <div className="reference-results">
                  {refTargets
                    .filter((t) =>
                      (provisionLabel(t, langs[0]) + ' ' + Object.values(t.heading).join(' '))
                        .toLowerCase()
                        .includes(refSearch.toLowerCase()),
                    )
                    .map((t) => (
                      <button key={t.id} disabled={!editable} onClick={() => insertRef(t.id)}>
                        <strong>
                          {provisionLabel(t, langs[0])}
                          {t.repealed ? ' · repealed' : ''}
                        </strong>
                        <span>{t.heading[langs[0]] ?? t.heading.en}</span>
                      </button>
                    ))}
                </div>
                <p className="hint">
                  Place the cursor in the text, then choose a target. Citation wording is generated
                  by the reference engine. External references retain the selected revision.
                </p>
              </>
            )}
          </aside>
        )}
      </div>
      <footer className="statusbar">
        <span>{project.stage === 'draft' ? 'Draft · Not in force' : 'Read-only source'}</span>
        <button onClick={() => openPanel('Review')}>{diagnostics.length} checks</button>
        <span className="status-notice" role="status">
          {notice}
        </span>
        <label className="zoom">
          Zoom{' '}
          <input
            type="range"
            min="80"
            max="130"
            step="10"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          {zoom}%
        </label>
      </footer>
      {pendingOpen && (
        <div className="modal-scrim">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="replace-title"
            className="replace-dialog"
          >
            <h2 id="replace-title">Open another document?</h2>
            <p>Your current workspace has changes that have not been downloaded.</p>
            <div>
              <button autoFocus onClick={() => setPendingOpen(null)}>
                Keep editing
              </button>
              <button
                onClick={() => {
                  save();
                  replace(pendingOpen.p, pendingOpen.options, true);
                }}
              >
                Download current and continue
              </button>
              <button onClick={() => replace(pendingOpen.p, pendingOpen.options, true)}>
                Continue without download
              </button>
            </div>
          </section>
        </div>
      )}
      <input
        hidden
        ref={baseFile}
        type="file"
        accept=".json"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            if (f.size > 20_000_000) throw new Error('Source exceeds 20 MB.');
            const base = parseProject(await f.text());
            if (base.stage !== 'adopted' || base.role !== 'principal')
              throw new Error('Select an adopted principal source.');
            setAmendmentBase(base);
          } catch (err) {
            setNotice((err as Error).message);
          }
          e.target.value = '';
        }}
      />
      <input
        hidden
        ref={file}
        type="file"
        accept=".json,.xml"
        onChange={(e) => void load(e.target.files?.[0])}
      />
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
