# Shift Maker

飲食店向け月間シフト自動作成 Web アプリ（MVP）

## 起動方法

```bash
cd shift-maker
npm install
npm run seed    # 初期データ投入（任意）
npm run dev     # 開発サーバー起動
```

ブラウザで http://localhost:3000 を開く（/schedule にリダイレクト）

## 使い方

### 1. スタッフ登録 `/staff`
- 「＋ 追加」ボタンでスタッフを登録
- 名前・役割（リーダー/ホール/キッチン）・優先度（1〜5）・週の上限回数を設定

### 2. 月設定 `/settings`
- 対象年月を選択
- シフト枠（例: `08:00-17:00`, `11:00-L`, `17:00-22:00`）を設定
- 曜日区分（平日/土日）×枠×役割ごとの必要人数を入力して「保存」

### 3. 希望入力 `/requests`
- スタッフを選択してカレンダーを表示
- 各日をタップして状態を切り替え:
  - 未タップ → 出勤可（全枠）
  - 1回タップ → × 不可（赤表示）
- 「希望を保存」で送信

### 4. シフト自動作成 `/schedule`
- 「⚡ 自動作成」ボタンで1ヶ月分のシフト案を生成
- テーブルの各セルをタップしてスタッフを手動変更
- 「CSV」ボタンでエクスポート、「印刷」ボタンで印刷

## 自動編成ルール

- 希望×の日は割り当てない
- 役割（リーダー → ホール → キッチンの順）を優先配置
- 同日に同一スタッフを複数枠に入れない
- 週の上限回数を超える場合は警告
- 3日以上連続出勤で警告

## データ保存場所

`/data/` ディレクトリに JSON ファイルとして保存されます。

```
data/
  staff.json       # スタッフ情報
  settings.json    # 月設定（枠・必要人数）
  requests.json    # スタッフ希望
  assignments.json # シフト割り当て
```

> `data/*.json` は `.gitignore` に追加されています。本番環境に移行する際は DB（PostgreSQL 等）に差し替えてください。

## DB移行について

`src/lib/db.ts` が唯一のデータアクセス層です。同インターフェースを実装した DB 版ファイルに差し替えるだけで移行できます。

## 技術スタック

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- JSON ファイル（`/data/*.json`）によるローカルストレージ

## ディレクトリ構成

```
src/
  app/
    page.tsx                       # / → /schedule にリダイレクト
    layout.tsx
    staff/page.tsx                 # スタッフ管理
    settings/page.tsx              # 月設定
    requests/page.tsx              # 希望入力
    schedule/page.tsx              # シフト表・自動作成
    api/
      staff/route.ts               # GET, POST
      staff/[id]/route.ts          # PUT, DELETE
      settings/route.ts            # GET, POST
      requests/route.ts            # GET, POST
      schedule/route.ts            # GET, PUT, DELETE
      schedule/generate/route.ts   # POST（自動編成）
      schedule/export/route.ts     # GET（CSV出力）
  lib/
    types.ts                       # データモデル定義
    db.ts                          # JSON ファイル I/O
    scheduler.ts                   # 自動編成アルゴリズム（貪欲法）
  components/
    Nav.tsx                        # ナビゲーション（タブバー）
scripts/
  seed.ts                          # 初期データ投入
data/                              # JSONファイル置き場（gitignore）
```
