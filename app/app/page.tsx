"use client";

import { useState } from "react";

type Status = "idle" | "uploading" | "transcribing" | "summarizing" | "done" | "error";

const STATUS_LABEL: Record<Status, string> = {
  idle: "実行",
  uploading: "アップロード中...",
  transcribing: "文字起こし中...",
  summarizing: "要約中...",
  done: "実行",
  error: "実行",
};

interface Result {
  transcription: string;
  summary: string;
  outputPath: string;
}

export default function Home() {
  const [constructionName, setConstructionName] = useState("");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const isProcessing = ["uploading", "transcribing", "summarizing"].includes(status);
  const canSubmit = constructionName.trim() && location.trim() && file && !isProcessing;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("constructionName", constructionName.trim());
    formData.append("location", location.trim());
    formData.append("audio", file!);

    setStatus("uploading");
    const res = await fetch("/api/upload", { method: "POST", body: formData });

    // Simulate stage transitions for UX (server handles everything in one call)
    setStatus("transcribing");
    const json = await res.json();
    setStatus("summarizing");

    await new Promise((r) => setTimeout(r, 300)); // brief pause so user sees the stage

    if (!res.ok) {
      setStatus("error");
      setError(json.error ?? "不明なエラーが発生しました");
      return;
    }

    setStatus("done");
    setResult(json);
  }

  return (
    <main style={{ maxWidth: 640, margin: "60px auto", fontFamily: "sans-serif", padding: "0 20px" }}>
      <h1 style={{ marginBottom: 4 }}>GENBA-OS</h1>
      <p style={{ color: "#666", marginTop: 0, marginBottom: 32 }}>
        音声アップロード → 文字起こし → 現場日報 → 保存
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>工事名</label>
          <input
            type="text"
            value={constructionName}
            onChange={(e) => setConstructionName(e.target.value)}
            placeholder="例: ○○ビル外壁補修工事"
            disabled={isProcessing}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>場所</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="例: 東京都新宿区○○"
            disabled={isProcessing}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>音声ファイル</label>
          <input
            type="file"
            accept=".m4a,.wav,.mp3,audio/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={isProcessing}
            style={{ display: "block" }}
          />
          {file && (
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#555" }}>
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            padding: "10px 28px",
            fontSize: 16,
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.5,
            background: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: 6,
          }}
        >
          {STATUS_LABEL[status]}
        </button>

        {isProcessing && (
          <span style={{ marginLeft: 16, color: "#555", fontSize: 14 }}>
            {STATUS_LABEL[status]}
          </span>
        )}
      </form>

      {status === "error" && (
        <div style={{ marginTop: 24, color: "red" }}>エラー: {error}</div>
      )}

      {status === "done" && result && (
        <div style={{ marginTop: 40 }}>
          <p style={{ color: "#555", fontSize: 13 }}>
            保存先: <code>{result.outputPath}</code>
          </p>

          <section style={{ marginTop: 28 }}>
            <h2 style={{ marginBottom: 8 }}>文字起こし</h2>
            <pre style={preStyle}>{result.transcription}</pre>
          </section>

          <section style={{ marginTop: 28 }}>
            <h2 style={{ marginBottom: 8 }}>現場日報（要約）</h2>
            <pre style={preStyle}>{result.summary}</pre>
          </section>
        </div>
      )}
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontWeight: 600,
  fontSize: 14,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 15,
  border: "1px solid #ccc",
  borderRadius: 4,
  boxSizing: "border-box",
};

const preStyle: React.CSSProperties = {
  background: "#f5f5f5",
  padding: 16,
  borderRadius: 4,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontSize: 13,
  lineHeight: 1.6,
};
