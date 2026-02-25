import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import type { ParsedSections } from "@/lib/reportFormatter";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SYSTEM_PROMPT = `あなたは建設現場の作業報告テキストから情報を抽出するアシスタントです。
自由作文は禁止。必ず以下のJSONスキーマだけを返してください。

{
  "morning": [],
  "afternoon": [],
  "quantity": [],
  "tomorrow": [],
  "preparation": [],
  "members": [],
  "notes": []
}

各フィールドの意味:
- morning: 午前中の作業（配列。各要素は1つの作業を表す文字列）
- afternoon: 午後の作業
- quantity: 出来高・数量（例: "型枠 50m²"、"コンクリート 3m³"、"掘削 5箇所"）
- tomorrow: 明日・次回の作業予定
- preparation: 準備物・段取り・持ち物・材料
- members: 作業メンバー名（1人1要素）
- notes: 連絡事項・注意点・申し送り

ルール:
- 情報がない項目は空配列[]を返す
- 箇条書き記号（・ー-）は除去してテキストのみ
- 各要素は簡潔に1文以内
- JSONのみ返す（説明文・コードブロック不要）`;

function normalizeArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === "string" && v.trim() !== "");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GROQ_API_KEY が設定されていません。Vercel の Environment Variables または .env.local に GROQ_API_KEY を追加してください。",
      },
      { status: 500 }
    );
  }

  let body: { transcription?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの解析に失敗しました。" },
      { status: 400 }
    );
  }

  if (!body.transcription?.trim()) {
    return NextResponse.json(
      { error: "文字起こしテキストが空です。" },
      { status: 400 }
    );
  }

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: body.transcription.trim() },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 1024,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "AIからの応答が空でした。" },
        { status: 500 }
      );
    }

    const raw = JSON.parse(content) as Record<string, unknown>;

    const sections: ParsedSections = {
      morning: normalizeArray(raw.morning),
      afternoon: normalizeArray(raw.afternoon),
      quantity: normalizeArray(raw.quantity),
      tomorrow: normalizeArray(raw.tomorrow),
      preparation: normalizeArray(raw.preparation),
      members: normalizeArray(raw.members),
      notes: normalizeArray(raw.notes),
    };

    return NextResponse.json({ sections });
  } catch (err: unknown) {
    console.error("[/api/report] Error:", err);

    if (err instanceof Groq.APIError) {
      if (err.status === 401) {
        return NextResponse.json(
          {
            error:
              "GROQ_API_KEY が無効です。キーの値を確認してください（https://console.groq.com/keys）。",
          },
          { status: 500 }
        );
      }
      if (err.status === 429) {
        return NextResponse.json(
          {
            error:
              "Groq API のレート制限に達しました。しばらく待ってから再試行してください。",
          },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: "AI抽出に失敗しました。しばらく待ってから再試行してください。" },
      { status: 500 }
    );
  }
}
