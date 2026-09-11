import { exportXml, importXml } from '../modules/xml.ts';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  newGuide,
  newNode,
  pair,
  formula,
  entries,
  allowed,
  inSchedule,
  names,
  isGroup,
  hasHeading,
  issues,
  numbering,
  insert,
  move,
  remove,
  edit,
  enact,
  serialize,
  id,
  address,
  languages,
  type Guide,
  type Node,
  type Kind,
  type Enactment,
} from '../modules/document.ts';
import {
  revise,
  newAmendment,
  addAction,
  proposed,
  generate,
  recheck,
  enactAmendment,
  operationNames,
  owner,
  type Amendment,
  type Action,
  type Document,
  type Revision,
} from '../modules/amendments.ts';
import { fetchCatalogue, publicCatalogue, type Catalogue } from '../modules/references.ts';
import { render, type Layout } from '../modules/render.ts';
import { Dialog, Field, PairFields, NodeFields, TableFields, Icon } from './forms.tsx';
import { download, parseFile, saveRecovery, recoveryKey, type Workspace } from './storage.ts';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style.css';
const blank = (): Workspace => ({
  format: 'lifehouse-workspace/2',
  document: newGuide(),
  catalogues: [],
});
function App() {
  const [workspace, setWorkspace] = useState<Workspace>(blank),
    [selected, setSelected] = useState('details'),
    [page, setPage] = useState('document'),
    [dialog, setDialog] = useState(''),
    [notice, setNotice] = useState('New draft. Enter both formal titles to begin.'),
    [error, setError] = useState(''),
    [dirty, setDirty] = useState(false),
    [pending, setPending] = useState(false),
    [history, setHistory] = useState<Workspace[]>([]),
    [future, setFuture] = useState<Workspace[]>([]),
    [recovery, setRecovery] = useState(false),
    [layout, setLayout] = useState<Layout>('en'),
    [proof, setProof] = useState(''),
    [proofKind, setProofKind] = useState('instrument');
  const doc = workspace.document,
    base = workspace.source,
    editable = doc.stage === 'draft';
  const [revision, setRevision] = useState<Revision | null>(null),
    [actionError, setActionError] = useState('');
  useEffect(() => {
    setRecovery(!!localStorage.getItem(recoveryKey));
  }, []);
  useEffect(() => {
    let live = true;
    if (doc.type === 'amendment' && base)
      proposed(base, doc)
        .then((r) => {
          if (live) {
            setRevision(r);
            setActionError('');
          }
        })
        .catch((e) => {
          if (live) {
            setRevision(null);
            setActionError(e.message);
          }
        });
    else {
      setRevision(null);
      setActionError('');
    }
    return () => {
      live = false;
    };
  }, [doc, base]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty || pending) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, pending]);
  function report(e: unknown) {
    setError(e instanceof Error ? e.message : String(e));
  }
  function commit(next: Workspace, message = 'Changes saved in this workspace.') {
    setHistory((h) => [...h.slice(-39), workspace]);
    setFuture([]);
    setWorkspace(next);
    setPending(false);
    setDirty(true);
    setError('');
    setNotice(message);
    try {
      saveRecovery(localStorage, next);
      setNotice(message + ' Local recovery updated.');
    } catch {
      setError('Browser recovery could not be saved. Download your project now.');
    }
  }
  function update(next: Document, message?: string) {
    commit({ ...workspace, document: next }, message);
  }
  function canLeave() {
    if (pending) {
      setError('Save or discard the current form before navigating.');
      return false;
    }
    return true;
  }
  function navigate(key: string) {
    if (canLeave()) {
      setSelected(key);
      setPage('document');
      setError('');
    }
  }
  function replace(next: Workspace) {
    setWorkspace(next);
    setHistory([]);
    setFuture([]);
    setSelected('details');
    setPage(next.document.type === 'amendment' ? 'actions' : 'document');
    setDirty(false);
    setPending(false);
    setDialog('');
    setError('');
    setNotice('Project opened.');
  }
  async function openFile(file: File, asSource = false) {
    try {
      const text = await file.text();
      const data = text.trimStart().startsWith('<') ? await importXml(text) : parseFile(text);
      if (asSource) {
        if (data.document.type !== 'guide' || data.document.stage !== 'enacted')
          throw Error('Choose an enacted Guide source.');
        commit({ ...workspace, source: data.document }, 'Source loaded.');
      } else replace(data);
    } catch (e) {
      report(e);
    }
  }
  useEffect(() => {
    if (page !== 'proof') return;
    let current = true;
    setProof('');
    const run = async () => {
      if (doc.type === 'amendment' && proofKind === 'proposed') {
        if (!base) throw Error('Load the principal Guide first.');
        const r = await proposed(base, doc);
        return render(r.guide, {
          layout,
          proposed: true,
          revision: r,
          catalogues: workspace.catalogues,
          iframe: true,
        });
      }
      return render(doc, { layout, catalogues: workspace.catalogues, iframe: true }, base);
    };
    run()
      .then((html) => {
        if (current) {
          setProof(html);
          setError('');
        }
      })
      .catch(report);
    return () => {
      current = false;
    };
  }, [page, doc, base, layout, proofKind, workspace.catalogues]);
  const all = doc.type === 'guide' ? entries(doc.nodes) : [];
  const chosen = all.find((e) => e.node.id === selected);
  const diagnostics = doc.type === 'guide' ? issues(doc) : [];
  function navTab(next: string) {
    if (canLeave()) {
      setPage(next);
      setError('');
    }
  }
  return (
    <>
      <header className="app-header">
        <div className="brand">
          <Icon name="journal-text" />
          <strong>Style Guide Studio</strong>
          <span>香港生命堂 · 夢幻團隊翻譯團隊</span>
        </div>
        <div className="file-actions">
          <button
            onClick={() => {
              if (canLeave()) setDialog('new');
            }}
          >
            <Icon name="file-earmark-plus" /> New
          </button>
          <button
            onClick={() => {
              if (canLeave()) setDialog('open');
            }}
          >
            <Icon name="folder2-open" /> Open
          </button>
          <button
            disabled={pending}
            onClick={() => {
              download((doc.id || 'guide') + '.lhg.json', serialize(workspace));
              setDirty(false);
              setNotice(
                'Project download requested. Includes reference snapshots and the loaded source.',
              );
            }}
          >
            <Icon name="download" /> Download project
          </button>
          <button
            disabled={pending}
            onClick={() =>
              exportXml(workspace, doc.mode === 'zh' ? 'zh' : 'en')
                .then((xml) => download(doc.id + '.xml', xml, 'application/xml'))
                .catch(report)
            }
          >
            Download XML
          </button>
          <button
            disabled={pending || !history.length}
            onClick={() => {
              setFuture((f) => [workspace, ...f]);
              setWorkspace(history.at(-1)!);
              setHistory((h) => h.slice(0, -1));
              setDirty(true);
            }}
            title="Undo saved change"
          >
            <Icon name="arrow-counterclockwise" /> Undo
          </button>
          <button
            disabled={pending || !future.length}
            onClick={() => {
              setHistory((h) => [...h, workspace]);
              setWorkspace(future[0]);
              setFuture((f) => f.slice(1));
              setDirty(true);
            }}
            title="Redo saved change"
          >
            <Icon name="arrow-clockwise" /> Redo
          </button>
        </div>
      </header>
      <div className="document-bar">
        <div>
          <strong>{doc.titles.en || 'Untitled Style Guide'}</strong>
          <span>{doc.titles.zh || '尚未輸入中文名稱'}</span>
        </div>
        <span className={'badge ' + (editable ? 'draft' : 'enacted')}>
          {editable ? 'DRAFT · 草案' : 'ENACTED · 已制定'}
        </span>
      </div>
      <nav className="tabs" aria-label="Workspace">
        <button className={page === 'document' ? 'active' : ''} onClick={() => navTab('document')}>
          Document
        </button>
        {doc.type === 'guide' && doc.stage === 'enacted' && (
          <button
            className={page === 'revisions' ? 'active' : ''}
            onClick={() => navTab('revisions')}
          >
            Revised text
          </button>
        )}
        {doc.type === 'amendment' && (
          <button className={page === 'actions' ? 'active' : ''} onClick={() => navTab('actions')}>
            Amending actions ({doc.actions.length})
          </button>
        )}
        <button className={page === 'checks' ? 'active' : ''} onClick={() => navTab('checks')}>
          Checks {diagnostics.length ? `(${diagnostics.length})` : ''}
        </button>
        <button
          className={page === 'references' ? 'active' : ''}
          onClick={() => navTab('references')}
        >
          References
        </button>
        <button className={page === 'proof' ? 'active' : ''} onClick={() => navTab('proof')}>
          Proof
        </button>
        <div className="spacer" />
        {doc.type === 'guide' && !editable && (
          <button
            onClick={() => {
              if (canLeave())
                newAmendment(doc)
                  .then((a) => {
                    commit(
                      { ...workspace, document: a, source: doc },
                      'New amendment draft created.',
                    );
                    setPage('actions');
                    setSelected('details');
                  })
                  .catch(report);
            }}
          >
            Create amendment
          </button>
        )}
        <button
          onClick={() => {
            if (canLeave()) setDialog('enact');
          }}
        >
          {editable ? 'Enact…' : 'Enactment details'}
        </button>
      </nav>
      {recovery && (
        <div className="recovery">
          A previous workspace is available on this device.{' '}
          <button
            onClick={() => {
              if (canLeave()) setDialog('recover');
            }}
          >
            Recover workspace…
          </button>
          <button onClick={() => setRecovery(false)}>Dismiss</button>
        </div>
      )}
      {error && (
        <div role="alert" className="error">
          <Icon name="exclamation-triangle" /> {error}
          <button onClick={() => setError('')} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}
      <main>
        {page === 'document' && (
          <>
            <aside className="outline">
              <h2>Document structure</h2>
              {[
                ['details', 'Titles & settings'],
                ['opening', 'Long title & preamble'],
                ['formula', 'Enacting formula'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={selected === key ? 'selected' : ''}
                  onClick={() => navigate(key)}
                >
                  {label}
                </button>
              ))}
              <hr />
              {doc.type === 'guide' ? (
                <>
                  <div className="outline-heading">Body & supplementary material</div>
                  <Tree nodes={doc.nodes} selected={selected} select={navigate} />
                  {editable && (
                    <button
                      className="outline-add"
                      onClick={() => {
                        if (canLeave()) setDialog('add');
                      }}
                    >
                      <Icon name="plus-lg" /> Add structure…
                    </button>
                  )}
                </>
              ) : (
                <p className="hint">
                  The body of an amendment is generated from its actions. Open Amending actions to
                  make changes.
                </p>
              )}
            </aside>
            <section className="detail">
              <div className="breadcrumb">
                {doc.type === 'amendment' ? 'Amendment instrument' : 'Principal Guide'} /{' '}
                {chosen
                  ? address(chosen)
                  : selected === 'details'
                    ? 'Titles & settings'
                    : selected === 'opening'
                      ? 'Long title & preamble'
                      : 'Enacting formula'}
              </div>
              {['details', 'opening', 'formula'].includes(selected) ? (
                <DocumentForm
                  key={doc.id + selected + history.length}
                  document={doc}
                  area={selected}
                  onSave={update}
                  onDirty={setPending}
                />
              ) : chosen && doc.type === 'guide' ? (
                <NodeEditor
                  key={chosen.node.id + history.length}
                  node={chosen.node}
                  guide={doc}
                  catalogues={workspace.catalogues}
                  onDirty={setPending}
                  onSave={(n) => {
                    try {
                      update(
                        edit(doc, (g) => {
                          const e = entries(g.nodes).find((e) => e.node.id === n.id)!;
                          e.list[e.list.indexOf(e.node)] = n;
                        }),
                      );
                    } catch (e) {
                      report(e);
                    }
                  }}
                  onSelect={navigate}
                  onAdd={() => {
                    if (canLeave()) setDialog('add');
                  }}
                  onMove={() => {
                    if (canLeave()) setDialog('move');
                  }}
                  onRemove={() => {
                    if (canLeave()) setDialog('remove');
                  }}
                />
              ) : (
                <p>Select an item in the document structure.</p>
              )}
            </section>
          </>
        )}
        {page === 'actions' && doc.type === 'amendment' && (
          <ActionWorkspace
            key={doc.id}
            amendment={doc}
            base={base}
            revision={revision}
            error={actionError}
            onSave={update}
            onLoad={(f) => openFile(f, true)}
            onError={report}
            onDirty={setPending}
            catalogues={workspace.catalogues}
          />
        )}
        {page === 'checks' && (
          <section className="full">
            <h1>Document checks</h1>
            <p>Numbering warnings never change your document or stop you saving a draft.</p>
            {doc.type === 'guide' ? (
              <>
                <p>
                  {diagnostics.filter((i) => i.severity === 'error').length} incomplete content or
                  structure issues · {diagnostics.filter((i) => i.severity === 'warning').length}{' '}
                  numbering warnings
                </p>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Location</th>
                      <th>Finding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnostics.map((d, i) => (
                      <tr key={i}>
                        <td>{d.severity}</td>
                        <td>
                          <button onClick={() => navigate(d.target)}>
                            {all.find((e) => e.node.id === d.target)?.node.label ??
                              'Document details'}
                          </button>
                        </td>
                        <td>{d.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!diagnostics.length && (
                  <p className="success">No content or numbering issues found.</p>
                )}
              </>
            ) : (
              <AmendmentChecks base={base} amendment={doc} />
            )}
          </section>
        )}
        {page === 'revisions' && doc.type === 'guide' && (
          <RevisionWorkspace
            guide={doc}
            instruments={workspace.instruments ?? []}
            catalogues={workspace.catalogues}
            onLoad={(instruments) =>
              commit({ ...workspace, instruments }, 'Enacted instruments loaded.')
            }
            onAmend={async (source) => {
              try {
                const amendment = await newAmendment(source);
                commit(
                  { ...workspace, document: amendment, source, origin: doc },
                  'Amendment created against the selected revised text.',
                );
                setPage('actions');
                setSelected('details');
              } catch (e) {
                report(e);
              }
            }}
            onError={report}
          />
        )}
        {page === 'references' && (
          <References
            document={doc}
            catalogues={workspace.catalogues}
            onChange={(cats) =>
              commit({ ...workspace, catalogues: cats }, 'Reference catalogue saved locally.')
            }
            onSave={update}
            onError={report}
          />
        )}
        {page === 'proof' && (
          <section className="proof">
            <div className="toolbar">
              <strong>Read-only proof</strong>
              <select
                aria-label="Proof language"
                value={layout}
                onChange={(e) => setLayout(e.target.value as Layout)}
              >
                <option value="en">English</option>
                <option value="zh">繁體中文</option>
                {doc.mode === 'parallel' && <option value="parallel">Parallel · landscape</option>}
              </select>
              {doc.type === 'amendment' && (
                <select
                  aria-label="Proof document"
                  value={proofKind}
                  onChange={(e) => setProofKind(e.target.value)}
                >
                  <option value="instrument">Generated amendment instrument</option>
                  <option value="proposed">Proposed principal Guide</option>
                </select>
              )}
              <button
                disabled={!proof}
                onClick={() =>
                  download(
                    doc.id + '-' + layout + '.html',
                    proof.replace('<base href="about:srcdoc">', ''),
                    'text/html',
                  )
                }
              >
                Download HTML
              </button>
              <button
                disabled={!proof}
                onClick={() => {
                  const f = document.getElementById('proof-frame') as HTMLIFrameElement;
                  f.contentWindow?.print();
                }}
              >
                <Icon name="printer" /> Print / Save PDF
              </button>
            </div>
            {proof ? (
              <iframe id="proof-frame" title="Read-only publication proof" srcDoc={proof} />
            ) : (
              <p>Generate a proof by completing the source and action settings above.</p>
            )}
          </section>
        )}
      </main>
      <footer>
        <span>{pending ? 'Unsaved form — Save or Discard before navigating.' : notice}</span>
        <span>
          {dirty ? 'Download recommended' : 'Local workspace'} ·{' '}
          {doc.type === 'guide'
            ? all.length + ' structural items'
            : doc.actions.length + ' actions'}
        </span>
      </footer>
      {dialog === 'new' && (
        <Dialog title="Create a new principal Guide" onClose={() => setDialog('')}>
          <p>
            {dirty
              ? 'Download your current project before replacing this workspace.'
              : 'Both formal titles will be required. You can complete them in Document settings.'}
          </p>
          <div className="dialog-actions">
            <button onClick={() => download(doc.id + '.lhg.json', serialize(workspace))}>
              Download current project
            </button>
            <button onClick={() => setDialog('')}>Cancel</button>
            <button
              className="primary"
              onClick={() => {
                replace(blank());
                setNotice('New blank draft created.');
              }}
            >
              Create blank Guide
            </button>
          </div>
        </Dialog>
      )}
      {dialog === 'open' && (
        <Dialog title="Open a project" onClose={() => setDialog('')}>
          <p>
            Open a new-format project or document JSON file. The discarded product's files are not
            imported.
          </p>
          {dirty && <p className="warning">The current workspace has undownloaded changes.</p>}
          <button onClick={() => download(doc.id + '.lhg.json', serialize(workspace))}>
            Download current project
          </button>
          <Field label="Choose project file">
            <input
              type="file"
              accept=".json,.xml"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) openFile(f);
              }}
            />
          </Field>
        </Dialog>
      )}
      {dialog === 'recover' && (
        <Dialog title="Recover local workspace" onClose={() => setDialog('')}>
          <p>This replaces the current workspace with the last locally saved one.</p>
          <div className="dialog-actions">
            <button onClick={() => download(doc.id + '.lhg.json', serialize(workspace))}>
              Download current project
            </button>
            <button
              onClick={() => {
                try {
                  replace(parseFile(localStorage.getItem(recoveryKey)!));
                  setRecovery(false);
                } catch (e) {
                  report(e);
                  setDialog('');
                }
              }}
            >
              Recover
            </button>
          </div>
        </Dialog>
      )}
      {dialog === 'add' && doc.type === 'guide' && (
        <StructureDialog
          guide={doc}
          chosen={selected}
          mode="add"
          onClose={() => setDialog('')}
          onApply={(parent, at, kind, label) => {
            try {
              const n = newNode(kind, label);
              update(insert(doc, parent, at, n));
              setSelected(n.id);
              setDialog('');
            } catch (e) {
              report(e);
            }
          }}
        />
      )}
      {dialog === 'move' && doc.type === 'guide' && chosen && (
        <StructureDialog
          guide={doc}
          chosen={selected}
          mode="move"
          onClose={() => setDialog('')}
          onApply={(parent, at) => {
            try {
              update(move(doc, selected, parent, at));
              setDialog('');
            } catch (e) {
              report(e);
            }
          }}
        />
      )}
      {dialog === 'remove' && doc.type === 'guide' && chosen && (
        <Dialog title={`Delete ${address(chosen)} from this draft?`} onClose={() => setDialog('')}>
          <p>
            Its child provisions are removed with it. Existing references will be flagged. You can
            Undo this change.
          </p>
          <div className="dialog-actions">
            <button onClick={() => setDialog('')}>Cancel</button>
            <button
              className="danger"
              onClick={() => {
                update(remove(doc, selected));
                setSelected('details');
                setDialog('');
              }}
            >
              Delete provision
            </button>
          </div>
        </Dialog>
      )}
      {dialog === 'enact' && (
        <EnactDialog
          document={doc}
          onClose={() => setDialog('')}
          onSubmit={async (record) => {
            try {
              const next =
                doc.type === 'guide'
                  ? enact(doc, record)
                  : await enactAmendment(
                      base ??
                        (() => {
                          throw Error('Load the enacted source in Amending actions first.');
                        })(),
                      doc,
                      record,
                    );
              update(next, 'Enactment recorded; source is now read-only.');
              setDialog('');
            } catch (e) {
              report(e);
            }
          }}
          onExport={() => download(doc.id + '.json', serialize(doc))}
        />
      )}
    </>
  );
}
function Tree({
  nodes,
  selected,
  select,
  depth = 0,
}: {
  nodes: Node[];
  selected: string;
  select: (id: string) => void;
  depth?: number;
}) {
  return (
    <ul className="tree">
      {nodes.map((n) => (
        <li key={n.id}>
          <button
            style={{ paddingLeft: 12 + depth * 14 }}
            className={selected === n.id ? 'selected' : ''}
            onClick={() => select(n.id)}
          >
            <span>
              {names[n.kind].en} {n.label || '?'}
            </span>
            {n.heading?.en && <small>{n.heading.en}</small>}
          </button>
          <Tree nodes={n.children} selected={selected} select={select} depth={depth + 1} />
        </li>
      ))}
    </ul>
  );
}
function DocumentForm({
  document: doc,
  area,
  onSave,
  onDirty,
}: {
  document: Document;
  area: string;
  onSave: (d: Document) => void;
  onDirty: (d: boolean) => void;
}) {
  const [draft, setDraft] = useState<Document>(structuredClone(doc)),
    [changed, setChanged] = useState(false),
    [unlock, setUnlock] = useState(false);
  function set(fn: (d: Document) => void) {
    const d = structuredClone(draft);
    fn(d);
    setDraft(d);
    setChanged(true);
    onDirty(true);
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
        setChanged(false);
        onDirty(false);
      }}
    >
      <div className="pane-title">
        <h1>
          {area === 'details'
            ? 'Titles & settings'
            : area === 'opening'
              ? 'Long title & preamble'
              : 'Enacting formula'}
        </h1>
        <span>{doc.stage === 'enacted' ? 'Read-only source' : 'Draft settings'}</span>
      </div>
      <fieldset disabled={doc.stage !== 'draft'}>
        {area === 'details' ? (
          <>
            <PairFields
              label="Formal title"
              value={draft.titles}
              onChange={(v) =>
                set((d) => {
                  d.titles = v;
                })
              }
            />
            <Field label="Content languages">
              <select
                value={draft.mode}
                onChange={(e) =>
                  set((d) => {
                    d.mode = e.target.value as Guide['mode'];
                  })
                }
                disabled={doc.type === 'amendment'}
              >
                <option value="en">English</option>
                <option value="zh">繁體中文</option>
                <option value="parallel">English + 繁體中文</option>
              </select>
            </Field>
            <p className="hint">
              Both formal titles are required even for a monolingual Guide. Changing the content
              language keeps existing text.
            </p>
            <details>
              <summary>Permanent document identity</summary>
              <code>{draft.id}</code>
            </details>
            {doc.type === 'amendment' && (
              <div className="field-row">
                <Field label="Citation clause number">
                  <input
                    value={draft.type === 'amendment' ? draft.citationLabel : ''}
                    onChange={(e) =>
                      set((d) => {
                        if (d.type === 'amendment') d.citationLabel = e.target.value;
                      })
                    }
                  />
                </Field>
                <Field label="Introducing amendment clause number">
                  <input
                    value={draft.type === 'amendment' ? draft.introductionLabel : ''}
                    onChange={(e) =>
                      set((d) => {
                        if (d.type === 'amendment') d.introductionLabel = e.target.value;
                      })
                    }
                  />
                </Field>
              </div>
            )}
          </>
        ) : area === 'opening' ? (
          <>
            <PairFields
              label="Long title"
              value={draft.longTitle}
              mode={draft.mode}
              multiline
              onChange={(v) =>
                set((d) => {
                  d.longTitle = v;
                })
              }
            />
            <Field
              label="Preamble format"
              hint="Switching formats retains the other text so it can be restored."
            >
              <select
                value={draft.preamble.mode}
                onChange={(e) =>
                  set((d) => {
                    d.preamble.mode = e.target.value as Guide['preamble']['mode'];
                  })
                }
              >
                <option value="none">No preamble</option>
                <option value="paragraph">One paragraph</option>
                <option value="list">Automatically numbered recital list</option>
              </select>
            </Field>
            {draft.preamble.mode === 'paragraph' && (
              <PairFields
                label="Preamble"
                value={draft.preamble.paragraph}
                mode={draft.mode}
                multiline
                onChange={(v) =>
                  set((d) => {
                    d.preamble.paragraph = v;
                  })
                }
              />
            )}{' '}
            {draft.preamble.mode === 'list' && (
              <>
                {draft.preamble.items.map((item, i) => (
                  <div className="recital" key={i}>
                    <h3>Recital {i + 1}</h3>
                    <PairFields
                      label="Text"
                      mode={draft.mode}
                      value={item}
                      multiline
                      onChange={(v) =>
                        set((d) => {
                          d.preamble.items[i] = v;
                        })
                      }
                    />
                    <div className="toolbar">
                      <button
                        type="button"
                        disabled={!i}
                        onClick={() =>
                          set((d) => {
                            [d.preamble.items[i - 1], d.preamble.items[i]] = [
                              d.preamble.items[i],
                              d.preamble.items[i - 1],
                            ];
                          })
                        }
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          set((d) => {
                            d.preamble.items.splice(i, 1);
                          })
                        }
                      >
                        Remove recital
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    set((d) => {
                      d.preamble.items.push(pair());
                    })
                  }
                >
                  Add numbered recital
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <p>
              The formula is prefilled for the Translation Team. It cannot be targeted by an
              amendment once the Guide is enacted.
            </p>
            <label className="check">
              <input
                type="checkbox"
                checked={unlock}
                onChange={(e) => setUnlock(e.target.checked)}
              />
              Edit draft formula for an exceptional circumstance
            </label>
            <fieldset disabled={!unlock}>
              <PairFields
                label="Enacting formula"
                mode={draft.mode}
                value={draft.formula}
                multiline
                onChange={(v) =>
                  set((d) => {
                    d.formula = v;
                  })
                }
              />
            </fieldset>
          </>
        )}
      </fieldset>
      {doc.stage === 'draft' && (
        <div className="form-actions">
          <button className="primary" disabled={!changed}>
            Save settings
          </button>
          <button
            type="button"
            disabled={!changed}
            onClick={() => {
              setDraft(structuredClone(doc));
              setChanged(false);
              onDirty(false);
            }}
          >
            Discard form changes
          </button>
        </div>
      )}
    </form>
  );
}
function NodeEditor({
  node,
  guide,
  catalogues,
  onSave,
  onDirty,
  onAdd,
  onMove,
  onRemove,
  onSelect,
}: {
  node: Node;
  guide: Guide;
  catalogues: Catalogue[];
  onSave: (n: Node) => void;
  onDirty: (v: boolean) => void;
  onAdd: () => void;
  onMove: () => void;
  onRemove: () => void;
  onSelect: (id: string) => void;
}) {
  const [draft, setDraft] = useState(structuredClone(node)),
    [changed, setChanged] = useState(false);
  const warnings = numbering({ ...guide, nodes: guide.nodes }.nodes).filter(
    (i) => i.target === node.id,
  );
  return (
    <>
      <div className="pane-title">
        <h1>
          {names[node.kind].en} {node.label}
        </h1>
        <span>{names[node.kind].zh}</span>
      </div>
      {warnings.map((i, k) => (
        <p className="warning" key={k}>
          {i.message}
        </p>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(draft);
          setChanged(false);
          onDirty(false);
        }}
      >
        <fieldset disabled={guide.stage !== 'draft'}>
          <NodeFields
            value={draft}
            guide={guide}
            catalogues={catalogues}
            onChange={(n) => {
              setDraft(n);
              setChanged(true);
              onDirty(true);
            }}
          />
        </fieldset>
        {guide.stage === 'draft' && (
          <div className="form-actions">
            <button className="primary" disabled={!changed}>
              Save provision
            </button>
            <button
              type="button"
              disabled={!changed}
              onClick={() => {
                setDraft(structuredClone(node));
                setChanged(false);
                onDirty(false);
              }}
            >
              Discard form changes
            </button>
          </div>
        )}
      </form>
      <section className="child-section">
        <h2>Child provisions</h2>
        {!node.children.length ? (
          <p className="hint">No child provisions.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Number</th>
                <th>Heading</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {node.children.map((c) => (
                <tr key={c.id}>
                  <td>{names[c.kind].en}</td>
                  <td>{c.label}</td>
                  <td>{c.heading?.en ?? '—'}</td>
                  <td>
                    <button onClick={() => onSelect(c.id)}>Open</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {guide.stage === 'draft' && (
          <div className="toolbar">
            <button onClick={onAdd}>Add structure…</button>
            <button onClick={onMove}>Move this provision…</button>
            <button className="danger" onClick={onRemove}>
              Delete this provision…
            </button>
          </div>
        )}
      </section>
    </>
  );
}
function StructureDialog({
  guide,
  chosen,
  mode,
  onClose,
  onApply,
}: {
  guide: Guide;
  chosen: string;
  mode: 'add' | 'move';
  onClose: () => void;
  onApply: (parent: string, at: number, kind: Kind, label: string) => void;
}) {
  const all = entries(guide.nodes),
    entry = all.find((e) => e.node.id === chosen);
  const [parent, setParent] = useState(
      mode === 'move'
        ? (entry?.parent?.id ?? '')
        : entry && allowed(entry.node, inSchedule(entry)).length
          ? entry.node.id
          : (entry?.parent?.id ?? ''),
    ),
    [before, setBefore] = useState(''),
    [kind, setKind] = useState<Kind>(mode === 'move' ? entry!.node.kind : 'section'),
    [label, setLabel] = useState('');
  const parentEntry = all.find((e) => e.node.id === parent),
    choices = allowed(parentEntry?.node, parentEntry ? inSchedule(parentEntry) : false),
    children = (parentEntry?.node.children ?? guide.nodes).filter(
      (n) => mode !== 'move' || n.id !== chosen,
    );
  const validKind = mode === 'move' ? entry!.node.kind : choices.includes(kind) ? kind : choices[0];
  return (
    <Dialog title={mode === 'add' ? 'Add a structural item' : 'Move provision'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onApply(
            parent,
            before ? children.findIndex((n) => n.id === before) : children.length,
            validKind,
            label,
          );
        }}
      >
        <Field label="Destination parent">
          <select
            value={parent}
            onChange={(e) => {
              setParent(e.target.value);
              setBefore('');
            }}
          >
            <option value="">Document root</option>
            {all
              .filter(
                (e) =>
                  allowed(e.node, inSchedule(e)).length &&
                  (mode !== 'move' || !entries([entry!.node]).some((x) => x.node.id === e.node.id)),
              )
              .map((e) => (
                <option key={e.node.id} value={e.node.id}>
                  {address(e)} — {e.node.heading?.en}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Position">
          <select value={before} onChange={(e) => setBefore(e.target.value)}>
            <option value="">At the end of this parent</option>
            {children.map((n) => (
              <option value={n.id} key={n.id}>
                Before {names[n.kind].en} {n.label}
              </option>
            ))}
          </select>
        </Field>
        {mode === 'add' && (
          <>
            <Field label="Structural level">
              <select value={validKind} onChange={(e) => setKind(e.target.value as Kind)}>
                {choices.map((k) => (
                  <option key={k} value={k}>
                    {names[k].en} / {names[k].zh}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Manual number"
              hint="Any number can be saved in a draft. Checks will flag questionable numbering."
            >
              <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} />
            </Field>
          </>
        )}
        <p className="location-summary">
          {mode === 'add' ? 'Add' : 'Move'} {names[validKind].en}{' '}
          {mode === 'add' ? label : entry!.node.label}{' '}
          {before ? `before ${children.find((n) => n.id === before)?.label}` : 'at the end'}, inside{' '}
          {parentEntry ? address(parentEntry) : 'the document root'}.
        </p>
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={!choices.includes(validKind)}>
            {mode === 'add' ? 'Add item' : 'Move provision'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
function EnactDialog({
  document: doc,
  onClose,
  onSubmit,
  onExport,
}: {
  document: Document;
  onClose: () => void;
  onSubmit: (record: Enactment) => void;
  onExport: () => void;
}) {
  const [record, setRecord] = useState<Enactment>(
    doc.enactment ?? {
      date: new Date().toLocaleDateString('en-CA'),
      effective: '',
      authority:
        'Translation Team of the Dream Team of Lifehouse Hong Kong / 香港生命堂夢幻團隊翻譯團隊',
    },
  );
  return (
    <Dialog
      title={doc.stage === 'draft' ? 'Record enactment' : 'Enactment details'}
      onClose={onClose}
    >
      <p>
        Recording enactment makes this source read-only. Only do this after the Translation Team has
        enacted it. This action does not publish or upload the document.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(record);
        }}
      >
        <fieldset disabled={doc.stage === 'enacted'}>
          <Field label="Enacting authority">
            <textarea
              value={record.authority}
              onChange={(e) => setRecord({ ...record, authority: e.target.value })}
            />
          </Field>
          <div className="field-row">
            <Field label="Enactment date">
              <input
                type="date"
                required
                value={record.date}
                onChange={(e) => setRecord({ ...record, date: e.target.value })}
              />
            </Field>
            <Field label="Effective date (Hong Kong)">
              <input
                type="date"
                required
                value={record.effective}
                onChange={(e) => setRecord({ ...record, effective: e.target.value })}
              />
            </Field>
          </div>
        </fieldset>
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
          {doc.stage === 'draft' ? (
            <button className="primary">Record enactment</button>
          ) : (
            <button type="button" onClick={onExport}>
              Download enacted source
            </button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
function ActionWorkspace({
  amendment: a,
  base,
  revision,
  error,
  onSave,
  onLoad,
  onError,
  onDirty,
  catalogues,
}: {
  amendment: Amendment;
  base?: Guide;
  revision: Revision | null;
  error: string;
  onSave: (d: Document) => void;
  onLoad: (f: File) => void;
  onError: (e: unknown) => void;
  onDirty: (b: boolean) => void;
  catalogues: Catalogue[];
}) {
  const [formDirty, setFormDirty] = useState(false);
  const markDirty = (b: boolean) => {
    setFormDirty(b);
    onDirty(b);
  };
  const [selected, setSelected] = useState(''),
    [adding, setAdding] = useState(false),
    [before, setBefore] = useState<Guide | null>(null),
    [clauses, setClauses] = useState<any[]>([]);
  useEffect(() => {
    if (!base) return;
    let live = true;
    const index = a.actions.findIndex((x) => x.id === selected);
    proposed(base, { ...a, actions: index < 0 ? a.actions : a.actions.slice(0, index) })
      .then((r) => {
        if (live) setBefore(r.guide);
      })
      .catch(() => {
        if (live) setBefore(null);
      });
    generate(base, a)
      .then((c) => {
        if (live) setClauses(c);
      })
      .catch(() => setClauses([]));
    return () => {
      live = false;
    };
  }, [base, a, selected]);
  const action = a.actions.find((x) => x.id === selected);
  return (
    <section className="full actions-page">
      <h1>Amending actions</h1>
      <p>
        Source: <strong>{a.source.titles.en}</strong> · {a.source.titles.zh}
      </p>
      {!base ? (
        <Field label="Load the exact enacted source">
          <input
            type="file"
            accept=".json,.xml"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onLoad(f);
            }}
          />
        </Field>
      ) : (
        <>
          <div className="toolbar">
            <span className={error ? 'warning' : 'success'}>
              {error || 'Exact source loaded. Changes are proposed, not in effect.'}
            </span>
            {a.stage === 'draft' && (
              <>
                <button
                  onClick={() => {
                    setSelected('');
                    setAdding(true);
                  }}
                  disabled={!revision || formDirty}
                >
                  <Icon name="plus-lg" /> Add action
                </button>
                <button
                  disabled={formDirty}
                  onClick={() =>
                    recheck(base, a)
                      .then((d) => onSave(d))
                      .catch(onError)
                  }
                >
                  Review & recheck sequence
                </button>
              </>
            )}
          </div>
          <p className="hint">
            Generated provisions cannot be edited. Change an action's settings or replacement
            content. Rechecking explicitly accepts the changed intermediate text after earlier
            actions.
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Clause / subclause</th>
                <th>Action</th>
                <th>Target</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {a.actions.map((op, i) => (
                <tr key={op.id}>
                  <td>{i + 1}</td>
                  <td>
                    {op.clause}
                    {op.subclause ? `(${op.subclause})` : ''}
                  </td>
                  <td>{operationNames[op.type]}</td>
                  <td>
                    {entries(revision?.guide.nodes ?? base.nodes).find(
                      (e) => e.node.id === op.target,
                    )?.node.label ?? 'Whole Guide'}
                  </td>
                  <td>
                    <button
                      disabled={formDirty}
                      onClick={() => {
                        setSelected(op.id);
                        setAdding(false);
                      }}
                    >
                      Open
                    </button>
                    {a.stage === 'draft' && (
                      <>
                        <button
                          disabled={!i || formDirty}
                          onClick={() => {
                            const copy = structuredClone(a);
                            [copy.actions[i - 1], copy.actions[i]] = [
                              copy.actions[i],
                              copy.actions[i - 1],
                            ];
                            onSave(copy);
                          }}
                        >
                          Up
                        </button>
                        <button
                          disabled={formDirty}
                          onClick={() => {
                            onSave({ ...a, actions: a.actions.filter((x) => x.id !== op.id) });
                            setSelected('');
                          }}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(adding || action) && before && (
            <ActionForm
              key={action?.id ?? 'new-' + a.actions.length}
              guide={before}
              action={action}
              amendment={a}
              catalogues={catalogues}
              onCancel={() => {
                setAdding(false);
                setSelected('');
                markDirty(false);
              }}
              onDirty={markDirty}
              onSave={async (input) => {
                try {
                  let next: Amendment;
                  if (action) {
                    next = {
                      ...a,
                      actions: a.actions.map((op) =>
                        op.id === action.id
                          ? { ...input, id: action.id, expected: action.expected }
                          : op,
                      ),
                    };
                  } else next = await addAction(base, a, input);
                  onSave(next);
                  setAdding(false);
                  setSelected('');
                  markDirty(false);
                } catch (e) {
                  onError(e);
                }
              }}
            />
          )}
          {(adding || action) && !before && (
            <p className="error">
              Resolve or recheck the preceding actions before editing this action.
            </p>
          )}
          <h2>Generated clauses — read-only</h2>
          {clauses.map((c) => (
            <div className="generated" key={c.id}>
              <strong>
                {c.label}. {c.heading.en}
              </strong>
              <p>{c.heading.zh}</p>
              {c.items.map((i: any, k: number) => (
                <div className="paired-fields two" key={k}>
                  <pre>
                    {c.items.length > 1 ? `(${i.label}) ` : ''}
                    {i.text.en}
                  </pre>
                  <pre>
                    {c.items.length > 1 ? `(${i.label}) ` : ''}
                    {i.text.zh}
                  </pre>
                </div>
              ))}
              <small>Full replacement quotations appear in Proof.</small>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
function ActionForm({
  guide,
  action,
  amendment,
  catalogues,
  onSave,
  onCancel,
  onDirty,
}: {
  guide: Guide;
  action?: Action;
  amendment: Amendment;
  catalogues: Catalogue[];
  onSave: (a: Omit<Action, 'id' | 'expected'>) => void;
  onCancel: () => void;
  onDirty: (v: boolean) => void;
}) {
  const [draft, setDraft] = useState<Omit<Action, 'id' | 'expected'>>(() =>
    action
      ? structuredClone(action)
      : { type: 'insert-provision', target: '', clause: '', subclause: '', position: 'after' },
  );
  const [changed, setChanged] = useState(false);
  const all = entries(guide.nodes).filter((e) => ![...e.ancestors, e.node].some((n) => n.repealed)),
    target = all.find((e) => e.node.id === draft.target);
  function set(d: typeof draft) {
    setDraft(d);
    setChanged(true);
    onDirty(true);
  }
  function selectTarget(targetId: string, type = draft.type) {
    const e = all.find((e) => e.node.id === targetId);
    const next: typeof draft = {
      type,
      target: targetId,
      clause: draft.clause,
      subclause: draft.subclause,
      position: 'after',
    };
    if (type === 'insert-provision' && e) next.node = newNode(e.node.kind, '');
    if (type === 'replace-provision' && e) next.node = structuredClone(e.node);
    if (type === 'replace-heading') next.heading = { ...(e?.node.heading ?? pair()) };
    if (type === 'replace-text') next.language = languages(guide)[0];
    if (type === 'repeal-guide') next.target = guide.id;
    set(next);
  }
  const child = draft.position === 'first' || draft.position === 'last';
  const kinds = target
    ? allowed(
        child ? target.node : target.parent,
        child
          ? inSchedule(target)
          : target.ancestors.some((n) => ['schedule', 'appendix'].includes(n.kind)),
      )
    : [];
  return (
    <form
      className="action-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
    >
      <h2>{action ? 'Edit action' : 'New action'}</h2>
      <fieldset disabled={amendment.stage === 'enacted'}>
        <div className="field-row">
          <Field label="Operation">
            <select
              value={draft.type}
              onChange={(e) => selectTarget('', e.target.value as Action['type'])}
            >
              {Object.entries(operationNames).map(([key, name]) => (
                <option value={key} key={key}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          {draft.type !== 'repeal-guide' && (
            <Field label="Target provision">
              <select value={draft.target} required onChange={(e) => selectTarget(e.target.value)}>
                <option value="">Select a target</option>
                {all
                  .filter((e) => draft.type !== 'replace-heading' || hasHeading(e.node.kind))
                  .map((e) => (
                    <option key={e.node.id} value={e.node.id}>
                      {address(e)} — {e.node.heading?.en}
                    </option>
                  ))}
              </select>
            </Field>
          )}
        </div>
        <div className="field-row">
          <Field
            label="Amending clause number"
            hint="Use the same number for actions grouped under the same section."
          >
            <input
              value={draft.clause}
              onChange={(e) => set({ ...draft, clause: e.target.value })}
            />
          </Field>
          <Field
            label="Subclause number"
            hint="Used when more than one action is grouped in a clause."
          >
            <input
              value={draft.subclause}
              onChange={(e) => set({ ...draft, subclause: e.target.value })}
            />
          </Field>
        </div>
        {draft.type === 'repeal-guide' && (
          <p className="warning">
            This action repeals the entire Guide, including all Schedules. It takes effect only when
            the amendment is enacted and its effective date arrives.
          </p>
        )}
        {draft.type === 'insert-provision' && target && (
          <div className="field-row">
            <Field label="Insert position">
              <select
                value={draft.position}
                onChange={(e) => {
                  const position = e.target.value as Action['position'];
                  const child = position === 'first' || position === 'last';
                  const ks = allowed(
                    child ? target.node : target.parent,
                    child
                      ? inSchedule(target)
                      : target.ancestors.some((n) => ['schedule', 'appendix'].includes(n.kind)),
                  );
                  set({
                    ...draft,
                    position,
                    node: ks.includes(draft.node!.kind) ? draft.node : newNode(ks[0], ''),
                  });
                }}
              >
                <option value="before">Before target</option>
                <option value="after">After target</option>
                {allowed(target.node, inSchedule(target)).length > 0 && (
                  <>
                    <option value="first">First child of target</option>
                    <option value="last">Last child of target</option>
                  </>
                )}
              </select>
            </Field>
            <Field label="New provision level">
              <select
                value={draft.node?.kind}
                onChange={(e) =>
                  set({ ...draft, node: newNode(e.target.value as Kind, draft.node?.label ?? '') })
                }
              >
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {names[k].en} / {names[k].zh}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
        {['insert-provision', 'replace-provision'].includes(draft.type) && draft.node && (
          <PayloadEditor
            key={draft.node.id}
            value={draft.node}
            guide={guide}
            catalogues={catalogues}
            lockIdentity={draft.type === 'replace-provision'}
            onChange={(node) => set({ ...draft, node })}
          />
        )}
        {draft.type === 'replace-heading' && target && (
          <PairFields
            label="Replacement heading"
            mode={guide.mode}
            value={draft.heading ?? pair()}
            onChange={(heading) => set({ ...draft, heading })}
          />
        )}
        {['replace-text', 'replace-table'].includes(draft.type) && target && (
          <Field label={draft.type === 'replace-table' ? 'Target table' : 'Target text block'}>
            <select
              required
              value={draft.block ?? ''}
              onChange={(e) => {
                const b = target.node.blocks!.find((b) => b.id === e.target.value);
                set({
                  ...draft,
                  block: e.target.value,
                  ...(b?.type === 'table'
                    ? {
                        table: {
                          caption: { ...b.caption },
                          numbered: b.numbered,
                          rows: structuredClone(b.rows),
                        },
                      }
                    : {}),
                });
              }}
            >
              <option value="">Select block</option>
              {target.node.blocks
                ?.filter((b) =>
                  draft.type === 'replace-table' ? b.type === 'table' : b.type !== 'table',
                )
                .map((b, i) => (
                  <option key={b.id} value={b.id}>
                    {i + 1}.{' '}
                    {b.type === 'table'
                      ? b.caption.en || 'Table'
                      : b.text.en.slice(0, 70) || b.text.zh.slice(0, 40)}
                  </option>
                ))}
            </select>
          </Field>
        )}
        {draft.type === 'replace-text' && draft.block && (
          <>
            <Field label="Text language">
              <select
                value={draft.language}
                onChange={(e) => set({ ...draft, language: e.target.value as 'en' | 'zh' })}
              >
                {languages(guide).map((l) => (
                  <option value={l} key={l}>
                    {l === 'en' ? 'English' : '繁體中文'}
                  </option>
                ))}
              </select>
            </Field>
            <div className="field-row">
              <Field
                label="Exact existing text"
                hint="Must occur exactly once in the selected block."
              >
                <textarea
                  required
                  value={draft.find ?? ''}
                  onChange={(e) => set({ ...draft, find: e.target.value })}
                />
              </Field>
              <Field label="Replacement text">
                <textarea
                  value={draft.replacement ?? ''}
                  onChange={(e) => set({ ...draft, replacement: e.target.value })}
                />
              </Field>
            </div>
          </>
        )}
        {draft.type === 'replace-table' && draft.table && (
          <TableFields value={draft.table} onChange={(table) => set({ ...draft, table })} />
        )}
      </fieldset>
      <div className="form-actions">
        {amendment.stage === 'draft' && (
          <button className="primary" disabled={!changed || !draft.target}>
            {action ? 'Save action' : 'Add checked action'}
          </button>
        )}
        <button type="button" onClick={onCancel}>
          {amendment.stage === 'draft' ? 'Discard / close' : 'Close'}
        </button>
      </div>
    </form>
  );
}
function PayloadEditor({
  value,
  guide,
  catalogues,
  onChange,
  lockIdentity,
}: {
  value: Node;
  guide: Guide;
  catalogues: Catalogue[];
  onChange: (n: Node) => void;
  lockIdentity: boolean;
}) {
  const [selected, setSelected] = useState(value.id),
    [adding, setAdding] = useState(false),
    [kind, setKind] = useState<Kind>('section'),
    [label, setLabel] = useState('');
  const e = entries([value]).find((e) => e.node.id === selected) ?? entries([value])[0];
  const schedule =
    guide.nodes.some(
      (n) =>
        ['schedule', 'appendix'].includes(n.kind) &&
        entries([n]).some((x) => x.node.id === value.id),
    ) || inSchedule(e);
  const choices = allowed(e.node, schedule);
  return (
    <section className="payload">
      <h3>Replacement / inserted structure</h3>
      <select
        aria-label="Payload provision"
        value={e.node.id}
        onChange={(ev) => setSelected(ev.target.value)}
      >
        {entries([value]).map((e) => (
          <option key={e.node.id} value={e.node.id}>
            {names[e.node.kind].en} {e.node.label} — {e.node.heading?.en}
          </option>
        ))}
      </select>
      <NodeFields
        value={e.node}
        guide={guide}
        catalogues={catalogues}
        lockIdentity={lockIdentity && e.node.id === value.id}
        onChange={(n) => {
          const copy = structuredClone(value);
          if (n.id === copy.id) onChange(n);
          else {
            const target = entries([copy]).find((e) => e.node.id === n.id)!;
            target.list[target.list.indexOf(target.node)] = n;
            onChange(copy);
          }
        }}
      />
      <div className="toolbar">
        <button
          type="button"
          disabled={!choices.length}
          onClick={() => {
            setKind(choices[0]);
            setAdding(true);
          }}
        >
          Add child to this payload…
        </button>
        {e.node.id !== value.id && (
          <button
            type="button"
            onClick={() => {
              const copy = structuredClone(value),
                t = entries([copy]).find((x) => x.node.id === e.node.id)!;
              t.list.splice(t.list.indexOf(t.node), 1);
              onChange(copy);
              setSelected(value.id);
            }}
          >
            Remove payload child
          </button>
        )}
      </div>
      {adding && (
        <div className="payload-add">
          <Field label={`New child inside ${names[e.node.kind].en} ${e.node.label}`}>
            <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              {choices.map((k) => (
                <option value={k} key={k}>
                  {names[k].en}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Manual number">
            <input value={label} onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <button
            type="button"
            onClick={() => {
              const copy = structuredClone(value),
                t = entries([copy]).find((x) => x.node.id === e.node.id)!,
                n = newNode(kind, label);
              t.node.children.push(n);
              onChange(copy);
              setSelected(n.id);
              setAdding(false);
              setLabel('');
            }}
          >
            Add child
          </button>
          <button type="button" onClick={() => setAdding(false)}>
            Cancel
          </button>
        </div>
      )}
    </section>
  );
}
function AmendmentChecks({ base, amendment: a }: { base?: Guide; amendment: Amendment }) {
  const [result, setResult] = useState('Checking…');
  useEffect(() => {
    if (!base) {
      setResult('Load the enacted source in Amending actions.');
      return;
    }
    generate(base, a)
      .then(async (cs) => {
        const r = await proposed(base, a);
        const warnings = numbering(cs.map((c) => ({ ...newNode('section', c.label), id: c.id })));
        setResult(
          `Action sequence and generated clauses are consistent. ${warnings.length} numbering warnings. ${r.repealed ? 'Proposed result: whole Guide repealed.' : `${issues(r.guide).length} issues in the proposed Guide.`}\n${warnings.map((w) => `${cs.find((c) => c.id === w.target)?.label ?? w.target}: ${w.message}`).join('\n')}\n${(r.repealed ? [] : issues(r.guide)).map((w) => `${entries(r.guide.nodes).find((e) => e.node.id === w.target)?.node.label ?? 'Document'}: ${w.message}`).join('\n')}`,
        );
      })
      .catch((e) => setResult(e.message));
  }, [base, a]);
  return <p style={{ whiteSpace: 'pre-line' }}>{result}</p>;
}
function References({
  document: doc,
  catalogues,
  onChange,
  onSave,
  onError,
}: {
  document: Document;
  catalogues: Catalogue[];
  onChange: (c: Catalogue[]) => void;
  onSave: (d: Document) => void;
  onError: (e: unknown) => void;
}) {
  const [url, setUrl] = useState(''),
    [busy, setBusy] = useState(false),
    [aliasId, setAliasId] = useState(''),
    [alias, setAlias] = useState(pair());
  return (
    <section className="full">
      <h1>Published references & short names</h1>
      <p>
        Enter the publication website's base URL. Only its static reference catalogue is downloaded.
        Saved catalogues work offline and travel with the project.
      </p>
      <form
        className="inline-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const c = await fetchCatalogue(url);
            onChange([
              ...catalogues.filter(
                (old) => !old.documents.some((d) => c.documents.some((n) => n.id === d.id)),
              ),
              c,
            ]);
          } catch (e) {
            onError(e);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Publication base URL">
          <input
            type="url"
            required
            placeholder="https://…/"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </Field>
        <button className="primary" disabled={busy}>
          {busy ? 'Loading…' : 'Load catalogue'}
        </button>
      </form>
      <table className="data-table">
        <thead>
          <tr>
            <th>Published document</th>
            <th>Revision</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {catalogues
            .flatMap((c) => c.documents)
            .map((d) => (
              <tr key={d.id}>
                <td>
                  {d.titles.en}
                  <br />
                  {d.titles.zh}
                </td>
                <td>{d.revision.slice(0, 16)}</td>
                <td>{d.status}</td>
              </tr>
            ))}
        </tbody>
      </table>
      <h2>Defined document names</h2>
      <p>These names are used in generated reference text. Ordinary typed text is unchanged.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...doc, aliases: { ...doc.aliases, [aliasId]: alias } });
        }}
      >
        <fieldset disabled={doc.stage === 'enacted'}>
          <Field label="Document">
            <select
              required
              value={aliasId}
              onChange={(e) => {
                setAliasId(e.target.value);
                setAlias(doc.aliases[e.target.value] ?? pair());
              }}
            >
              <option value="">Select published document</option>
              {catalogues
                .flatMap((c) => c.documents)
                .map((d) => (
                  <option value={d.id} key={d.id}>
                    {d.titles.en}
                  </option>
                ))}
            </select>
          </Field>
          <PairFields label="Short name" value={alias} onChange={setAlias} />
          <button className="primary" disabled={!aliasId}>
            Save defined name
          </button>
        </fieldset>
      </form>
    </section>
  );
}
function RevisionWorkspace({
  guide,
  instruments,
  catalogues,
  onLoad,
  onAmend,
  onError,
}: {
  guide: Guide;
  instruments: Amendment[];
  catalogues: Catalogue[];
  onLoad: (a: Amendment[]) => void;
  onAmend: (g: Guide) => void;
  onError: (e: unknown) => void;
}) {
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA')),
    [result, setResult] = useState<Revision | null>(null),
    [html, setHtml] = useState(''),
    [error, setError] = useState(''),
    [layout, setLayout] = useState<Layout>(guide.mode);
  useEffect(() => {
    let live = true;
    revise(guide, instruments, date)
      .then(async (r) => {
        const html = await render(r.guide, { layout, revision: r, catalogues, iframe: true });
        if (live) {
          setResult(r);
          setHtml(html);
          setError('');
        }
      })
      .catch((e) => {
        if (live) {
          setError(e.message);
          setResult(null);
          setHtml('');
        }
      });
    return () => {
      live = false;
    };
  }, [guide, instruments, date, layout, catalogues]);
  return (
    <section className="full">
      <h1>Revised text</h1>
      <p>
        The original source stays unchanged. Load the enacted amendment instruments to calculate the
        text for a date. Same-date instruments are applied in the listed order and must match their
        exact preceding source.
      </p>
      <div className="field-row">
        <Field label="View as at (Hong Kong)">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Load enacted amendment files">
          <input
            type="file"
            accept=".json,.xml"
            multiple
            onChange={async (e) => {
              try {
                const files = [...(e.target.files ?? [])];
                const additions: Amendment[] = [];
                for (const f of files) {
                  const text = await f.text();
                  const w = text.trimStart().startsWith('<')
                    ? await importXml(text)
                    : parseFile(text);
                  if (w.document.type !== 'amendment' || w.document.stage !== 'enacted')
                    throw Error('Choose enacted amendment instruments.');
                  additions.push(w.document);
                }
                onLoad([...instruments, ...additions]);
              } catch (e) {
                onError(e);
              }
            }}
          />
        </Field>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Instrument</th>
            <th>Effective date</th>
            <th>Order</th>
          </tr>
        </thead>
        <tbody>
          {instruments.map((a, i) => (
            <tr key={a.id + '-' + i}>
              <td>{a.titles.en}</td>
              <td>{a.enactment?.effective}</td>
              <td>
                <button
                  disabled={!i}
                  onClick={() => {
                    const next = [...instruments];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    onLoad(next);
                  }}
                >
                  Up
                </button>
                <button onClick={() => onLoad(instruments.filter((_, j) => i !== j))}>
                  Remove from view
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && <p className="error">{error}</p>}
      <div className="toolbar">
        <select
          aria-label="Revision language"
          value={layout}
          onChange={(e) => setLayout(e.target.value as Layout)}
        >
          <option value="en">English</option>
          <option value="zh">繁體中文</option>
          {guide.mode === 'parallel' && <option value="parallel">Parallel</option>}
        </select>
        <button
          disabled={!result || result.repealed || date < (guide.enactment?.effective ?? '')}
          onClick={() => onAmend(result!.guide)}
        >
          Create amendment against this revision
        </button>
        <span>
          {result?.repealed
            ? 'Whole Guide repealed'
            : date < (guide.enactment?.effective ?? '')
              ? 'Not yet effective'
              : result
                ? 'Effective revision'
                : ''}
        </span>
      </div>
      {html && (
        <iframe
          title="Revised text proof"
          srcDoc={html}
          style={{ width: '100%', height: '65vh', border: '1px solid #becad2' }}
        />
      )}
    </section>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
