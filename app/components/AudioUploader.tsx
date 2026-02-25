"use client";

import { useRef, useState } from "react";

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

interface Props {
  /** Called with the transcribed text when transcription succeeds */
  onTranscribed: (text: string) => void;
}

export function AudioUploader({ onTranscribed }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSizeOver = file ? file.size > MAX_SIZE : false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setError(null);
    setDone(false);
  };

  const handleTranscribe = async () => {
    if (!file || isSizeOver) return;
    setIsLoading(true);
    setError(null);
    setDone(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "文字起こしに失敗しました。");
        return;
      }
      onTranscribed(data.text ?? "");
      setDone(true);
    } catch {
      setError("通信エラーが発生しました。ネットワーク接続を確認してください。");
    } finally {
      setIsLoading(false);
    }
  };

  const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : null;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label style={s.label}>
          音声ファイル（m4a / mp3 / wav / mp4 / webm、最大 25MB）
        </label>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.m4a,.mp3,.wav,.mp4,.webm,.ogg,.flac"
          onChange={handleFileChange}
          style={s.fileInput}
        />
        {file && (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: isSizeOver ? "#F87171" : "#555" }}>
            {file.name}　{fileSizeMB} MB
            {isSizeOver && "　— 25MB を超えています。"}
          </p>
        )}
      </div>

      <button
        onClick={handleTranscribe}
        disabled={!file || isSizeOver || isLoading}
        style={{
          ...s.btn,
          background: !file || isSizeOver || isLoading ? "#1A1A1A" : "#3B82F6",
          color: !file || isSizeOver || isLoading ? "#444" : "#fff",
          cursor: !file || isSizeOver || isLoading ? "not-allowed" : "pointer",
        }}
      >
        {isLoading ? "文字起こし中…" : "文字起こし開始"}
      </button>

      {isLoading && (
        <p style={{ fontSize: 13, color: "#3B82F6", margin: "10px 0 0" }}>
          ⏳ 音声を解析中です。しばらくお待ちください…
        </p>
      )}

      {done && (
        <p style={{ fontSize: 13, color: "#34D399", margin: "10px 0 0" }}>
          ✓ 文字起こし完了。上のテキストエリアに反映されました。
        </p>
      )}

      {error && (
        <div style={s.errorBox}>{error}</div>
      )}
    </div>
  );
}

const s = {
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "#555",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: 6,
  } as React.CSSProperties,

  fileInput: {
    display: "block",
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "9px 12px",
    background: "#1E1E1E",
    border: "1px solid #2C2C2C",
    borderRadius: 6,
    color: "#C0C0C0",
    fontSize: 14,
    cursor: "pointer",
  } as React.CSSProperties,

  btn: {
    padding: "10px 20px",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    transition: "opacity 0.15s",
  } as React.CSSProperties,

  errorBox: {
    marginTop: 10,
    padding: "9px 12px",
    background: "rgba(248,113,113,0.07)",
    border: "1px solid rgba(248,113,113,0.25)",
    borderRadius: 6,
    color: "#F87171",
    fontSize: 13,
  } as React.CSSProperties,
} as const;
