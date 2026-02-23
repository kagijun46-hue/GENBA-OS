import { NextResponse } from "next/server";

// ─── キャッシュ無効化（必須） ───────────────────────────────────────────────
// Next.js の GET Route Handler はデフォルトで静的キャッシュされる場合がある。
// force-dynamic にしないとビルド時(env未設定)のレスポンスが本番でも返り続ける。
export const dynamic = "force-dynamic";

// ─── 起動時ログ（ Cold Start ログ、キーの値は出さない） ──────────────────────
const _groqSet   = !!process.env.GROQ_API_KEY;
const _openaiSet = !!process.env.OPENAI_API_KEY;
console.log(
  `[health] cold-start — GROQ_API_KEY:${_groqSet ? "SET" : "MISSING"}` +
  ` OPENAI_API_KEY:${_openaiSet ? "SET" : "MISSING"}` +
  ` VERCEL_ENV:${process.env.VERCEL_ENV ?? "N/A"}` +
  ` NODE_ENV:${process.env.NODE_ENV}`
);

/** 環境変数の設定状況をクライアントに返す（キーの値は絶対に返さない） */
export async function GET() {
  return NextResponse.json(
    {
      groqKeySet:   !!process.env.GROQ_API_KEY,
      openaiKeySet: !!process.env.OPENAI_API_KEY,
      // デバッグ用：どの Vercel 環境か / どのリージョンか
      vercelEnv:    process.env.VERCEL_ENV   ?? process.env.NODE_ENV ?? "unknown",
      region:       process.env.VERCEL_REGION ?? "local",
      ts:           new Date().toISOString(),
    },
    {
      headers: {
        // ブラウザ・CDN キャッシュを完全に無効化
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
