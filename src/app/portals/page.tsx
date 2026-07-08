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
import Drawer from "@mui/material/Drawer";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import FormControlLabel from "@mui/material/FormControlLabel";
import RadioGroup from "@mui/material/RadioGroup";
import Radio from "@mui/material/Radio";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import SettingsIcon from "@mui/icons-material/Settings";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import PublicIcon from "@mui/icons-material/Public";
import { useColorMode } from "@/components/AppThemeProvider";
import Toast from "@/components/Toast";
import type { EditScope, Visibility } from "@/lib/access";

type PortalItem = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  ownerNo: string;
  isOwner: boolean;
  visibility: Visibility;
  sharedWith: string[];
  editScope: EditScope;
  canEdit: boolean;
};

const VISIBILITY_LABEL: Record<Visibility, string> = {
  private: "非公開",
  shared: "指定ユーザーに公開",
  public: "全ユーザーに公開",
};

export default function PortalsPage() {
  const router = useRouter();
  const { mode, toggle } = useColorMode();
  const [portals, setPortals] = useState<PortalItem[]>([]);
  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PortalItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 設定ドロワー
  const [settingsTarget, setSettingsTarget] = useState<PortalItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formVisibility, setFormVisibility] = useState<Visibility>("private");
  const [formSharedWith, setFormSharedWith] = useState("");
  const [formEditScope, setFormEditScope] = useState<EditScope>("owner");
  const [saving, setSaving] = useState(false);

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
        {
          id,
          name,
          createdAt: now,
          updatedAt: now,
          ownerNo: "",
          isOwner: true,
          visibility: "private",
          sharedWith: [],
          editScope: "owner",
          canEdit: true,
        },
        ...prev,
      ]);
    } catch {
      setToast("ボードの作成に失敗しました");
    }
  };

  const openSettings = (portal: PortalItem) => {
    setSettingsTarget(portal);
    setFormName(portal.name);
    setFormVisibility(portal.visibility);
    setFormSharedWith(portal.sharedWith.join(", "));
    setFormEditScope(portal.editScope);
  };

  const saveSettings = async () => {
    if (!settingsTarget) return;
    const name = formName.trim();
    if (!name) {
      setToast("ボード名を入力してください");
      return;
    }
    const sharedWith = formSharedWith
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setSaving(true);
    try {
      const res = await fetch(`/api/portals/${settingsTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          visibility: formVisibility,
          sharedWith,
          editScope: formEditScope,
        }),
      });
      if (!res.ok) throw new Error();
      setPortals((list) =>
        list.map((p) =>
          p.id === settingsTarget.id
            ? {
                ...p,
                name,
                visibility: formVisibility,
                sharedWith,
                editScope: formEditScope,
              }
            : p
        )
      );
      setSettingsTarget(null);
    } catch {
      setToast("ボード設定の保存に失敗しました");
    } finally {
      setSaving(false);
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

  const visibilityChip = (portal: PortalItem) => {
    if (!portal.isOwner) {
      return (
        <Chip
          size="small"
          icon={<PeopleIcon />}
          label={`${portal.ownerNo} さんが共有`}
          variant="outlined"
        />
      );
    }
    if (portal.visibility === "public") {
      return (
        <Chip
          size="small"
          color="info"
          icon={<PublicIcon />}
          label={VISIBILITY_LABEL.public}
          variant="outlined"
        />
      );
    }
    if (portal.visibility === "shared") {
      return (
        <Chip
          size="small"
          color="success"
          icon={<PeopleIcon />}
          label={`${VISIBILITY_LABEL.shared} (${portal.sharedWith.length}人)`}
          variant="outlined"
        />
      );
    }
    return <Chip size="small" label={VISIBILITY_LABEL.private} variant="outlined" />;
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
                      <Tooltip title={portal.isOwner ? "設定" : "所有者のみ設定できます"}>
                        <span>
                          <IconButton
                            size="small"
                            disabled={!portal.isOwner}
                            onClick={() => openSettings(portal)}
                          >
                            <SettingsIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={portal.isOwner ? "削除" : "所有者のみ削除できます"}>
                        <span>
                          <IconButton
                            size="small"
                            disabled={!portal.isOwner}
                            onClick={() => setDeleteTarget(portal)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemButton
                    onClick={() => router.push(`/memo/${portal.id}`)}
                  >
                    <DashboardIcon
                      fontSize="small"
                      sx={{ mr: 1.5, color: "text.secondary" }}
                    />
                    <ListItemText
                      primary={
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <span>{portal.name}</span>
                          {visibilityChip(portal)}
                        </Box>
                      }
                      secondary={`更新: ${new Date(
                        portal.updatedAt
                      ).toLocaleString("ja-JP")}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Box>

      {/* 設定ドロワー */}
      <Drawer
        anchor="right"
        open={!!settingsTarget}
        onClose={() => setSettingsTarget(null)}
      >
        <Box
          sx={{
            width: 340,
            p: 3,
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
          }}
        >
          <Typography variant="h6">ボード設定</Typography>
          <Divider />

          <TextField
            label="名前"
            size="small"
            fullWidth
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />

          <FormControl>
            <FormLabel sx={{ fontSize: 14 }}>公開範囲</FormLabel>
            <RadioGroup
              value={formVisibility}
              onChange={(e) => setFormVisibility(e.target.value as Visibility)}
            >
              <FormControlLabel
                value="private"
                control={<Radio size="small" />}
                label="非公開（自分のみ）"
              />
              <FormControlLabel
                value="shared"
                control={<Radio size="small" />}
                label="指定ユーザーに公開"
              />
              <FormControlLabel
                value="public"
                control={<Radio size="small" />}
                label="全ユーザーに公開"
              />
            </RadioGroup>
          </FormControl>

          {formVisibility === "shared" && (
            <TextField
              label="公開するユーザー"
              size="small"
              fullWidth
              value={formSharedWith}
              onChange={(e) => setFormSharedWith(e.target.value)}
              placeholder="user1, user2"
              helperText="ユーザー名をカンマ区切りで入力"
            />
          )}

          <FormControl disabled={formVisibility === "private"}>
            <FormLabel sx={{ fontSize: 14 }}>編集権</FormLabel>
            <RadioGroup
              value={formEditScope}
              onChange={(e) => setFormEditScope(e.target.value as EditScope)}
            >
              <FormControlLabel
                value="owner"
                control={<Radio size="small" />}
                label="自分のみ編集可"
              />
              <FormControlLabel
                value="members"
                control={<Radio size="small" />}
                label="公開先のユーザーも編集可"
              />
            </RadioGroup>
            {formVisibility === "private" && (
              <Typography variant="caption" color="text.secondary">
                非公開のボードは自分だけが編集できます
              </Typography>
            )}
          </FormControl>

          <Box
            sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1 }}
          >
            <Button onClick={() => setSettingsTarget(null)}>キャンセル</Button>
            <Button
              variant="contained"
              onClick={saveSettings}
              disabled={saving || !formName.trim()}
            >
              保存
            </Button>
          </Box>
        </Box>
      </Drawer>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>「{deleteTarget?.name}」を削除しますか？</DialogTitle>
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
