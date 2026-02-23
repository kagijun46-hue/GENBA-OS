import OpenAI from "openai";

export interface DailyReport {
  date: string;
  constructionName: string;
  location: string;
  workContent: string;
  issues: string;
  nextActions: string;
  transcription: string;
}

interface LLMFields {
  workContent: string;
  issues: string;
  nextActions: string;
}

/** OpenAI API 呼び出し失敗を呼び出し元に伝えるカスタムエラー */
export class SummarizeError extends Error {
  constructor(
    public readonly userMessage: string,
    public readonly statusCode: number = 500
  ) {
    super(userMessage);
    this.name = "SummarizeError";
  }
}

const SYSTEM_PROMPT = `あなたは建設現場の日報作成を支援するアシスタントです。
提供された文字起こしテキストから現場日報を作成し、以下のJSON形式のみで回答してください。

{
  "workContent": "本日の作業内容（具体的に、箇条書き可）",
  "issues": "問題・課題・懸念事項（なければ「特になし」）",
  "nextActions": "次回の作業予定・アクション（なければ「特になし」）"
}

注意:
- 文字起こしに含まれる情報のみを使用すること
- JSON以外のテキストは出力しないこと`;

async function extractWithLLM(
  transcription: string,
  constructionName: string,
  location: string
): Promise<LLMFields> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `工事名: ${constructionName}\n場所: ${location}\n\n文字起こし:\n${transcription}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 1024,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<LLMFields>;

  return {
    workContent: parsed.workContent ?? transcription,
    issues: parsed.issues ?? "特になし",
    nextActions: parsed.nextActions ?? "特になし",
  };
}

/**
 * 現場日報テンプレート要約 — OpenAI gpt-4o-mini
 * OPENAI_API_KEY が未設定の場合はテキストをそのまま整形して返す（フォールバック）
 * 差し替えポイント: このファイルを書き換えるだけで別 LLM に乗り換えられる
 */
export async function summarize(
  transcription: string,
  constructionName: string,
  location: string
): Promise<DailyReport> {
  const today = new Date().toISOString().split("T")[0];
  const base = { date: today, constructionName, location, transcription };

  if (!process.env.OPENAI_API_KEY) {
    // キーなし → テキストをそのまま作業内容として整形
    return { ...base, workContent: transcription, issues: "特になし", nextActions: "特になし" };
  }

  try {
    const fields = await extractWithLLM(transcription, constructionName, location);
    return { ...base, ...fields };
  } catch (err) {
    const e = err as { status?: number; message?: string };

    // サーフェスすべきエラーは SummarizeError として再スロー
    if (e.status === 401) {
      throw new SummarizeError(
        "OPENAI_API_KEY が無効です。https://platform.openai.com/api-keys で確認してください。",
        401
      );
    }
    if (e.status === 429) {
      throw new SummarizeError(
        "OpenAI API のレート制限を超えました。しばらく待ってから再試行してください。",
        429
      );
    }

    // それ以外は黙ってフォールバック
    console.error("[summarize] LLM 失敗、フォールバック:", err);
    return { ...base, workContent: transcription, issues: "特になし", nextActions: "特になし" };
  }
}

export function toMarkdown(report: DailyReport): string {
  return `# 現場日報

**日付:** ${report.date}
**工事名:** ${report.constructionName}
**場所:** ${report.location}

## 作業内容
${report.workContent}

## 問題・課題
${report.issues}

## 次回アクション
${report.nextActions}

---
*文字起こし原文:*
${report.transcription}
`;
}
