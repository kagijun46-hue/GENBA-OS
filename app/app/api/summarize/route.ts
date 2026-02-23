import { NextRequest, NextResponse } from "next/server";
import { summarize, toMarkdown } from "@/lib/summarize";
import { saveReport } from "@/lib/save";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { constructionName, location, transcription } = body ?? {};

  if (!constructionName?.trim()) {
    return NextResponse.json({ error: "工事名は必須です" }, { status: 400 });
  }
  if (!location?.trim()) {
    return NextResponse.json({ error: "場所は必須です" }, { status: 400 });
  }
  if (!transcription?.trim()) {
    return NextResponse.json({ error: "文字起こしテキストは必須です" }, { status: 400 });
  }

  try {
    const report = await summarize(
      transcription.trim(),
      constructionName.trim(),
      location.trim()
    );
    const { outputPath, mdContent, jsonContent, slug } = await saveReport(report);

    return NextResponse.json({
      transcription: transcription.trim(),
      summary: toMarkdown(report),
      outputPath,
      mdContent,
      jsonContent,
      slug,
    });
  } catch (err) {
    console.error("[/api/summarize]", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
