import { NextRequest, NextResponse } from "next/server";
import { transcribe } from "@/lib/transcribe";
import { summarize, toMarkdown } from "@/lib/summarize";
import { saveReport } from "@/lib/save";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audio = formData.get("audio");

  if (!audio || typeof audio === "string") {
    return NextResponse.json({ error: "音声ファイルが必要です" }, { status: 400 });
  }

  const filename = (audio as File).name;
  const buffer = Buffer.from(await (audio as File).arrayBuffer());

  const transcription = await transcribe(buffer, filename);
  const report = await summarize(transcription);

  const slug = `${report.date}-${Date.now()}`;
  const outputPath = await saveReport(report, slug);

  return NextResponse.json({
    outputPath,
    summary: toMarkdown(report),
  });
}
