// 旧スキーマ（cards/links/images/rich_texts/videos）のデータを
// 新スキーマ（portals/contents/contentdetails）へ移行するワンショットスクリプト。
// 事前に新スキーマのテーブルが作成されている必要がある（サーバーを一度起動する）。
//
// 使い方: node scripts/migrate-legacy.mjs [user_no] [ボード名]
import sqlite3 from "sqlite3";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const userNo = process.argv[2] ?? "admin";
const portalName = process.argv[3] ?? "マイボード";

const db = new sqlite3.Database(path.join(root, "memo.db"));
const all = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );
const run = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    })
  );

const tableExists = async (name) =>
  (
    await all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [name]
    )
  ).length > 0;

const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

async function main() {
  if (!(await tableExists("portals"))) {
    throw new Error(
      "新スキーマのテーブルがありません。先にサーバーを一度起動してください。"
    );
  }

  const hasLegacy = await tableExists("cards");
  if (!hasLegacy) {
    console.log("旧テーブルが見つからないため移行は不要です。");
    return;
  }

  // Sequelizeが読めるSQLite日時形式（YYYY-MM-DD HH:MM:SS.SSS +00:00）
  const now = new Date()
    .toISOString()
    .replace("T", " ")
    .replace("Z", " +00:00");
  const portal = await run(
    "INSERT INTO portals (name, deleted, user_no, created_at, updated_at) VALUES (?, 0, ?, ?, ?)",
    [portalName, userNo, now, now]
  );
  const portalId = portal.lastID;
  console.log(`portal作成: id=${portalId} name=${portalName} user=${userNo}`);

  const insertContent = async (typeId, name, x, y, w, h) =>
    (
      await run(
        "INSERT INTO contents (portal_id, content_name, type_id, deleted, x, y, w, h) VALUES (?, ?, ?, 0, ?, ?, ?, ?)",
        [portalId, name ?? "", typeId, x ?? 0, y ?? 0, w ?? 200, h ?? 140]
      )
    ).lastID;
  const insertDetail = (contentsId, contents) =>
    run("INSERT INTO contentdetails (contents_id, contents) VALUES (?, ?)", [
      contentsId,
      contents,
    ]);

  // カード + リンク → type 1
  const cards = await all("SELECT * FROM cards ORDER BY z_index ASC");
  for (const card of cards) {
    const contentId = await insertContent(
      1, card.title, card.x, card.y, card.width, card.height
    );
    await insertDetail(
      contentId,
      JSON.stringify({ kind: "meta", titleColor: card.title_color || "#3b82f6" })
    );
    const links = await all(
      "SELECT * FROM links WHERE card_id = ? ORDER BY sort_order ASC",
      [card.id]
    );
    for (const link of links) {
      await insertDetail(
        contentId,
        JSON.stringify({ kind: "link", title: link.title, url: link.url })
      );
    }
    console.log(`カード移行: ${card.title} (リンク${links.length}件)`);
  }

  // 画像 → type 2（BLOBはuploads/へファイルとして書き出す）
  if (await tableExists("images")) {
    const images = await all("SELECT * FROM images ORDER BY z_index ASC");
    const uploadDir = path.join(root, "uploads");
    await mkdir(uploadDir, { recursive: true });
    for (const image of images) {
      const contentId = await insertContent(
        2, "", image.x, image.y, image.width, image.height
      );
      if (image.data && image.mime_type) {
        const ext = EXT_BY_MIME[image.mime_type] ?? ".png";
        const fileName = `legacy_${contentId}${ext}`;
        await writeFile(path.join(uploadDir, fileName), image.data);
        await insertDetail(contentId, fileName);
        console.log(`画像移行: ${fileName}`);
      } else {
        console.log(`画像移行: id=${image.id} (プレースホルダー)`);
      }
    }
  }

  // 動画 → type 3
  if (await tableExists("videos")) {
    const videos = await all("SELECT * FROM videos ORDER BY z_index ASC");
    for (const video of videos) {
      const contentId = await insertContent(
        3, "", video.x, video.y, video.width, video.height
      );
      if (video.url) await insertDetail(contentId, video.url);
      console.log(`動画移行: ${video.url || "(未登録)"}`);
    }
  }

  // リッチテキスト → type 4
  if (await tableExists("rich_texts")) {
    const notes = await all("SELECT * FROM rich_texts ORDER BY z_index ASC");
    for (const note of notes) {
      const contentId = await insertContent(
        4, "", note.x, note.y, note.width, note.height
      );
      await insertDetail(contentId, note.content ?? "");
      console.log("ノート移行: 1件");
    }
  }

  // 旧テーブルは *_legacy にリネームして残す
  for (const table of ["cards", "links", "images", "rich_texts", "videos"]) {
    if (await tableExists(table)) {
      await run(`ALTER TABLE ${table} RENAME TO ${table}_legacy`);
    }
  }
  console.log("移行完了。旧テーブルは *_legacy にリネームしました。");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.close());
