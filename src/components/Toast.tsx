"use client";

import { useEffect } from "react";

export default function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 z-[10000] -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-lg">
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-white/80 hover:text-white"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
