"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, Color, FontSize } from "@tiptap/extension-text-style";
import { TableKit } from "@tiptap/extension-table";
import { TrashIcon } from "@heroicons/react/24/outline";
import { LINK_DRAG_TYPE } from "./DraggableCard";

export interface RichTextData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  content: string;
}

const GRID = 10;
const MIN_WIDTH = 260;
const MIN_HEIGHT = 180;
const SAVE_DEBOUNCE_MS = 600;

const FONT_SIZES = ["12px", "14px", "16px", "18px", "24px", "32px"];

const snap = (value: number) => Math.round(value / GRID) * GRID;

type Props = {
  note: RichTextData;
  onUpdate: (note: RichTextData, persist: boolean) => void;
  onDelete: (id: string) => void;
  bringToFront: () => number;
};

export default function DraggableRichText({
  note,
  onUpdate,
  onDelete,
  bringToFront,
}: Props) {
  const noteRef = useRef(note);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      TextStyle,
      Color,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TableKit.configure({ table: { resizable: true } }),
    ],
    content: note.content,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "rt-editor" },
    },
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onUpdate({ ...noteRef.current, content: editor.getHTML() }, true);
      }, SAVE_DEBOUNCE_MS);
    },
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-nodrag]")) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = note.x;
    const origY = note.y;
    let latest: RichTextData = { ...noteRef.current, zIndex: bringToFront() };
    onUpdate(latest, false);

    const move = (ev: PointerEvent) => {
      latest = {
        ...latest,
        x: Math.max(0, snap(origX + ev.clientX - startX)),
        y: Math.max(0, snap(origY + ev.clientY - startY)),
      };
      onUpdate(latest, false);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onUpdate(latest, true);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = note.width;
    const origH = note.height;
    let latest: RichTextData = { ...noteRef.current };

    const move = (ev: PointerEvent) => {
      latest = {
        ...latest,
        width: Math.max(MIN_WIDTH, snap(origW + ev.clientX - startX)),
        height: Math.max(MIN_HEIGHT, snap(origH + ev.clientY - startY)),
      };
      onUpdate(latest, false);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onUpdate(latest, true);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // カードのリンクDnDがエディタ内に落ちないようにブロックする
  const blockLinkDrag = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(LINK_DRAG_TYPE)) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "none";
    }
  };

  return (
    <div
      className="absolute flex flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-md dark:border-gray-600 dark:bg-gray-800"
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        zIndex: note.zIndex,
      }}
      onPointerDown={startDrag}
      onDragOver={blockLinkDrag}
      onDrop={blockLinkDrag}
    >
      {/* ヘッダー（ドラッグハンドル） */}
      <div className="flex items-center justify-between bg-gray-200 px-2 py-1 dark:bg-gray-700">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          ノート
        </span>
        <button
          type="button"
          data-nodrag
          className="rounded p-0.5 text-gray-500 hover:text-red-600"
          onClick={() => onDelete(note.id)}
          title="ノートを削除"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {/* ツールバー */}
      {editor && <Toolbar editor={editor} />}

      {/* エディタ本体 */}
      <div
        data-nodrag
        className="flex-1 cursor-text overflow-y-auto px-2 py-1 text-gray-900 dark:text-gray-100"
        onClick={() => editor?.chain().focus().run()}
      >
        <EditorContent editor={editor} className="h-full" />
      </div>

      {/* リサイズハンドル */}
      <div
        data-nodrag
        className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
        onPointerDown={startResize}
        style={{
          background:
            "linear-gradient(135deg, transparent 50%, rgba(107,114,128,0.6) 50%)",
        }}
      />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean) =>
    `rounded px-1.5 py-0.5 text-xs leading-5 ${
      active
        ? "bg-blue-600 text-white"
        : "text-gray-700 hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-600"
    }`;

  return (
    <div
      data-nodrag
      className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-1 py-1 dark:border-gray-600 dark:bg-gray-700"
    >
      <button
        type="button"
        className={btn(false)}
        onClick={() => editor.chain().focus().undo().run()}
        title="元に戻す"
      >
        ↺
      </button>
      <button
        type="button"
        className={btn(false)}
        onClick={() => editor.chain().focus().redo().run()}
        title="やり直す"
      >
        ↻
      </button>
      <span className="mx-0.5 h-4 w-px bg-gray-300 dark:bg-gray-500" />
      <button
        type="button"
        className={btn(editor.isActive("bold"))}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="太字"
      >
        <b>B</b>
      </button>
      <button
        type="button"
        className={btn(editor.isActive("italic"))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="斜体"
      >
        <i>I</i>
      </button>
      <button
        type="button"
        className={btn(editor.isActive("underline"))}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="下線"
      >
        <u>U</u>
      </button>
      <button
        type="button"
        className={btn(editor.isActive("strike"))}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="取り消し線"
      >
        <s>S</s>
      </button>
      <button
        type="button"
        className={btn(editor.isActive("highlight"))}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="ハイライト"
      >
        蛍
      </button>
      <input
        type="color"
        className="h-5 w-6 cursor-pointer rounded border border-gray-300 bg-transparent p-0 dark:border-gray-500"
        value={editor.getAttributes("textStyle").color || "#000000"}
        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        title="文字色"
      />
      <select
        className="rounded border border-gray-300 bg-white px-0.5 py-0 text-xs dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100"
        value={editor.getAttributes("textStyle").fontSize || ""}
        onChange={(e) => {
          if (e.target.value) {
            editor.chain().focus().setFontSize(e.target.value).run();
          } else {
            editor.chain().focus().unsetFontSize().run();
          }
        }}
        title="文字サイズ"
      >
        <option value="">サイズ</option>
        {FONT_SIZES.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <span className="mx-0.5 h-4 w-px bg-gray-300 dark:bg-gray-500" />
      {([1, 2, 3] as const).map((level) => (
        <button
          key={level}
          type="button"
          className={btn(editor.isActive("heading", { level }))}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          title={`見出し${level}`}
        >
          H{level}
        </button>
      ))}
      <button
        type="button"
        className={btn(editor.isActive("paragraph"))}
        onClick={() => editor.chain().focus().setParagraph().run()}
        title="段落"
      >
        P
      </button>
      <span className="mx-0.5 h-4 w-px bg-gray-300 dark:bg-gray-500" />
      <button
        type="button"
        className={btn(editor.isActive("bulletList"))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="箇条書き"
      >
        •≡
      </button>
      <button
        type="button"
        className={btn(editor.isActive("orderedList"))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="番号付きリスト"
      >
        1≡
      </button>
      <span className="mx-0.5 h-4 w-px bg-gray-300 dark:bg-gray-500" />
      <button
        type="button"
        className={btn(editor.isActive({ textAlign: "left" }))}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        title="左揃え"
      >
        ⇤
      </button>
      <button
        type="button"
        className={btn(editor.isActive({ textAlign: "center" }))}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        title="中央揃え"
      >
        ↔
      </button>
      <button
        type="button"
        className={btn(editor.isActive({ textAlign: "right" }))}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        title="右揃え"
      >
        ⇥
      </button>
      <span className="mx-0.5 h-4 w-px bg-gray-300 dark:bg-gray-500" />
      <button
        type="button"
        className={btn(false)}
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
        title="表を挿入"
      >
        表
      </button>
      {editor.isActive("table") && (
        <>
          <button
            type="button"
            className={btn(false)}
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="行を追加"
          >
            行+
          </button>
          <button
            type="button"
            className={btn(false)}
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="行を削除"
          >
            行-
          </button>
          <button
            type="button"
            className={btn(false)}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="列を追加"
          >
            列+
          </button>
          <button
            type="button"
            className={btn(false)}
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="列を削除"
          >
            列-
          </button>
          <button
            type="button"
            className={btn(false)}
            onClick={() => editor.chain().focus().deleteTable().run()}
            title="表を削除"
          >
            表✕
          </button>
        </>
      )}
    </div>
  );
}
