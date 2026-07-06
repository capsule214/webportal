"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import PostAddIcon from "@mui/icons-material/PostAdd";
import { useColorMode } from "@/components/AppThemeProvider";
import Toast from "@/components/Toast";
import DraggableCard, {
  type CardData,
  type LinkData,
} from "@/components/DraggableCard";
import DraggableImage, { type ImageData } from "@/components/DraggableImage";
import DraggableRichText, {
  type RichTextData,
} from "@/components/DraggableRichText";

export default function MemoPage() {
  const router = useRouter();
  const { mode, toggle } = useColorMode();
  const [cards, setCards] = useState<CardData[]>([]);
  const [images, setImages] = useState<ImageData[]>([]);
  const [notes, setNotes] = useState<RichTextData[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const zCounter = useRef(1);

  const cardsRef = useRef(cards);
  const imagesRef = useRef(images);
  const notesRef = useRef(notes);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const bringToFront = useCallback(() => ++zCounter.current, []);

  // 初期ロード
  useEffect(() => {
    const load = async () => {
      try {
        const [cardsRes, imagesRes, notesRes] = await Promise.all([
          fetch("/api/cards"),
          fetch("/api/images"),
          fetch("/api/rich-texts"),
        ]);
        if (!cardsRes.ok || !imagesRes.ok || !notesRes.ok) {
          throw new Error("load failed");
        }
        const [cardsData, imagesData, notesData] = (await Promise.all([
          cardsRes.json(),
          imagesRes.json(),
          notesRes.json(),
        ])) as [CardData[], ImageData[], RichTextData[]];

        setCards(cardsData);
        setImages(imagesData);
        setNotes(notesData);
        zCounter.current = Math.max(
          1,
          ...cardsData.map((c) => c.zIndex),
          ...imagesData.map((i) => i.zIndex),
          ...notesData.map((n) => n.zIndex)
        );
      } catch {
        setToast("データの読み込みに失敗しました");
      }
    };
    load();
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  };

  // ---- カード ----

  const addCard = async () => {
    const card: CardData = {
      id: crypto.randomUUID(),
      x: 40 + (cardsRef.current.length % 5) * 30,
      y: 40 + (cardsRef.current.length % 5) * 30,
      width: 240,
      height: 180,
      title: "新しいカード",
      titleColor: "#3b82f6",
      links: [],
      zIndex: bringToFront(),
    };
    setCards((prev) => [...prev, card]);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
      });
      if (!res.ok) throw new Error();
    } catch {
      setCards((prev) => prev.filter((c) => c.id !== card.id));
      setToast("カードの追加に失敗しました");
    }
  };

  const copyCard = async (source: CardData) => {
    const copy: CardData = {
      ...source,
      id: crypto.randomUUID(),
      x: source.x + 20,
      y: source.y + 20,
      zIndex: bringToFront(),
      links: source.links.map((l) => ({ ...l, id: crypto.randomUUID() })),
    };
    setCards((prev) => [...prev, copy]);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(copy),
      });
      if (!res.ok) throw new Error();
    } catch {
      setCards((prev) => prev.filter((c) => c.id !== copy.id));
      setToast("カードの複製に失敗しました");
    }
  };

  const updateCard = async (next: CardData, persist: boolean) => {
    const prev = cardsRef.current.find((c) => c.id === next.id);
    setCards((list) => list.map((c) => (c.id === next.id ? next : c)));
    if (!persist) return;
    try {
      const res = await fetch(`/api/cards/${next.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error();
    } catch {
      if (prev) {
        setCards((list) => list.map((c) => (c.id === next.id ? prev : c)));
      }
      setToast("カードの更新に失敗しました");
    }
  };

  const deleteCard = async (id: string) => {
    const prev = cardsRef.current;
    setCards((list) => list.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setCards(prev);
      setToast("カードの削除に失敗しました");
    }
  };

  const moveLink = async (
    sourceCardId: string,
    targetCardId: string,
    link: LinkData,
    targetIndex: number
  ) => {
    const prev = cardsRef.current;
    const source = prev.find((c) => c.id === sourceCardId);
    const target = prev.find((c) => c.id === targetCardId);
    if (!source || !target) return;

    let nextSource: CardData;
    let nextTarget: CardData;

    if (sourceCardId === targetCardId) {
      const links = source.links.filter((l) => l.id !== link.id);
      const sourceIndex = source.links.findIndex((l) => l.id === link.id);
      const insertAt =
        sourceIndex >= 0 && sourceIndex < targetIndex
          ? Math.max(0, targetIndex - 1)
          : Math.min(targetIndex, links.length);
      links.splice(insertAt, 0, link);
      nextSource = nextTarget = { ...source, links };
    } else {
      nextSource = {
        ...source,
        links: source.links.filter((l) => l.id !== link.id),
      };
      const links = [...target.links];
      links.splice(Math.min(targetIndex, links.length), 0, link);
      nextTarget = { ...target, links };
    }

    setCards((list) =>
      list.map((c) =>
        c.id === nextSource.id ? nextSource : c.id === nextTarget.id ? nextTarget : c
      )
    );

    try {
      const targets =
        sourceCardId === targetCardId ? [nextSource] : [nextSource, nextTarget];
      const results = await Promise.all(
        targets.map((card) =>
          fetch(`/api/cards/${card.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(card),
          })
        )
      );
      if (results.some((res) => !res.ok)) throw new Error();
    } catch {
      setCards(prev);
      setToast("リンクの移動に失敗しました");
    }
  };

  // ---- 画像 ----

  const addImage = async () => {
    const image: ImageData = {
      id: crypto.randomUUID(),
      x: 60 + (imagesRef.current.length % 5) * 30,
      y: 60 + (imagesRef.current.length % 5) * 30,
      width: 200,
      height: 200,
      zIndex: bringToFront(),
      url: "",
    };
    setImages((prev) => [...prev, image]);
    try {
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(image),
      });
      if (!res.ok) throw new Error();
    } catch {
      setImages((prev) => prev.filter((i) => i.id !== image.id));
      setToast("画像の追加に失敗しました");
    }
  };

  const updateImage = async (next: ImageData, persist: boolean) => {
    const prev = imagesRef.current.find((i) => i.id === next.id);
    setImages((list) => list.map((i) => (i.id === next.id ? next : i)));
    if (!persist) return;
    try {
      const res = await fetch(`/api/images/${next.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error();
    } catch {
      if (prev) {
        setImages((list) => list.map((i) => (i.id === next.id ? prev : i)));
      }
      setToast("画像の更新に失敗しました");
    }
  };

  const deleteImage = async (id: string) => {
    const prev = imagesRef.current;
    setImages((list) => list.filter((i) => i.id !== id));
    try {
      const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setImages(prev);
      setToast("画像の削除に失敗しました");
    }
  };

  const uploadImage = async (id: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("id", id);
      const res = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setToast(body?.error ?? "画像のアップロードに失敗しました");
        return;
      }
      const { url } = (await res.json()) as { url: string };
      setImages((list) =>
        list.map((i) => (i.id === id ? { ...i, url } : i))
      );
    } catch {
      setToast("画像のアップロードに失敗しました");
    }
  };

  // ---- リッチテキスト ----

  const addNote = async () => {
    const note: RichTextData = {
      id: crypto.randomUUID(),
      x: 80 + (notesRef.current.length % 5) * 30,
      y: 80 + (notesRef.current.length % 5) * 30,
      width: 320,
      height: 240,
      zIndex: bringToFront(),
      content: "",
    };
    setNotes((prev) => [...prev, note]);
    try {
      const res = await fetch("/api/rich-texts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      });
      if (!res.ok) throw new Error();
    } catch {
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      setToast("ノートの追加に失敗しました");
    }
  };

  const updateNote = async (next: RichTextData, persist: boolean) => {
    const prev = notesRef.current.find((n) => n.id === next.id);
    setNotes((list) => list.map((n) => (n.id === next.id ? next : n)));
    if (!persist) return;
    try {
      const res = await fetch(`/api/rich-texts/${next.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error();
    } catch {
      if (prev) {
        setNotes((list) => list.map((n) => (n.id === next.id ? prev : n)));
      }
      setToast("ノートの更新に失敗しました");
    }
  };

  const deleteNote = async (id: string) => {
    const prev = notesRef.current;
    setNotes((list) => list.filter((n) => n.id !== id));
    try {
      const res = await fetch(`/api/rich-texts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setNotes(prev);
      setToast("ノートの削除に失敗しました");
    }
  };

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense" sx={{ gap: 0.5 }}>
          <Tooltip title="ホームへ戻る">
            <IconButton onClick={() => router.push("/")} size="small">
              <HomeIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 1 }}>
            メモボード
          </Typography>
          <Tooltip title="ノートを追加">
            <IconButton onClick={addNote} size="small">
              <NoteAddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="画像を追加">
            <IconButton onClick={addImage} size="small">
              <AddPhotoAlternateIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="カードを追加">
            <IconButton onClick={addCard} size="small">
              <PostAddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={mode === "light" ? "ダークモード" : "ライトモード"}>
            <IconButton onClick={toggle} size="small">
              {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="ログアウト">
            <IconButton onClick={logout} size="small">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, overflow: "auto" }}>
        <Box sx={{ position: "relative", width: 3000, height: 2000 }}>
          {cards.map((card) => (
            <DraggableCard
              key={card.id}
              card={card}
              onUpdate={updateCard}
              onDelete={deleteCard}
              onCopy={copyCard}
              bringToFront={bringToFront}
              onLinkMove={moveLink}
            />
          ))}
          {images.map((image) => (
            <DraggableImage
              key={image.id}
              image={image}
              onUpdate={updateImage}
              onDelete={deleteImage}
              onUpload={uploadImage}
              bringToFront={bringToFront}
            />
          ))}
          {notes.map((note) => (
            <DraggableRichText
              key={note.id}
              note={note}
              onUpdate={updateNote}
              onDelete={deleteNote}
              bringToFront={bringToFront}
            />
          ))}
        </Box>
      </Box>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </Box>
  );
}
