import { useEffect, useRef, useState } from 'react';
import {
  fetchPublication,
  resolvePublished,
  publicationBase,
  type Publication,
  type PublishedSource,
} from '../modules/publication-api.ts';
import { Dialog, Field } from './forms.tsx';
export function ApiAmendmentDialog({
  initialURL = '',
  requiredGuide,
  onClose,
  onCreate,
}: {
  initialURL?: string;
  requiredGuide?: string;
  onClose: () => void;
  onCreate: (source: PublishedSource) => Promise<void>;
}) {
  const [url, setURL] = useState(initialURL),
    [base, setBase] = useState(''),
    [index, setIndex] = useState<Publication | null>(null),
    [selected, setSelected] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const active = useRef(true);
  useEffect(
    () => () => {
      active.current = false;
    },
    [],
  );
  const close = () => {
    active.current = false;
    onClose();
  };
  return (
    <Dialog
      title={requiredGuide ? 'Reconnect amendment source' : 'Create amendment from publication API'}
      onClose={close}
    >
      <p>
        Enter the publication API’s base URL. The current revised Guide and its enacted amendments
        are fetched automatically. No source files need to be downloaded or opened manually.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            const normalized = publicationBase(url),
              result = await fetchPublication(normalized);
            if (!active.current) return;
            setBase(normalized);
            setIndex(result);
            setSelected(requiredGuide ?? result.guides[0]?.id ?? '');
          } catch (e) {
            if (active.current) setError(e instanceof Error ? e.message : String(e));
          } finally {
            if (active.current) setBusy(false);
          }
        }}
      >
        <Field label="Publication API base URL">
          <input
            type="url"
            required
            value={url}
            disabled={busy}
            placeholder="https://…/"
            onChange={(e) => {
              setURL(e.target.value);
              setIndex(null);
              setError('');
            }}
          />
        </Field>
        <button disabled={busy}>{busy ? 'Resolving…' : 'Load Guides'}</button>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {index && (
        <div style={{ margin: '18px 24px' }}>
          {index.guides.length ? (
            <Field label="Guide to amend">
              <select
                value={selected}
                disabled={busy || !!requiredGuide}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setError('');
                }}
              >
                {index.guides.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.titles.en} / {g.titles.zh}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <p>No Guides are published by this API.</p>
          )}
          <p className="hint">
            The source is resolved as at today in Hong Kong. Repealed Guides, drafts and sources not
            yet in effect cannot be amended. The exact resolved source is retained in your project;
            later API updates will not silently change an existing draft.
          </p>
          <div className="dialog-actions">
            <button onClick={close}>Cancel</button>
            <button
              className="primary"
              disabled={busy || !selected || !index.guides.some((g) => g.id === selected)}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  const source = await resolvePublished(base, selected);
                  if (active.current) await onCreate(source);
                } catch (e) {
                  if (active.current) setError(e instanceof Error ? e.message : String(e));
                } finally {
                  if (active.current) setBusy(false);
                }
              }}
            >
              {busy
                ? 'Resolving current text…'
                : requiredGuide
                  ? 'Reconnect exact source'
                  : 'Create amendment draft'}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
