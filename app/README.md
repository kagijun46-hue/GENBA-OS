# GENBA-OS

音声アップロード → 文字起こし → 現場日報テンプレ要約 → md/json 保存（またはダウンロード）

---

## ローカル開発

```bash
cd app
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開く。

ローカルでは処理結果を `outputs/` ディレクトリに `.md` / `.json` で保存する。

---

## Vercel でデプロイ（友達に URL で見せる）

### 手順

1. このリポジトリを GitHub に push する
2. https://vercel.com/new でリポジトリをインポート
3. **「Root Directory」を `app` に設定する**（⚠️ここが重要）
4. Framework は **Next.js** が自動検出される
5. 「Deploy」をクリック

```
Project Settings
└── Root Directory: app   ← ここを必ず設定する
```

> **Note:** `app/` 配下が Next.js プロジェクトのルートです。
> Root Directory を設定しないとビルドが失敗します。

### Vercel 上の動作の違い

| | ローカル | Vercel |
|---|---|---|
| 結果の保存 | `outputs/` に md/json 保存 | 保存なし（永続 FS なし） |
| 結果の取得 | 保存先パスを表示 | 画面上にダウンロードボタンを表示 |

Vercel 上ではファイルの永続保存ができないため、生成した日報は画面から `.md` / `.json` としてダウンロードできます。

---

## 使い方

1. 工事名・場所を入力
2. 音声ファイル（m4a / wav / mp3）を選択
3. 「実行」ボタンをクリック
4. 処理ステップ（アップロード → 文字起こし → 要約 → 保存）が表示される
5. 文字起こしと現場日報が画面に表示される

---

## API

`POST /api/upload`（multipart/form-data）

| フィールド | 型 | 説明 |
|---|---|---|
| `constructionName` | string | 工事名 |
| `location` | string | 場所 |
| `audio` | File | 音声ファイル |

レスポンス（JSON）:

```json
{
  "transcription": "文字起こしテキスト",
  "summary": "現場日報 (markdown)",
  "outputPath": "/path/to/outputs/... or null",
  "mdContent": "日報 md テキスト",
  "jsonContent": "日報 json テキスト",
  "slug": "YYYYMMDD_HHMM_工事名_場所"
}
```

---

## 差し替えポイント

| ファイル | 内容 |
|---|---|
| `lib/transcribe.ts` | Whisper API 等に差し替え |
| `lib/summarize.ts` | Claude API 等に差し替え |

環境変数は `.env.example` → `.env.local` にコピーして設定:

```bash
cp ../.env.example app/.env.local
```
