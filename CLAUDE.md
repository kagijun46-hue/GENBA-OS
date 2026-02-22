# GENBA-OS

## 目的

音声アップロード → 文字起こし → 現場日報テンプレ要約 → `/outputs` に md/json 保存

## スタック

- Next.js 15 (App Router, TypeScript)
- API Routes で処理パイプラインを構成

## ディレクトリ

```
src/
  app/
    page.tsx              # アップロード UI
    api/process/route.ts  # メインパイプライン
  lib/
    transcribe.ts         # 文字起こし（差し替えポイント）
    summarize.ts          # 要約（差し替えポイント）
    save.ts               # /outputs へ md/json 保存
outputs/                  # 生成ファイル置き場（gitignore）
```

## 差し替えポイント

- `lib/transcribe.ts` → Whisper API 等に差し替え
- `lib/summarize.ts` → Claude API 等に差し替え
- 初期実装はダミー関数でOK

## コマンド

```bash
npm run dev   # 開発サーバー
npm run build # ビルド確認
```

## 規則

- MVP優先。不要な抽象化・ライブラリ追加は禁止
- 環境変数は `.env.local`、`.env.example` に雛形を置く
- `outputs/` は `.gitignore` に追加
