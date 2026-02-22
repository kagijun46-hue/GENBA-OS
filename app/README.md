# GENBA-OS

音声アップロード → 文字起こし → 現場日報テンプレ要約 → `/outputs` に md/json 保存

## セットアップ・起動

```bash
cd app
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開く。

## 使い方

1. 工事名・場所を入力
2. 音声ファイル（m4a / wav / mp3）を選択
3. 「実行」ボタンをクリック
4. 文字起こしと現場日報が画面に表示され、`../outputs/` に md・json が保存される

## API

`POST /api/upload`

| フィールド | 型 | 説明 |
|---|---|---|
| constructionName | string | 工事名 |
| location | string | 場所 |
| audio | File | 音声ファイル |

## 環境変数

`.env.example` をコピーして `.env.local` を作成:

```bash
cp ../.env.example app/.env.local
```

## 差し替えポイント

- `lib/transcribe.ts` → Whisper API 等に差し替え
- `lib/summarize.ts` → Claude API 等に差し替え
