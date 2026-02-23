import type { NextConfig } from "next";

// ─── ビルド時・起動時の環境変数チェック ────────────────────────────────────
// Vercel でビルドログ (Build Output) に表示される。
// 値は絶対に出力しない。存在有無のみ。
const REQUIRED_FOR_AUDIO = ["GROQ_API_KEY"] as const;
const OPTIONAL           = ["OPENAI_API_KEY"] as const;

for (const key of REQUIRED_FOR_AUDIO) {
  if (!process.env[key]) {
    console.warn(`[next.config] ⚠ ${key} is NOT SET — 録音/ファイルタブは動作しません`);
  } else {
    console.log(`[next.config] ✓ ${key} is SET`);
  }
}
for (const key of OPTIONAL) {
  console.log(
    `[next.config] ${process.env[key] ? "✓" : "–"} ${key} ${process.env[key] ? "is SET" : "is NOT SET (optional)"}`
  );
}

const nextConfig: NextConfig = {};

export default nextConfig;
