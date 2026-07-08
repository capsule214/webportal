"use client";

import { useEffect, useRef, useState } from "react";
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  DocumentDuplicateIcon,
  SwatchIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export interface LinkData {
  id: string;
  title: string;
  url: string;
}

export interface CardData {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  titleColor: string;
  links: LinkData[];
  zIndex: number;
}

export const LINK_DRAG_TYPE = "application/x-link-drag";

const GRID = 10;
const MIN_WIDTH = 200;
const MIN_HEIGHT = 140;

const TITLE_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];

const snap = (value: number) => Math.round(value / GRID) * GRID;

export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
}

type Props = {
  card: CardData;
  onUpdate: (card: CardData, persist: boolean) => void;
  onDelete: (id: number) => void;
  onCopy: (card: CardData) => void;
  bringToFront: () => number;
  onLinkMove: (
    sourceCardId: number,
    targetCardId: number,
    link: LinkData,
    targetIndex: number
  ) => void;
};

export default function DraggableCard({
  card,
  onUpdate,
  onDelete,
  onCopy,
  bringToFront,
  onLinkMove,
}: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(card.title);
  const [showPalette, setShowPalette] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [linkTitleDraft, setLinkTitleDraft] = useState("");
  const [linkUrlDraft, setLinkUrlDraft] = useState("");
  const cardRef = useRef(card);

  useEffect(() => {
    cardRef.current = card;
  }, [card]);

  const startEditTitle = () => {
    setTitleDraft(card.title);
    setEditingTitle(true);
  };

  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-nodrag]")) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = card.x;
    const origY = card.y;
    let latest: CardData = { ...cardRef.current, zIndex: bringToFront() };
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
    const origW = card.width;
    const origH = card.height;
    let latest: CardData = { ...cardRef.current };

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

  const commitTitle = () => {
    setEditingTitle(false);
    if (titleDraft !== card.title) {
      onUpdate({ ...card, title: titleDraft }, true);
    }
  };

  const startAddLink = () => {
    setEditingLinkId(null);
    setLinkTitleDraft("");
    setLinkUrlDraft("");
    setAddingLink(true);
  };

  const startEditLink = (link: LinkData) => {
    setAddingLink(false);
    setEditingLinkId(link.id);
    setLinkTitleDraft(link.title);
    setLinkUrlDraft(link.url);
  };

  const commitLinkForm = () => {
    const title = linkTitleDraft.trim();
    const url = normalizeUrl(linkUrlDraft);
    if (!title || !url) return;

    if (addingLink) {
      onUpdate(
        {
          ...card,
          links: [...card.links, { id: crypto.randomUUID(), title, url }],
        },
        true
      );
    } else if (editingLinkId) {
      onUpdate(
        {
          ...card,
          links: card.links.map((l) =>
            l.id === editingLinkId ? { ...l, title, url } : l
          ),
        },
        true
      );
    }
    setAddingLink(false);
    setEditingLinkId(null);
  };

  const deleteLink = (linkId: string) => {
    onUpdate(
      { ...card, links: card.links.filter((l) => l.id !== linkId) },
      true
    );
  };

  // 行の上半分なら手前、下半分なら直後に挿入する
  const rowInsertIndex = (e: React.DragEvent, index: number) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2 ? index : index + 1;
  };

  const handleLinkDrop = (e: React.DragEvent, targetIndex: number) => {
    setDropIndex(null);
    if (!e.dataTransfer.types.includes(LINK_DRAG_TYPE)) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      const payload = JSON.parse(e.dataTransfer.getData(LINK_DRAG_TYPE)) as {
        sourceCardId: number;
        link: LinkData;
      };
      onLinkMove(payload.sourceCardId, card.id, payload.link, targetIndex);
    } catch {
      // 不正なペイロードは無視する
    }
  };

  const handleRowDragOver = (e: React.DragEvent, index: number) => {
    if (!e.dataTransfer.types.includes(LINK_DRAG_TYPE)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDropIndex(rowInsertIndex(e, index));
  };

  const handleListDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(LINK_DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropIndex(card.links.length);
  };

  const handleListDragLeave = (e: React.DragEvent) => {
    // リスト内の子要素間の移動では消さない
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropIndex(null);
    }
  };

  const titleColor = card.titleColor || TITLE_COLORS[0];

  return (
    <div
      className="absolute flex flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-md dark:border-gray-600 dark:bg-gray-800"
      style={{
        left: card.x,
        top: card.y,
        width: card.width,
        height: card.height,
        zIndex: card.zIndex,
      }}
      onPointerDown={startDrag}
    >
      {/* ヘッダー（ドラッグハンドル） */}
      <div
        className="flex cursor-grab select-none items-center gap-1 px-2 py-1.5 text-white active:cursor-grabbing"
        style={{ backgroundColor: titleColor }}
        title="ドラッグで移動"
      >
        <GripDots />
        {editingTitle ? (
          <input
            data-nodrag
            autoFocus
            className="min-w-0 flex-1 rounded border border-white/50 bg-white/20 px-1 text-sm text-white outline-none placeholder:text-white/60"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                setTitleDraft(card.title);
                setEditingTitle(false);
              }
            }}
          />
        ) : (
          <span
            className="min-w-0 flex-1 truncate text-sm font-semibold"
            onDoubleClick={startEditTitle}
            title="ドラッグで移動 / ダブルクリックでタイトルを編集"
          >
            {card.title || "無題のカード"}
          </span>
        )}
        <button
          type="button"
          data-nodrag
          className="rounded p-0.5 hover:bg-white/20"
          onClick={() => setShowPalette((v) => !v)}
          title="タイトルの色を変更"
        >
          <SwatchIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          data-nodrag
          className="rounded p-0.5 hover:bg-white/20"
          onClick={() => onCopy(card)}
          title="カードを複製"
        >
          <DocumentDuplicateIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          data-nodrag
          className="rounded p-0.5 hover:bg-white/20"
          onClick={() => setConfirmDelete(true)}
          title="カードを削除"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {/* カラーパレット */}
      {showPalette && (
        <div
          data-nodrag
          className="flex gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-600 dark:bg-gray-700"
        >
          {TITLE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className="h-5 w-5 rounded-full border border-gray-300 transition-transform hover:scale-110"
              style={{ backgroundColor: color }}
              onClick={() => {
                onUpdate({ ...card, titleColor: color }, true);
                setShowPalette(false);
              }}
              aria-label={`色 ${color}`}
            />
          ))}
        </div>
      )}

      {/* リンク一覧 */}
      <div
        data-nodrag
        className="flex-1 overflow-y-auto p-1.5"
        onDragOver={handleListDragOver}
        onDragLeave={handleListDragLeave}
        onDrop={(e) => handleLinkDrop(e, card.links.length)}
      >
        {card.links.map((link, index) => (
          <div key={link.id}>
            {dropIndex === index && <DropIndicator />}
            {editingLinkId === link.id ? (
              <LinkForm
                title={linkTitleDraft}
                url={linkUrlDraft}
                onTitleChange={setLinkTitleDraft}
                onUrlChange={setLinkUrlDraft}
                onCommit={commitLinkForm}
                onCancel={() => setEditingLinkId(null)}
              />
            ) : (
              <div
                className="group flex items-center gap-1 rounded px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    LINK_DRAG_TYPE,
                    JSON.stringify({ sourceCardId: card.id, link })
                  );
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => setDropIndex(null)}
                onDragOver={(e) => handleRowDragOver(e, index)}
                onDrop={(e) => handleLinkDrop(e, rowInsertIndex(e, index))}
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-sm text-blue-600 hover:underline dark:text-blue-400"
                  title={link.url}
                >
                  {link.title}
                </a>
                <button
                  type="button"
                  className="hidden rounded p-0.5 text-gray-500 hover:text-gray-800 group-hover:block dark:hover:text-gray-200"
                  onClick={() => startEditLink(link)}
                  title="リンクを編集"
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="hidden rounded p-0.5 text-gray-500 hover:text-red-600 group-hover:block"
                  onClick={() => deleteLink(link.id)}
                  title="リンクを削除"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}

        {dropIndex === card.links.length && <DropIndicator />}

        {addingLink ? (
          <LinkForm
            title={linkTitleDraft}
            url={linkUrlDraft}
            onTitleChange={setLinkTitleDraft}
            onUrlChange={setLinkUrlDraft}
            onCommit={commitLinkForm}
            onCancel={() => setAddingLink(false)}
          />
        ) : (
          <button
            type="button"
            className="mt-1 flex w-full items-center gap-1 rounded px-1 py-0.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            onClick={startAddLink}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            リンクを追加
          </button>
        )}
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

      {/* 削除確認モーダル */}
      {confirmDelete && (
        <div
          data-nodrag
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-72 rounded-lg bg-white p-4 shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-4 text-sm text-gray-800 dark:text-gray-100">
              「{card.title || "無題のカード"}」を削除しますか？
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                onClick={() => setConfirmDelete(false)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                onClick={() => {
                  setConfirmDelete(false);
                  onDelete(card.id);
                }}
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DropIndicator() {
  return <div className="my-0.5 h-0.5 rounded bg-blue-500" />;
}

// ドラッグハンドルを示す6点グリップ
export function GripDots() {
  return (
    <svg
      width="10"
      height="14"
      viewBox="0 0 10 14"
      className="shrink-0 opacity-70"
      aria-hidden
    >
      {[2, 7, 12].map((cy) =>
        [3, 7.5].map((cx) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.3" fill="currentColor" />
        ))
      )}
    </svg>
  );
}

function LinkForm({
  title,
  url,
  onTitleChange,
  onUrlChange,
  onCommit,
  onCancel,
}: {
  title: string;
  url: string;
  onTitleChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="my-1 flex flex-col gap-1 rounded border border-gray-300 p-1.5 dark:border-gray-600">
      <input
        autoFocus
        className="rounded border border-gray-300 px-1 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        placeholder="タイトル"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onCommit()}
      />
      <input
        className="rounded border border-gray-300 px-1 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        placeholder="URL"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onCommit()}
      />
      <div className="flex justify-end gap-1">
        <button
          type="button"
          className="rounded p-0.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          onClick={onCancel}
          title="キャンセル"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded p-0.5 text-green-600 hover:text-green-700"
          onClick={onCommit}
          title="保存"
        >
          <CheckIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
