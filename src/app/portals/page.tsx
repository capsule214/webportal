"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogActions from "@mui/material/DialogActions";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { useColorMode } from "@/components/AppThemeProvider";
import Toast from "@/components/Toast";

type PortalItem = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export default function PortalsPage() {
  const router = useRouter();
  const { mode, toggle } = useColorMode();
  const [portals, setPortals] = useState<PortalItem[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PortalItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/portals");
        if (!res.ok) throw new Error();
        setPortals(await res.json());
      } catch {
        setToast("ボード一覧の読み込みに失敗しました");
      }
    };
    load();
  }, []);

  const createPortal = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/portals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const { id } = (await res.json()) as { id: number };
      const now = new Date().toISOString();
      setNewName("");
      setPortals((prev) => [
        { id, name, createdAt: now, updatedAt: now },
        ...prev,
      ]);
    } catch {
      setToast("ボードの作成に失敗しました");
    }
  };

  const renamePortal = async () => {
    const name = editName.trim();
    if (!name || editingId === null) return;
    const id = editingId;
    setEditingId(null);
    const prev = portals;
    setPortals((list) => list.map((p) => (p.id === id ? { ...p, name } : p)));
    try {
      const res = await fetch(`/api/portals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPortals(prev);
      setToast("ボード名の変更に失敗しました");
    }
  };

  const deletePortal = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const prev = portals;
    setPortals((list) => list.filter((p) => p.id !== target.id));
    try {
      const res = await fetch(`/api/portals/${target.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
    } catch {
      setPortals(prev);
      setToast("ボードの削除に失敗しました");
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense" sx={{ gap: 0.5 }}>
          <Tooltip title="ホームへ戻る">
            <IconButton onClick={() => router.push("/")} size="small">
              <HomeIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 1 }}>
            メモボード一覧
          </Typography>
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

      <Box sx={{ maxWidth: 640, mx: "auto", p: 3 }}>
        <Paper sx={{ p: 2, mb: 3, display: "flex", gap: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="新しいボードの名前"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createPortal()}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={createPortal}
            disabled={!newName.trim()}
            sx={{ flexShrink: 0 }}
          >
            作成
          </Button>
        </Paper>

        <Paper>
          {portals.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ p: 3, textAlign: "center" }}
            >
              ボードがありません。上の入力欄から作成してください。
            </Typography>
          ) : (
            <List disablePadding>
              {portals.map((portal) => (
                <ListItem
                  key={portal.id}
                  divider
                  disablePadding
                  secondaryAction={
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <Tooltip title="名前を変更">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditingId(portal.id);
                            setEditName(portal.name);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="削除">
                        <IconButton
                          size="small"
                          onClick={() => setDeleteTarget(portal)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  {editingId === portal.id ? (
                    <Box sx={{ display: "flex", gap: 1, p: 1, width: "100%" }}>
                      <TextField
                        size="small"
                        fullWidth
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renamePortal();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <Button size="small" onClick={renamePortal}>
                        保存
                      </Button>
                    </Box>
                  ) : (
                    <ListItemButton
                      onClick={() => router.push(`/memo/${portal.id}`)}
                    >
                      <DashboardIcon
                        fontSize="small"
                        sx={{ mr: 1.5, color: "text.secondary" }}
                      />
                      <ListItemText
                        primary={portal.name}
                        secondary={`更新: ${new Date(
                          portal.updatedAt
                        ).toLocaleString("ja-JP")}`}
                      />
                    </ListItemButton>
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Box>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>
          「{deleteTarget?.name}」を削除しますか？
        </DialogTitle>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>キャンセル</Button>
          <Button color="error" variant="contained" onClick={deletePortal}>
            削除
          </Button>
        </DialogActions>
      </Dialog>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </Box>
  );
}
