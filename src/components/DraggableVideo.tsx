"use client";

import { useEffect, useRef, useState } from "react";
import {
  PlayCircleIcon,
  PencilIcon,
  TrashIcon,
  StopCircleIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";

export interface VideoData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  url: string;
}

const GRID = 10;
const MIN_WIDTH = 240;
const MIN_HEIGHT = 160;

const snap = (value: number) => Math.round(value / GRID) * GRID;

// YouTubeの各種URL形式から動画IDを取り出す
export function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const patterns = [
    /(?:youtube\.com|youtube-nocookie\.com)\/watch\?(?:[^#]*&)?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /(?:youtube\.com|youtube-nocookie\.com)\/(?:embed|shorts|live)\/([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

type Props = {
  video: VideoData;
  onUpdate: (video: VideoData, persist: boolean) => void;
  onDelete: (id: string) => void;
  bringToFront: () => number;
};

export default function DraggableVideo({
  video,
  onUpdate,
  onDelete,
  bringToFront,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [urlError, setUrlError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [dragging, setDragging] = useState(false);
  const videoRef = useRef(video);

  useEffect(() => {
    videoRef.current = video;
  }, [video]);

  const videoId = extractYouTubeId(video.url);

  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-nodrag]")) return;
    e.preventDefault();
    setDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = video.x;
    const origY = video.y;
    let latest: VideoData = { ...videoRef.current, zIndex: bringToFront() };
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
      setDragging(false);
      onUpdate(latest, true);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = video.width;
    const origH = video.height;
    let latest: VideoData = { ...videoRef.current };

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
      setDragging(false);
      onUpdate(latest, true);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startEdit = () => {
    setUrlDraft(video.url);
    setUrlError(false);
    setPlaying(false);
    setEditing(true);
  };

  const commitUrl = () => {
    const id = extractYouTubeId(urlDraft);
    if (!id) {
      setUrlError(true);
      return;
    }
    setUrlError(false);
    setEditing(false);
    onUpdate({ ...video, url: urlDraft.trim() }, true);
  };

  const showForm = editing || !videoId;

  return (
    <div
      className="group absolute overflow-hidden rounded-lg border border-gray-300 bg-black shadow-md dark:border-gray-600"
      style={{
        left: video.x,
        top: video.y,
        width: video.width,
        height: video.height,
        zIndex: video.zIndex,
      }}
      onPointerDown={startDrag}
    >
      {showForm ? (
        /* URL登録フォーム */
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white p-3 dark:bg-gray-800">
          <VideoCameraIcon className="h-8 w-8 text-gray-400" />
          <input
            data-nodrag
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            placeholder="YouTubeのURLを貼り付け"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commitUrl()}
          />
          {urlError && (
            <p className="text-xs text-red-500">
              YouTubeのURLを認識できませんでした
            </p>
          )}
          <div className="flex gap-2">
            {editing && videoId && (
              <button
                type="button"
                data-nodrag
                className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                onClick={() => setEditing(false)}
              >
                キャンセル
              </button>
            )}
            <button
              type="button"
              data-nodrag
              className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
              onClick={commitUrl}
            >
              登録
            </button>
          </div>
          <button
            type="button"
            data-nodrag
            className="absolute right-1 top-1 hidden rounded bg-black/50 p-1 text-white hover:bg-red-600 group-hover:block"
            onClick={() => onDelete(video.id)}
            title="削除"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ) : playing ? (
        /* 再生中 */
        <>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
            className={`h-full w-full ${dragging ? "pointer-events-none" : ""}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube動画"
          />
          <button
            type="button"
            data-nodrag
            className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white hover:bg-black/80"
            onClick={() => setPlaying(false)}
            title="再生を終了"
          >
            <StopCircleIcon className="h-5 w-5" />
          </button>
        </>
      ) : (
        /* サムネイル表示 */
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt="動画のサムネイル"
            className="h-full w-full object-cover"
            draggable={false}
          />
          <button
            type="button"
            data-nodrag
            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-90 transition hover:bg-black/40"
            onClick={() => setPlaying(true)}
            title="動画を再生"
          >
            <PlayCircleIcon className="h-16 w-16 text-white drop-shadow" />
          </button>
          <div className="absolute right-1 top-1 hidden gap-1 group-hover:flex">
            <button
              type="button"
              data-nodrag
              className="rounded bg-black/50 p-1 text-white hover:bg-black/80"
              onClick={startEdit}
              title="URLを変更"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              data-nodrag
              className="rounded bg-black/50 p-1 text-white hover:bg-red-600"
              onClick={() => onDelete(video.id)}
              title="削除"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

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
