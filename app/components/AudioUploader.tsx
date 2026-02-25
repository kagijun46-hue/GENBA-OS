"use client";

import { useRef, useState } from "react";

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

interface Props {
  rawText: string;
  onRawTextChange: (text: string) => void;
}

export function AudioUploader({ rawText, onRawTextChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
  };

  const isSizeOver = file ? file.size > MAX_SIZE : false;

  const handleTranscribe = async () => {
    if (!file || isSizeOver) return;
    setIsLoading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "文字起こしに失敗しました。");
        return;
      }
      onRawTextChange(data.text ?? "");
    } catch {
      setError("通信エラーが発生しました。ネットワーク接続を確認してください。");
    } finally {
      setIsLoading(false);
    }
  };

  const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : null;

  const s = styles;

  return (
    <div>
      {/* File picker */}
      <div style={{ marginBottom: 12 }}>
        <label style={s.label}>音声ファイル</label>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.m4a,.mp3,.wav,.mp4,.webm,.ogg,.flac"
          onChange={handleFileChange}
          style={s.fileInput}
        />
        {file && (
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: isSizeOver ? "#EF4444" : "#757575",
            }}
          >
            {file.name}　{fileSizeMB} MB
            {isSizeOver && "　—　25MB を超えています。"}
          </div>
        )}
      </div>

      {/* Transcribe button */}
      <button
        onClick={handleTranscribe}
        disabled={!file || isSizeOver || isLoading}
        style={{
          ...s.btn,
          background:
            !file || isSizeOver || isLoading ? "#333" : "#4A90E2",
          color: !file || isSizeOver || isLoading ? "#757575" : "#FFF",
          cursor:
            !file || isSizeOver || isLoading ? "not-allowed" : "pointer",
          marginBottom: 12,
        }}
      >
        {isLoading ? "文字起こし中..." : "文字起こし開始"}
      </button>

      {/* Loading */}
      {isLoading && (
        <div style={{ marginBottom: 12, fontSize: 13, color: "#4A90E2" }}>
          ⏳ 音声を解析中です。しばらくお待ちください…
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={s.errorBox}>
          {error}
        </div>
      )}

      {/* Raw text textarea */}
      <div>
        <label style={s.label}>
          文字起こし結果
          <span style={{ color: "#757575", fontWeight: 400 }}>
            （編集可能）
          </span>
        </label>
        <textarea
          value={rawText}
          onChange={(e) => onRawTextChange(e.target.value)}
          placeholder="文字起こし後にここへ自動反映されます。直接入力・編集も可能です。"
          rows={7}
          style={s.textarea}
        />
      </div>
    </div>
  );
}

const styles = {
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#BDBDBD",
    marginBottom: 6,
  } as React.CSSProperties,

  fileInput: {
    display: "block",
    width: "100%",
    padding: "8px 12px",
    background: "#2C2C2C",
    border: "1px solid #3A3A3A",
    borderRadius: 6,
    color: "#F5F5F5",
    fontSize: 14,
    cursor: "pointer",
    boxSizing: "border-box",
  } as React.CSSProperties,

  btn: {
    display: "inline-block",
    padding: "10px 20px",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    transition: "background 0.15s",
  } as React.CSSProperties,

  errorBox: {
    marginBottom: 12,
    padding: "8px 12px",
    background: "rgba(239,68,68,0.1)",
    border: "1px solid #EF4444",
    borderRadius: 6,
    color: "#EF4444",
    fontSize: 13,
  } as React.CSSProperties,

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    background: "#2C2C2C",
    border: "1px solid #3A3A3A",
    borderRadius: 6,
    color: "#F5F5F5",
    fontSize: 14,
    lineHeight: 1.7,
    resize: "vertical",
    fontFamily: "inherit",
  } as React.CSSProperties,
} as const;
