# GENBA-OS

録音・貼り付け → 文字起こし → AI 日報生成 → md/json 保存（またはダウンロード）

---

## ローカル開発

```bash
cd app
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開く。

**環境変数の設定（初回のみ）:**

```bash
cp ../.env.example .env.local
# .env.local を開いて GROQ_API_KEY を設定する
```

> `GROQ_API_KEY` がなくても「テキスト貼り付け」モードは動作します（LLM 要約なし）。

ローカルでは処理結果を `outputs/` ディレクトリに `.md` / `.json` で保存します。

---

## Vercel でデプロイ（友達に URL で見せる）

### 手順

1. このリポジトリを GitHub に push する
2. https://vercel.com/new でリポジトリをインポート
3. **「Root Directory」を `app` に設定する**（⚠️ここが重要）
4. Framework は **Next.js** が自動検出される
5. **「Environment Variables」に `GROQ_API_KEY` を追加する**（下記参照）
6. 「Deploy」をクリック

```
Project Settings
├── Root Directory: app      ← ここを必ず設定する
└── Environment Variables
    └── GROQ_API_KEY = YOUR_GROQ_API_KEY
```

> **Note:** `app/` 配下が Next.js プロジェクトのルートです。Root Directory を設定しないとビルドが失敗します。

### Vercel に環境変数を設定する方法

デプロイ後に追加・変更する場合:

1. Vercel のプロジェクトページ → **Settings** → **Environment Variables**
2. 以下を追加:

| Name | Value | Environments |
|---|---|---|
| `GROQ_API_KEY` | Groq のキー | Production, Preview, Development |

3. **Save** → **Redeploy** で反映される

> Groq のキーは https://console.groq.com/keys で無料取得できます。

### Vercel 上の動作の違い

| | ローカル | Vercel |
|---|---|---|
| 結果の保存 | `outputs/` に md/json 保存 | 保存なし（永続 FS なし） |
| 結果の取得 | 保存先パスを表示 | 画面上にダウンロードボタンを表示 |

---

## 使い方

### テキスト貼り付け（推奨・GROQ_API_KEY なしでも動く）

1. SuperWhisper などで録音・文字起こしし、テキストをコピー
2. GENBA-OS を開く → **「テキスト貼り付け」タブ**（デフォルト）
3. 工事名・場所を入力
4. テキスト欄を長押し → **ペースト**
5. **「日報を生成する」**をタップ

> `GROQ_API_KEY` を設定すると Groq LLM が日報を自動整形します。未設定の場合はテキストをそのまま整形します。

### ブラウザで録音（GROQ_API_KEY 必要）

1. **「録音」タブ**を選択
2. 工事名・場所を入力
3. **「録音開始」**をタップ（マイク許可が必要）
4. 録音後 **「録音停止」**→ **「日報を生成する」**をタップ

### 音声ファイルをアップロード（GROQ_API_KEY 必要）

1. **「音声ファイル」タブ**を選択
2. 工事名・場所を入力
3. 音声ファイル（m4a / wav / mp3）を選択 → **「実行」**をタップ

---

## API

`POST /api/summarize`（JSON — テキスト貼り付け・録音モード）

| フィールド | 型 | 説明 |
|---|---|---|
| `constructionName` | string | 工事名 |
| `location` | string | 場所 |
| `transcription` | string | 文字起こしテキスト |

`POST /api/upload`（multipart/form-data — 音声ファイルモード）

| フィールド | 型 | 説明 |
|---|---|---|
| `constructionName` | string | 工事名 |
| `location` | string | 場所 |
| `audio` | File | 音声ファイル |

共通レスポンス:

```json
{
  "transcription": "文字起こしテキスト",
  "summary": "現場日報 (markdown)",
  "outputPath": "/path/to/outputs/... または null",
  "mdContent": "日報 md テキスト",
  "jsonContent": "日報 json テキスト",
  "slug": "YYYYMMDD_HHMM_工事名_場所"
}
```

---

## 差し替えポイント

| ファイル | 現在の実装 | 差し替え先の例 |
|---|---|---|
| `lib/transcribe.ts` | Groq whisper-large-v3 ✅ | Azure Speech, Google STT |
| `lib/summarize.ts` | Groq llama-3.3-70b ✅ | Claude API, GPT-4o |

環境変数は `.env.example` を参照:

```bash
cp ../.env.example .env.local  # ← app/ ディレクトリ内で実行
```
