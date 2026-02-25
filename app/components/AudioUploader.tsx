"use client";

import { useEffect, useRef, useState } from "react";

const MAX_SIZE = 25 * 1024 * 1024;

interface Props {
  rawText: string;
  onRawTextChange: (text: string) => void;
}

export function AudioUploader({ rawText, onRawTextChange }: Props) {
  const [openaiAvailable, setOpenaiAvailable] = useState<boolean | null>(null); // null = checking
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check whether OPENAI_API_KEY is configured on the server
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setOpenaiAvailable(!!d.openaiKeySet))
      .catch(() => setOpenaiAvailable(false));
  }, []);

  const isSizeOver = file ? file.size > MAX_SIZE : false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setError(null);
  };

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
  const canTranscribe = openaiAvailable === true;

  return (
    <div>
      {/* OPENAI_API_KEY missing → guidance */}
      {openaiAvailable === false && (
        <div style={s.infoBox}>
          <span style={{ fontWeight: 600 }}>OPENAI_API_KEY が未設定</span> のため音声文字起こしは無効です。
          <br />
          文字起こし済みテキストを下のテキストエリアに直接貼り付けてください。
        </div>
      )}

      {/* File picker — shown only when key is available */}
      {canTranscribe && (
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>音声ファイル（m4a / mp3 / wav / mp4 / webm、最大 25MB）</label>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,.m4a,.mp3,.wav,.mp4,.webm,.ogg,.flac"
            onChange={handleFileChange}
            style={s.fileInput}
          />
          {file && (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: isSizeOver ? C.error : C.muted }}>
              {file.name}　{fileSizeMB} MB
              {isSizeOver && "　— 25MB を超えています。"}
            </p>
          )}
        </div>
      )}

      {/* Transcribe button */}
      {canTranscribe && (
        <button
          onClick={handleTranscribe}
          disabled={!file || isSizeOver || isLoading}
          style={{
            ...s.btn,
            background: !file || isSizeOver || isLoading ? C.btnDisabledBg : C.accent,
            color: !file || isSizeOver || isLoading ? C.muted : "#fff",
            cursor: !file || isSizeOver || isLoading ? "not-allowed" : "pointer",
            marginBottom: 14,
          }}
        >
          {isLoading ? "文字起こし中…" : "文字起こし開始"}
        </button>
      )}

      {isLoading && (
        <p style={{ fontSize: 13, color: C.accent, margin: "0 0 12px" }}>
          ⏳ 音声を解析中です。しばらくお待ちください…
        </p>
      )}

      {error && <div style={s.errorBox}>{error}</div>}

      {/* Textarea — always shown */}
      <div>
        <label style={s.label}>
          文字起こし結果
          <span style={{ color: C.muted, fontWeight: 400 }}>（編集可能）</span>
        </label>
        <textarea
          value={rawText}
          onChange={(e) => onRawTextChange(e.target.value)}
          placeholder={
            canTranscribe
              ? "文字起こし後にここへ自動反映されます。直接入力・編集も可能です。"
              : "ここに文字起こし済みのテキストを貼り付けてください。"
          }
          rows={7}
          style={s.textarea}
        />
      </div>
    </div>
  );
}

// Design tokens
const C = {
  accent: "#3B82F6",
  error: "#F87171",
  muted: "#666",
  btnDisabledBg: "#1E1E1E",
} as const;

const s = {
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#888",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  } as React.CSSProperties,

  fileInput: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 12px",
    background: "#1E1E1E",
    border: "1px solid #2C2C2C",
    borderRadius: 6,
    color: "#E0E0E0",
    fontSize: 14,
    cursor: "pointer",
  } as React.CSSProperties,

  btn: {
    display: "inline-block",
    padding: "10px 20px",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    transition: "opacity 0.15s",
  } as React.CSSProperties,

  infoBox: {
    marginBottom: 16,
    padding: "10px 14px",
    background: "rgba(59,130,246,0.08)",
    border: "1px solid rgba(59,130,246,0.25)",
    borderRadius: 6,
    color: "#93C5FD",
    fontSize: 13,
    lineHeight: 1.6,
  } as React.CSSProperties,

  errorBox: {
    marginBottom: 14,
    padding: "10px 14px",
    background: "rgba(248,113,113,0.08)",
    border: "1px solid rgba(248,113,113,0.3)",
    borderRadius: 6,
    color: "#F87171",
    fontSize: 13,
  } as React.CSSProperties,

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    background: "#1E1E1E",
    border: "1px solid #2C2C2C",
    borderRadius: 6,
    color: "#E0E0E0",
    fontSize: 14,
    lineHeight: 1.7,
    resize: "vertical",
    fontFamily: "inherit",
    minHeight: 140,
  } as React.CSSProperties,
} as const;
