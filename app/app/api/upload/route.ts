import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { transcribe, TranscribeError } from "@/lib/transcribe";
import { summarize, toMarkdown, SummarizeError } from "@/lib/summarize";
import { saveReport } from "@/lib/save";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const constructionName = formData.get("constructionName");
  const location = formData.get("location");
  const audio = formData.get("audio");

  if (!constructionName || typeof constructionName !== "string" || !constructionName.trim()) {
    return NextResponse.json({ error: "工事名は必須です" }, { status: 400 });
  }
  if (!location || typeof location !== "string" || !location.trim()) {
    return NextResponse.json({ error: "場所は必須です" }, { status: 400 });
  }
  if (!audio || typeof audio === "string") {
    return NextResponse.json({ error: "音声ファイルは必須です" }, { status: 400 });
  }

  const audioFile = audio as File;
  const buffer = Buffer.from(await audioFile.arrayBuffer());

  // 一時保存（Vercel の /tmp も書き込み可能）
  const tmpPath = path.join(os.tmpdir(), `genba-${Date.now()}-${audioFile.name}`);
  await fs.writeFile(tmpPath, buffer);

  try {
    const transcription = await transcribe(buffer, audioFile.name);
    const report = await summarize(transcription, constructionName.trim(), location.trim());
    const { outputPath, mdContent, jsonContent, slug } = await saveReport(report);

    return NextResponse.json({
      transcription,
      summary: toMarkdown(report),
      outputPath,
      mdContent,
      jsonContent,
      slug,
    });
  } catch (err) {
    if (err instanceof TranscribeError) {
      return NextResponse.json({ error: err.userMessage }, { status: err.statusCode });
    }
    if (err instanceof SummarizeError) {
      return NextResponse.json({ error: err.userMessage }, { status: err.statusCode });
    }
    console.error("[/api/upload]", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  } finally {
    await fs.unlink(tmpPath).catch(() => undefined);
  }
}
