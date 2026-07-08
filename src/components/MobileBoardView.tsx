"use client";

import { useState } from "react";
import { PlayCircleIcon, PhotoIcon, VideoCameraIcon } from "@heroicons/react/24/outline";
import type { CardData } from "./DraggableCard";
import type { ImageData } from "./DraggableImage";
import type { VideoData } from "./DraggableVideo";
import type { RichTextData } from "./DraggableRichText";
import { extractYouTubeId } from "./DraggableVideo";

type Props = {
  cards: CardData[];
  images: ImageData[];
  videos: VideoData[];
  notes: RichTextData[];
};

type MobileItem =
  | { kind: "card"; zIndex: number; card: CardData }
  | { kind: "image"; zIndex: number; image: ImageData }
  | { kind: "video"; zIndex: number; video: VideoData }
  | { kind: "note"; zIndex: number; note: RichTextData };

// モバイル（iPhoneなど）向けの閲覧専用ビュー。
// 全アイテムをz-index順に画面幅いっぱいで縦に並べる。
export default function MobileBoardView({ cards, images, videos, notes }: Props) {
  const items: MobileItem[] = [
    ...cards.map((card) => ({ kind: "card" as const, zIndex: card.zIndex, card })),
    ...images.map((image) => ({ kind: "image" as const, zIndex: image.zIndex, image })),
    ...videos.map((video) => ({ kind: "video" as const, zIndex: video.zIndex, video })),
    ...notes.map((note) => ({ kind: "note" as const, zIndex: note.zIndex, note })),
  ].sort((a, b) => a.zIndex - b.zIndex);

  if (items.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-gray-500">
        このボードにはまだコンテンツがありません。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {items.map((item) => {
        switch (item.kind) {
          case "card":
            return <MobileCard key={`card-${item.card.id}`} card={item.card} />;
          case "image":
            return <MobileImage key={`image-${item.image.id}`} image={item.image} />;
          case "video":
            return <MobileVideo key={`video-${item.video.id}`} video={item.video} />;
          case "note":
            return <MobileNote key={`note-${item.note.id}`} note={item.note} />;
        }
      })}
    </div>
  );
}

function MobileCard({ card }: { card: CardData }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800">
      <div
        className="px-3 py-2 text-sm font-semibold text-white"
        style={{ backgroundColor: card.titleColor || "#3b82f6" }}
      >
        {card.title || "無題のカード"}
      </div>
      {card.links.length === 0 ? (
        <p className="px-3 py-2 text-xs text-gray-400">リンクはありません</p>
      ) : (
        <ul>
          {card.links.map((link) => (
            <li
              key={link.id}
              className="border-b border-gray-100 last:border-b-0 dark:border-gray-700"
            >
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2.5 text-sm text-blue-600 active:bg-gray-100 dark:text-blue-400 dark:active:bg-gray-700"
              >
                {link.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MobileImage({ image }: { image: ImageData }) {
  if (!image.url) {
    return (
      <div className="flex h-32 items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 text-xs text-gray-400 dark:border-gray-600">
        <PhotoIcon className="h-6 w-6" />
        画像は未設定です
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.url}
      alt=""
      className="w-full rounded-lg border border-gray-300 dark:border-gray-600"
    />
  );
}

function MobileVideo({ video }: { video: VideoData }) {
  const [playing, setPlaying] = useState(false);
  const videoId = extractYouTubeId(video.url);

  if (!videoId) {
    return (
      <div className="flex h-32 items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 text-xs text-gray-400 dark:border-gray-600">
        <VideoCameraIcon className="h-6 w-6" />
        動画は未登録です
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 bg-black dark:border-gray-600">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube動画"
        />
      ) : (
        <button
          type="button"
          className="relative block w-full"
          onClick={() => setPlaying(true)}
          title="動画を再生"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt="動画のサムネイル"
            className="aspect-video w-full object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/20">
            <PlayCircleIcon className="h-14 w-14 text-white drop-shadow" />
          </span>
        </button>
      )}
    </div>
  );
}

function MobileNote({ note }: { note: RichTextData }) {
  return (
    <div className="rounded-lg border border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
      <div
        className="rt-editor text-gray-900 dark:text-gray-100"
        // 自分（と共有ユーザー）が保存したHTMLのみを表示する
        dangerouslySetInnerHTML={{ __html: note.content }}
      />
    </div>
  );
}
