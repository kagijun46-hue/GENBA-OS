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

**環境変数の設定（初回のみ）:**

```bash
cp ../.env.example .env.local
# .env.local を開いて OPENAI_API_KEY を設定する
```

ローカルでは処理結果を `outputs/` ディレクトリに `.md` / `.json` で保存する。

---

## Vercel でデプロイ（友達に URL で見せる）

### 手順

1. このリポジトリを GitHub に push する
2. https://vercel.com/new でリポジトリをインポート
3. **「Root Directory」を `app` に設定する**（⚠️ここが重要）
4. Framework は **Next.js** が自動検出される
5. **「Environment Variables」に `OPENAI_API_KEY` を追加する**（下記参照）
6. 「Deploy」をクリック

```
Project Settings
├── Root Directory: app          ← ここを必ず設定する
└── Environment Variables
    └── OPENAI_API_KEY = YOUR_OPENAI_API_KEY  ← Whisper 文字起こしに必要
```

> **Note:** `app/` 配下が Next.js プロジェクトのルートです。
> Root Directory を設定しないとビルドが失敗します。

### Vercel に環境変数を設定する方法

デプロイ後に追加・変更する場合:

1. Vercel のプロジェクトページ → **Settings** → **Environment Variables**
2. 以下を追加:

| Name | Value | Environments |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI のキー | Production, Preview, Development |

3. **Save** → **Redeploy** で反映される

> OpenAI のキーは https://platform.openai.com/api-keys で発行できます（無料枠あり）。

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

| ファイル | 現在の実装 | 差し替え先の例 |
|---|---|---|
| `lib/transcribe.ts` | OpenAI Whisper API ✅ | Azure Speech, Google STT |
| `lib/summarize.ts` | ダミー（固定テンプレ） | Claude API, GPT-4o |

環境変数は `.env.example` を参照:

```bash
cp ../.env.example .env.local  # ← app/ ディレクトリ内で実行
```
