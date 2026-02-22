import OpenAI, { toFile } from "openai";

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // Whisper API の上限 25MB

const SUPPORTED_EXTS = ["mp3", "mp4", "m4a", "wav", "webm", "ogg", "mpeg", "mpga"];

const MIME_MAP: Record<string, string> = {
  mp3:  "audio/mpeg",
  mpeg: "audio/mpeg",
  mpga: "audio/mpeg",
  mp4:  "audio/mp4",
  m4a:  "audio/mp4",
  wav:  "audio/wav",
  ogg:  "audio/ogg",
  webm: "audio/webm",
};

/** API 呼び出し失敗を呼び出し元に伝えるカスタムエラー */
export class TranscribeError extends Error {
  constructor(
    public readonly userMessage: string,
    public readonly statusCode: number = 400
  ) {
    super(userMessage);
    this.name = "TranscribeError";
  }
}

function getExt(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

/**
 * 音声文字起こし — OpenAI Whisper API
 * 差し替えポイント: このファイルを書き換えるだけで別サービスに乗り換えられる
 */
export async function transcribe(audioBuffer: Buffer, filename: string): Promise<string> {
  // 1. API キー確認
  if (!process.env.OPENAI_API_KEY) {
    throw new TranscribeError(
      "OPENAI_API_KEY が設定されていません。" +
        "ローカルは .env.local、Vercel は Environment Variables に設定してください。",
      500
    );
  }

  // 2. ファイルサイズ確認
  if (audioBuffer.length > MAX_SIZE_BYTES) {
    const mb = (audioBuffer.length / 1024 / 1024).toFixed(1);
    throw new TranscribeError(
      `ファイルサイズが上限（25MB）を超えています（${mb} MB）。短いファイルを使用してください。`
    );
  }

  // 3. 拡張子確認
  const ext = getExt(filename);
  if (!SUPPORTED_EXTS.includes(ext)) {
    throw new TranscribeError(
      `非対応のファイル形式です（.${ext}）。対応形式: ${SUPPORTED_EXTS.join(", ")}`
    );
  }

  const mimeType = MIME_MAP[ext] ?? "audio/mpeg";
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const file = await toFile(audioBuffer, filename, { type: mimeType });
    const response = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "ja",
    });
    return response.text;
  } catch (err) {
    if (err instanceof TranscribeError) throw err;

    // OpenAI SDK が投げる APIError をユーザー向けメッセージに変換
    const e = err as { status?: number; message?: string; code?: string; error?: { code?: string } };

    if (e.status === 401) {
      throw new TranscribeError(
        "OPENAI_API_KEY が無効です。正しいキーを設定してください。",
        401
      );
    }
    if (e.status === 429) {
      throw new TranscribeError(
        "OpenAI API のレート制限に達しました。しばらく待ってから再試行してください。",
        429
      );
    }
    if (e.status === 400 || e.error?.code === "audio_too_long") {
      throw new TranscribeError(
        `音声ファイルを処理できませんでした。形式・長さを確認してください。` +
          (e.message ? ` (${e.message})` : "")
      );
    }

    throw new TranscribeError(
      `文字起こし中にエラーが発生しました: ${e.message ?? "不明なエラー"}`,
      500
    );
  }
}
