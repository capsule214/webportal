# webportal

リンクメモカード・画像・動画・リッチテキストノートを自由に配置できる、日本語UIのメモボードアプリケーションです。ユーザーごとに複数のメモボードを管理できます。

## 技術スタック

- Next.js 16.2.1（App Router / Proxy）
- React 19 / TypeScript（strict）
- Material UI v9 + Tailwind CSS v4
- TipTap v3（リッチテキスト編集）
- Sequelize + SQLite（`memo.db` にローカル保存）
- Sharp（サーバーサイド画像リサイズ）

## セットアップ

```bash
npm install
```

`.env.local` に認証情報を設定します。

```
AUTH_USERNAME=admin
AUTH_PASSWORD=password
SESSION_SECRET=change-me-to-a-long-random-string
# 複数ユーザーを使う場合は「ユーザー名:パスワード」をカンマ区切りで指定
# AUTH_USERS=user1:pass1,user2:pass2
```

セッションはユーザー名をHMAC-SHA256（`SESSION_SECRET`）で署名したCookieで管理し、
ボードやコンテンツはログインユーザー（`user_no`）ごとに分離されます。

## 起動

```bash
npm run dev    # 開発サーバー
npm run build  # 本番ビルド
npm run start  # 本番サーバー
npm run lint   # ESLint
```

## 画面構成

| 画面 | パス | 内容 |
| --- | --- | --- |
| ログイン | `/login` | ユーザー名・パスワードでログイン |
| メモボード一覧 | `/portals` | ボードの作成・名前変更・削除（論理削除）・選択 |
| メモボード | `/memo/[id]` | ボード上でカード・画像・動画・ノートを自由配置 |

## データ仕様

- `portals` — メモボードの一覧情報（id, name, deleted, user_no, created_at, updated_at）
- `contents` — ボード内要素の種類と座標（id, portal_id, content_name, type_id, deleted, x, y, w, h）
  - type_id: 1=URLリンク / 2=画像 / 3=動画 / 4=リッチテキストノート
- `contentdetails` — 1コンテンツの詳細情報（id, contents_id, contents）
  - URLリンク: meta行 `{"kind":"meta","titleColor":"…"}` とリンク行 `{"kind":"link","title":"…","url":"…"}` のJSON文字列
  - 画像: アップロードファイル名（実体は `uploads/` ディレクトリ）
  - 動画: YouTubeのURL
  - リッチテキスト: HTML文字列

削除はすべて `deleted` フラグによる論理削除です。

## 主なAPI

- `POST /api/auth/login` / `POST /api/auth/logout`
- `GET/POST /api/portals`、`PUT/DELETE /api/portals/[id]`
- `GET/POST /api/portals/[id]/contents` — ボードのコンテンツ一覧/作成
- `PUT/DELETE /api/contents/[id]` — コンテンツの更新（detailsは送った場合のみ作り直し）/論理削除
- `POST /api/contents/[id]/upload` — 画像アップロード（JPEG/PNG/WebP/GIF、20MBまで、1920x1080超はリサイズ）
- `GET /api/uploads/[name]` — アップロード画像の配信

すべての非認証APIと `/portals`・`/memo` 配下は `src/proxy.ts` が署名検証でガードします。

## 主な機能

- **メモカード**: リンク集をカードで管理。ドラッグ移動・リサイズ（10pxグリッドスナップ）、タイトルのインライン編集、タイトル色パレット、カード複製、削除確認モーダル。リンクはカード内の並べ替え・カード間の移動をドラッグ＆ドロップで行えます（挿入位置はインジケーター表示）。
- **画像**: プレースホルダーに画像ファイルをドロップまたはクリックで選択してアップロード。
- **動画**: YouTubeのURLを登録するとサムネイル表示。クリックでインライン再生（youtube-nocookie.com）。
- **リッチテキストノート**: TipTapによる書式付きメモ。編集は600msデバウンスで自動保存。
- ボード操作は楽観的更新で、API失敗時はロールバックしてトーストを表示。

## ディレクトリ構成

```
src/
├── app/
│   ├── page.tsx              # トップページ
│   ├── login/page.tsx        # ログイン画面
│   ├── portals/page.tsx      # メモボード一覧画面
│   ├── memo/[id]/page.tsx    # メモボード画面
│   └── api/                  # Route Handlers（auth / portals / contents / uploads）
├── components/
│   ├── AppThemeProvider.tsx  # MUIテーマ + ライト/ダーク切替
│   ├── Toast.tsx             # エラートースト
│   ├── DraggableCard.tsx     # リンクメモカード
│   ├── DraggableImage.tsx    # 画像
│   ├── DraggableRichText.tsx # リッチテキストノート
│   └── DraggableVideo.tsx    # YouTube動画
├── lib/
│   ├── db.ts                 # Sequelizeモデル（portals / contents / contentdetails）
│   └── session.ts            # HMAC署名付きセッション
└── proxy.ts                  # 認証ガード（Next.js 16 Proxy）
scripts/
└── migrate-legacy.mjs        # 旧スキーマからの移行スクリプト（実行済み）
```
