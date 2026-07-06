"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LogoutIcon from "@mui/icons-material/Logout";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import PostAddIcon from "@mui/icons-material/PostAdd";
import VideoCallIcon from "@mui/icons-material/VideoCall";
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
import DraggableVideo, { type VideoData } from "@/components/DraggableVideo";

// URLリンクカードの詳細行（contentdetails）を組み立てる
const cardDetails = (card: CardData) => [
  JSON.stringify({ kind: "meta", titleColor: card.titleColor }),
  ...card.links.map((l) =>
    JSON.stringify({ kind: "link", title: l.title, url: l.url })
  ),
];

const cardPayload = (card: CardData) => ({
  contentName: card.title,
  x: card.x,
  y: card.y,
  w: card.width,
  h: card.height,
  details: cardDetails(card),
});

export default function MemoBoardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const portalId = params.id;
  const { mode, toggle } = useColorMode();
  const [portalName, setPortalName] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [cards, setCards] = useState<CardData[]>([]);
  const [images, setImages] = useState<ImageData[]>([]);
  const [notes, setNotes] = useState<RichTextData[]>([]);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const zCounter = useRef(1);

  const cardsRef = useRef(cards);
  const imagesRef = useRef(images);
  const notesRef = useRef(notes);
  const videosRef = useRef(videos);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);
  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);

  const bringToFront = useCallback(() => ++zCounter.current, []);

  // 初期ロード
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/portals/${portalId}/contents`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as {
          portal: { id: number; name: string };
          cards: CardData[];
          images: ImageData[];
          videos: VideoData[];
          richTexts: RichTextData[];
        };
        setPortalName(data.portal.name);
        setCards(data.cards);
        setImages(data.images);
        setVideos(data.videos);
        setNotes(data.richTexts);
        zCounter.current = Math.max(
          1,
          ...data.cards.map((c) => c.zIndex),
          ...data.images.map((i) => i.zIndex),
          ...data.videos.map((v) => v.zIndex),
          ...data.richTexts.map((n) => n.zIndex)
        );
      } catch {
        setLoadError(true);
      }
    };
    load();
  }, [portalId]);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  };

  // コンテンツの新規作成（serial IDをサーバーが採番するため作成後に反映する）
  const createContent = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/portals/${portalId}/contents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error();
    const { id } = (await res.json()) as { id: number };
    return id;
  };

  const putContent = async (id: number, body: Record<string, unknown>) => {
    const res = await fetch(`/api/contents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error();
  };

  // ---- カード ----

  const addCard = async () => {
    const base = {
      x: 40 + (cardsRef.current.length % 5) * 30,
      y: 40 + (cardsRef.current.length % 5) * 30,
      width: 240,
      height: 180,
      title: "新しいカード",
      titleColor: "#3b82f6",
      links: [] as LinkData[],
    };
    try {
      const id = await createContent({
        typeId: 1,
        contentName: base.title,
        x: base.x,
        y: base.y,
        w: base.width,
        h: base.height,
        details: [JSON.stringify({ kind: "meta", titleColor: base.titleColor })],
      });
      setCards((prev) => [...prev, { ...base, id, zIndex: bringToFront() }]);
    } catch {
      setToast("カードの追加に失敗しました");
    }
  };

  const copyCard = async (source: CardData) => {
    const copy = {
      ...source,
      x: source.x + 20,
      y: source.y + 20,
      links: source.links.map((l) => ({ ...l, id: crypto.randomUUID() })),
    };
    try {
      const id = await createContent({
        typeId: 1,
        contentName: copy.title,
        x: copy.x,
        y: copy.y,
        w: copy.width,
        h: copy.height,
        details: cardDetails(copy),
      });
      setCards((prev) => [...prev, { ...copy, id, zIndex: bringToFront() }]);
    } catch {
      setToast("カードの複製に失敗しました");
    }
  };

  const updateCard = async (next: CardData, persist: boolean) => {
    const prev = cardsRef.current.find((c) => c.id === next.id);
    setCards((list) => list.map((c) => (c.id === next.id ? next : c)));
    if (!persist) return;
    try {
      await putContent(next.id, cardPayload(next));
    } catch {
      if (prev) {
        setCards((list) => list.map((c) => (c.id === next.id ? prev : c)));
      }
      setToast("カードの更新に失敗しました");
    }
  };

  const deleteCard = async (id: number) => {
    const prev = cardsRef.current;
    setCards((list) => list.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/contents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setCards(prev);
      setToast("カードの削除に失敗しました");
    }
  };

  const moveLink = async (
    sourceCardId: number,
    targetCardId: number,
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
      // 順序が変わらない場合は何もしない
      if (links.every((l, i) => l.id === source.links[i]?.id)) return;
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
        c.id === nextSource.id
          ? nextSource
          : c.id === nextTarget.id
            ? nextTarget
            : c
      )
    );

    try {
      const targets =
        sourceCardId === targetCardId ? [nextSource] : [nextSource, nextTarget];
      await Promise.all(
        targets.map((card) => putContent(card.id, cardPayload(card)))
      );
    } catch {
      setCards(prev);
      setToast("リンクの移動に失敗しました");
    }
  };

  // ---- 画像 ----

  const addImage = async () => {
    const base = {
      x: 60 + (imagesRef.current.length % 5) * 30,
      y: 60 + (imagesRef.current.length % 5) * 30,
      width: 200,
      height: 200,
      url: "",
    };
    try {
      const id = await createContent({
        typeId: 2,
        x: base.x,
        y: base.y,
        w: base.width,
        h: base.height,
      });
      setImages((prev) => [...prev, { ...base, id, zIndex: bringToFront() }]);
    } catch {
      setToast("画像の追加に失敗しました");
    }
  };

  const updateImage = async (next: ImageData, persist: boolean) => {
    const prev = imagesRef.current.find((i) => i.id === next.id);
    setImages((list) => list.map((i) => (i.id === next.id ? next : i)));
    if (!persist) return;
    try {
      // detailsは送らない（アップロード済みファイル名を保持する）
      await putContent(next.id, {
        x: next.x,
        y: next.y,
        w: next.width,
        h: next.height,
      });
    } catch {
      if (prev) {
        setImages((list) => list.map((i) => (i.id === next.id ? prev : i)));
      }
      setToast("画像の更新に失敗しました");
    }
  };

  const deleteImage = async (id: number) => {
    const prev = imagesRef.current;
    setImages((list) => list.filter((i) => i.id !== id));
    try {
      const res = await fetch(`/api/contents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setImages(prev);
      setToast("画像の削除に失敗しました");
    }
  };

  const uploadImage = async (id: number, file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/contents/${id}/upload`, {
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
      setImages((list) => list.map((i) => (i.id === id ? { ...i, url } : i)));
    } catch {
      setToast("画像のアップロードに失敗しました");
    }
  };

  // ---- 動画 ----

  const addVideo = async () => {
    const base = {
      x: 100 + (videosRef.current.length % 5) * 30,
      y: 100 + (videosRef.current.length % 5) * 30,
      width: 320,
      height: 200,
      url: "",
    };
    try {
      const id = await createContent({
        typeId: 3,
        x: base.x,
        y: base.y,
        w: base.width,
        h: base.height,
      });
      setVideos((prev) => [...prev, { ...base, id, zIndex: bringToFront() }]);
    } catch {
      setToast("動画の追加に失敗しました");
    }
  };

  const updateVideo = async (next: VideoData, persist: boolean) => {
    const prev = videosRef.current.find((v) => v.id === next.id);
    setVideos((list) => list.map((v) => (v.id === next.id ? next : v)));
    if (!persist) return;
    try {
      await putContent(next.id, {
        x: next.x,
        y: next.y,
        w: next.width,
        h: next.height,
        details: [next.url],
      });
    } catch {
      if (prev) {
        setVideos((list) => list.map((v) => (v.id === next.id ? prev : v)));
      }
      setToast("動画の更新に失敗しました");
    }
  };

  const deleteVideo = async (id: number) => {
    const prev = videosRef.current;
    setVideos((list) => list.filter((v) => v.id !== id));
    try {
      const res = await fetch(`/api/contents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setVideos(prev);
      setToast("動画の削除に失敗しました");
    }
  };

  // ---- リッチテキスト ----

  const addNote = async () => {
    const base = {
      x: 80 + (notesRef.current.length % 5) * 30,
      y: 80 + (notesRef.current.length % 5) * 30,
      width: 320,
      height: 240,
      content: "",
    };
    try {
      const id = await createContent({
        typeId: 4,
        x: base.x,
        y: base.y,
        w: base.width,
        h: base.height,
        details: [""],
      });
      setNotes((prev) => [...prev, { ...base, id, zIndex: bringToFront() }]);
    } catch {
      setToast("ノートの追加に失敗しました");
    }
  };

  const updateNote = async (next: RichTextData, persist: boolean) => {
    const prev = notesRef.current.find((n) => n.id === next.id);
    setNotes((list) => list.map((n) => (n.id === next.id ? next : n)));
    if (!persist) return;
    try {
      await putContent(next.id, {
        x: next.x,
        y: next.y,
        w: next.width,
        h: next.height,
        details: [next.content],
      });
    } catch {
      if (prev) {
        setNotes((list) => list.map((n) => (n.id === next.id ? prev : n)));
      }
      setToast("ノートの更新に失敗しました");
    }
  };

  const deleteNote = async (id: number) => {
    const prev = notesRef.current;
    setNotes((list) => list.filter((n) => n.id !== id));
    try {
      const res = await fetch(`/api/contents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setNotes(prev);
      setToast("ノートの削除に失敗しました");
    }
  };

  if (loadError) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <Typography>ボードが見つかりませんでした。</Typography>
        <Typography
          component="button"
          onClick={() => router.push("/portals")}
          sx={{
            color: "primary.main",
            background: "none",
            border: 0,
            cursor: "pointer",
          }}
        >
          メモボード一覧へ戻る
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense" sx={{ gap: 0.5 }}>
          <Tooltip title="ボード一覧へ戻る">
            <IconButton onClick={() => router.push("/portals")} size="small">
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 1 }}>
            {portalName || "メモボード"}
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
          <Tooltip title="動画を追加">
            <IconButton onClick={addVideo} size="small">
              <VideoCallIcon />
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
          {videos.map((video) => (
            <DraggableVideo
              key={video.id}
              video={video}
              onUpdate={updateVideo}
              onDelete={deleteVideo}
              bringToFront={bringToFront}
            />
          ))}
        </Box>
      </Box>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </Box>
  );
}
