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
  addAttributes: () => ({ value: { default: { text: '' } } }),
  renderHTML: ({ node }) => [
    'span',
    { class: 'citation', title: 'Structured reference; select to replace' },
    node.attrs.value.text || 'Reference',
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
}: {
  value: Inline[];
  label: string;
  editable: boolean;
  onChange: (v: Inline[]) => void;
  onFocus: (e: Editor) => void;
  onNotice: (s: string) => void;
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
    content: toRich(value),
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
    if (editor && canonical(fromRich(editor.getJSON())) !== canonical(value))
      editor.commands.setContent(toRich(value), { emitUpdate: false });
  }, [editor, value]);
  useEffect(() => {
    editor?.setEditable(editable, false);
  }, [editor, editable]);
  return <EditorContent editor={editor} />;
}
