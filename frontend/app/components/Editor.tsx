import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

interface EditorProps {
  content: any;
  onChange: (content: any) => void;
}

export default function Editor({ content, onChange }: EditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content || {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
        },
      ],
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return <EditorContent editor={editor} />;
}
