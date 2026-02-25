import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const SUPPORTED_EXTENSIONS = [
  ".mp3",
  ".mp4",
  ".m4a",
  ".wav",
  ".webm",
  ".ogg",
  ".flac",
  ".mpeg",
  ".mpga",
];

function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  const map: Record<string, string> = {
    mp3: "audio/mpeg",
    mp4: "audio/mp4",
    m4a: "audio/mp4",
    wav: "audio/wav",
    webm: "audio/webm",
    ogg: "audio/ogg",
    flac: "audio/flac",
    mpeg: "audio/mpeg",
    mpga: "audio/mpeg",
  };
  return map[ext] ?? "audio/mpeg";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY が設定されていません。Vercel の Environment Variables または .env.local を確認してください。",
      },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      {
        error:
          "リクエストの解析に失敗しました。multipart/form-data で送信してください。",
      },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      {
        error:
          'ファイルが見つかりません。フィールド名 "file" で音声ファイルを送信してください。',
      },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "ファイルが空です。" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        error: `ファイルサイズが上限 (25MB) を超えています。現在: ${(
          file.size /
          1024 /
          1024
        ).toFixed(1)}MB`,
      },
      { status: 400 }
    );
  }

  const filename = file.name || "audio.mp3";
  const dotExt = "." + (filename.split(".").pop() ?? "");
  if (!SUPPORTED_EXTENSIONS.includes(dotExt.toLowerCase())) {
    return NextResponse.json(
      {
        error: `対応していないファイル形式です。対応形式: ${SUPPORTED_EXTENSIONS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  try {
    const buffer = await file.arrayBuffer();
    const mimeType = getMimeType(filename);
    const audioFile = new File([buffer], filename, { type: mimeType });

    const openai = new OpenAI({ apiKey });
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "ja",
    });

    return NextResponse.json({
      text: response.text,
      filename,
    });
  } catch (err: unknown) {
    console.error("[/api/transcribe] Error:", err);

    if (err instanceof OpenAI.APIError) {
      if (err.status === 401) {
        return NextResponse.json(
          {
            error:
              "OpenAI API キーが無効です。OPENAI_API_KEY の値を確認してください。",
          },
          { status: 500 }
        );
      }
      if (err.status === 429) {
        return NextResponse.json(
          {
            error:
              "OpenAI API のレート制限に達しました。しばらく待ってから再試行してください。",
          },
          { status: 429 }
        );
      }
      if (err.status === 400) {
        return NextResponse.json(
          {
            error:
              "ファイルの処理に失敗しました。対応形式・サイズを確認してください。",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          "文字起こしに失敗しました。しばらく待ってから再試行してください。",
      },
      { status: 500 }
    );
  }
}
