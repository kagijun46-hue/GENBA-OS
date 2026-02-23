import { NextResponse } from "next/server";

/** 環境変数の設定状況をクライアントに返す（キーの値は絶対に返さない） */
export async function GET() {
  return NextResponse.json({
    groqKeySet:    !!process.env.GROQ_API_KEY,
    openaiKeySet:  !!process.env.OPENAI_API_KEY,
  });
}
