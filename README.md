# webportal

リンクメモカード・画像・リッチテキストノートを自由に配置できる、日本語UIのメモボードアプリケーションです。

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
```

## 起動

```bash
npm run dev    # 開発サーバー
npm run build  # 本番ビルド
npm run start  # 本番サーバー
npm run lint   # ESLint
```

http://localhost:3000 を開き、「メモボードを開く」→ ログインすると `/memo` のボードが使えます。

## 主な機能

- **メモカード**: リンク集をカードで管理。ドラッグ移動・リサイズ（10pxグリッドスナップ）、タイトルのインライン編集、タイトル色パレット、カード複製、削除確認モーダル。リンクはカード内・カード間でドラッグ＆ドロップ移動可能。
- **画像**: プレースホルダーに画像ファイルをドロップまたはクリックで選択してアップロード。JPEG/PNG/WebP/GIF、最大20MB、最大50枚。1920x1080を超える画像はSharpで自動リサイズ（GIFは無加工）。画像はSQLiteにBLOBとして保存。
- **リッチテキストノート**: TipTapによる書式付きメモ。見出し・リスト・配置・文字色・文字サイズ・ハイライト・表などに対応。編集は600msデバウンスで自動保存。
- **認証**: `src/proxy.ts` が `/memo` と `/api/*`（認証系を除く）をセッションCookieでガード。
- ボード操作は楽観的更新で、API失敗時はロールバックしてトーストを表示。

## ディレクトリ構成

```
src/
├── app/
│   ├── page.tsx              # トップページ
│   ├── login/page.tsx        # ログイン
│   ├── memo/page.tsx         # メモボード
│   └── api/                  # Route Handlers（auth / cards / images / rich-texts）
├── components/
│   ├── AppThemeProvider.tsx  # MUIテーマ + ライト/ダーク切替
│   ├── Toast.tsx             # エラートースト
│   ├── DraggableCard.tsx     # リンクメモカード
│   ├── DraggableImage.tsx    # 画像
│   └── DraggableRichText.tsx # リッチテキストノート
├── lib/db.ts                 # Sequelizeモデル（cards / links / images / rich_texts）
└── proxy.ts                  # 認証ガード（Next.js 16 Proxy）
```
