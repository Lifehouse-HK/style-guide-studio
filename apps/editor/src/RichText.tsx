import { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Node, Mark, type Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { canonical, type Inline } from '../../../packages/domain/src/index.ts';
import { fromRich, toRich } from './model.ts';
const Citation = Node.create({
  name: 'citation',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes: () => ({ value: { default: { text: '' } }, label: { default: '' } }),
  renderHTML: ({ node }) => [
    'span',
    { class: 'citation', title: 'Structured reference; select to replace' },
    node.attrs.label || node.attrs.value.text || 'Reference',
  ],
});
const Sup = Mark.create({ name: 'superscript', renderHTML: () => ['sup', 0] });
const Sub = Mark.create({ name: 'subscript', renderHTML: () => ['sub', 0] });
export function RichText({
  value,
  label,
  editable,
  onChange,
  onFocus,
  onNotice,
  resolveLabel,
}: {
  value: Inline[];
  label: string;
  editable: boolean;
  onChange: (v: Inline[]) => void;
  onFocus: (e: Editor) => void;
  onNotice: (s: string) => void;
  resolveLabel?: (i: Inline) => string;
}) {
  const callbacks = useRef({ onChange, onFocus, onNotice });
  callbacks.current = { onChange, onFocus, onNotice };
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
        underline: false,
        strike: false,
        undoRedo: false,
      }),
      Citation,
      Sup,
      Sub,
    ],
    content: toRich(value, resolveLabel),
    editable,
    enableInputRules: false,
    enablePasteRules: false,
    editorProps: {
      attributes: { 'aria-label': label, role: 'textbox', 'aria-multiline': 'true' },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData('text/plain');
        if (text === undefined) return true;
        event.preventDefault();
        editor?.commands.insertContent(
          text
            .split('\n')
            .flatMap((s, i) => [
              ...(i ? [{ type: 'hardBreak' }] : []),
              ...(s ? [{ type: 'text', text: s }] : []),
            ]),
        );
        callbacks.current.onNotice('Pasted plain text. Source formatting was not imported.');
        return true;
      },
    },
    onUpdate: ({ editor }) => callbacks.current.onChange(fromRich(editor.getJSON())),
    onFocus: ({ editor }) => callbacks.current.onFocus(editor),
  });
  useEffect(() => {
    if (editor && !editor.view.composing) {
      const desired = toRich(value, resolveLabel);
      const current = fromRich(editor.getJSON());
      const labelsChanged = (editor.getJSON().content?.[0]?.content ?? []).some(
        (n) =>
          n.type === 'citation' &&
          'attrs' in n &&
          resolveLabel &&
          n.attrs?.label !== resolveLabel(n.attrs!.value),
      );
      if (canonical(current) !== canonical(value) || labelsChanged)
        editor.commands.setContent(desired, { emitUpdate: false });
    }
  }, [editor, value, resolveLabel]);
  useEffect(() => {
    editor?.setEditable(editable, false);
  }, [editor, editable]);
  return <EditorContent editor={editor} />;
}
