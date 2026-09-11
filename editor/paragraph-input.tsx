import { useEffect, useLayoutEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Schema, Slice, type Node as DocNode } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { baseKeymap } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { history, undo, redo } from 'prosemirror-history';
import type { Alignment } from '../modules/text-formatting.ts';
import 'prosemirror-view/style/prosemirror.css';

const schema = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: {
      content: 'text*',
      group: 'block',
      attrs: { align: { default: 'left' } },
      toDOM(node) {
        return ['p', { style: `text-align:${node.attrs.align}` }, 0];
      },
      parseDOM: [{ tag: 'p', getAttrs: () => ({ align: 'left' }) }],
    },
    text: { group: 'inline' },
  },
});
function makeDoc(value: string, align: Alignment[]) {
  return schema.node(
    'doc',
    null,
    value
      .split('\n')
      .map((text, i) =>
        schema.node(
          'paragraph',
          { align: align[i] ?? 'left' },
          text ? schema.text(text) : undefined,
        ),
      ),
  );
}
function read(doc: DocNode) {
  const lines: string[] = [],
    align: Alignment[] = [];
  doc.forEach((p) => {
    lines.push(p.textContent);
    align.push(p.attrs.align);
  });
  return { value: lines.join('\n'), align };
}
// The source has one newline per paragraph; ProseMirror has two boundary tokens.
function toOffset(doc: DocNode, pos: number) {
  let offset = 0,
    result = 0;
  doc.forEach((p, start) => {
    if (pos >= start + 1) {
      result = offset + Math.min(p.content.size, pos - start - 1);
    }
    offset += p.textContent.length + 1;
  });
  return result;
}
function toPosition(doc: DocNode, offset: number) {
  let remaining = Math.max(0, offset),
    result = doc.content.size - 1,
    found = false;
  doc.forEach((p, start) => {
    if (found) return;
    if (remaining <= p.content.size) {
      result = start + 1 + remaining;
      found = true;
    } else remaining -= p.content.size + 1;
  });
  return result;
}
export type ParagraphInputHandle = {
  selection: () => [number, number];
  select: (start: number, end: number) => void;
};
/** A plain-text source field with paragraph alignment, not a page-layout editor. */
export const ParagraphInput = forwardRef<
  ParagraphInputHandle,
  {
    label: string;
    value: string;
    align: Alignment[];
    onChange: (value: string, align: Alignment[]) => void;
    onSelection: (range: [number, number]) => void;
  }
>(function ParagraphInput(props, ref) {
  const host = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null),
    latest = useRef(props);
  latest.current = props;
  const selected = useRef<[number, number]>([0, 0]);
  useImperativeHandle(
    ref,
    () => ({
      selection: () => selected.current,
      select: (start, end) => {
        const v = view.current;
        if (!v) return;
        v.dispatch(
          v.state.tr.setSelection(
            TextSelection.create(
              v.state.doc,
              toPosition(v.state.doc, start),
              toPosition(v.state.doc, end),
            ),
          ),
        );
        v.focus();
      },
    }),
    [],
  );
  useEffect(() => {
    const v = new EditorView(host.current!, {
      state: EditorState.create({
        schema,
        doc: makeDoc(latest.current.value, latest.current.align),
        plugins: [
          history(),
          keymap({ 'Mod-z': undo, 'Mod-Shift-z': redo, 'Mod-y': redo }),
          keymap(baseKeymap),
        ],
      }),
      attributes: {
        role: 'textbox',
        'aria-label': latest.current.label,
        'aria-multiline': 'true',
        class: 'paragraph-input',
      },
      editable: () => !host.current?.closest('fieldset[disabled]'),
      // Pasted rich HTML must never introduce hidden formatting into the source.
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain');
        if (text === undefined) return false;
        event.preventDefault();
        const doc = makeDoc(text.replace(/\r\n?/g, '\n'), []);
        view.dispatch(
          view.state.tr.replaceSelection(new Slice(doc.content, 1, 1)).scrollIntoView(),
        );
        return true;
      },
      dispatchTransaction(tr) {
        const next = v.state.apply(tr);
        v.updateState(next);
        selected.current = [
          toOffset(next.doc, next.selection.from),
          toOffset(next.doc, next.selection.to),
        ];
        latest.current.onSelection(selected.current);
        if (tr.docChanged && !tr.getMeta('controlled')) {
          const data = read(next.doc);
          latest.current.onChange(data.value, data.align);
        }
      },
    });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
  }, []);
  useLayoutEffect(() => {
    const v = view.current;
    if (!v) return;
    const next = makeDoc(props.value, props.align);
    if (v.state.doc.eq(next)) return;
    const [start, end] = selected.current;
    let tr = v.state.tr;
    if (read(v.state.doc).value === props.value) {
      let i = 0;
      v.state.doc.forEach((p, pos) => {
        const align = props.align[i++] ?? 'left';
        if (p.attrs.align !== align) tr = tr.setNodeMarkup(pos, undefined, { align });
      });
    } else tr = tr.replaceWith(0, v.state.doc.content.size, next.content);
    tr.setSelection(
      TextSelection.create(tr.doc, toPosition(tr.doc, start), toPosition(tr.doc, end)),
    );
    v.dispatch(tr.setMeta('controlled', true));
  }, [props.value, props.align]);
  return <div ref={host} />;
});
