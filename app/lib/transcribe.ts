/**
 * 文字起こしモジュール
 * TODO: Whisper API 等に差し替える
 */
export async function transcribe(audioBuffer: Buffer, filename: string): Promise<string> {
  // ダミー実装 — 実際の音声は処理しない
  return `[ダミー文字起こし] ファイル名: ${filename}, サイズ: ${audioBuffer.length} bytes\n作業内容: 現場にて配管工事を実施。接合部の確認を行い、漏れがないことを確認した。`;
}
