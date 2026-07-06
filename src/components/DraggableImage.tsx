"use client";

import { useEffect, useRef, useState } from "react";
import { PhotoIcon, TrashIcon } from "@heroicons/react/24/outline";

export interface ImageData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  url: string;
}

const GRID = 10;
const MIN_SIZE = 80;

const snap = (value: number) => Math.round(value / GRID) * GRID;

type Props = {
  image: ImageData;
  onUpdate: (image: ImageData, persist: boolean) => void;
  onDelete: (id: string) => void;
  onUpload: (id: string, file: File) => void;
  bringToFront: () => number;
};

export default function DraggableImage({
  image,
  onUpdate,
  onDelete,
  onUpload,
  bringToFront,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef(image);

  useEffect(() => {
    imageRef.current = image;
  }, [image]);

  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-nodrag]")) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = image.x;
    const origY = image.y;
    let latest: ImageData = { ...imageRef.current, zIndex: bringToFront() };
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
    const origW = image.width;
    const origH = image.height;
    let latest: ImageData = { ...imageRef.current };

    const move = (ev: PointerEvent) => {
      latest = {
        ...latest,
        width: Math.max(MIN_SIZE, snap(origW + ev.clientX - startX)),
        height: Math.max(MIN_SIZE, snap(origH + ev.clientY - startY)),
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

  const handleFile = (file: File | undefined) => {
    if (file) onUpload(image.id, file);
  };

  return (
    <div
      className="group absolute overflow-hidden rounded-lg border border-gray-300 bg-white shadow-md dark:border-gray-600 dark:bg-gray-800"
      style={{
        left: image.x,
        top: image.y,
        width: image.width,
        height: image.height,
        zIndex: image.zIndex,
      }}
      onPointerDown={startDrag}
    >
      {image.url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
          <button
            type="button"
            data-nodrag
            className="absolute right-1 top-1 hidden rounded bg-black/50 p-1 text-white hover:bg-red-600 group-hover:block"
            onClick={() => onDelete(image.id)}
            title="画像を削除"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </>
      ) : (
        <div
          data-nodrag
          className={`flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 text-xs text-gray-400 ${
            dragOver ? "bg-blue-50 dark:bg-blue-900/30" : ""
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setDragOver(true);
            }
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files[0]);
          }}
        >
          <PhotoIcon className="h-8 w-8" />
          <span>画像をドロップ</span>
          <span>またはクリックで選択</span>
          <button
            type="button"
            className="absolute right-1 top-1 hidden rounded bg-black/50 p-1 text-white hover:bg-red-600 group-hover:block"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(image.id);
            }}
            title="削除"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
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
