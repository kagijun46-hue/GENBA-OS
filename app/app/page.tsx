"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [result, setResult] = useState<{ outputPath: string; summary: string } | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setStatus("processing");
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("audio", file);

    const res = await fetch("/api/process", { method: "POST", body: formData });
    const json = await res.json();

    if (!res.ok) {
      setStatus("error");
      setError(json.error ?? "不明なエラーが発生しました");
      return;
    }

    setStatus("done");
    setResult(json);
  }

  return (
    <main style={{ maxWidth: 600, margin: "60px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <h1>GENBA-OS</h1>
      <p style={{ color: "#666", marginTop: 4 }}>音声アップロード → 文字起こし → 現場日報 → 保存</p>

      <form onSubmit={handleSubmit} style={{ marginTop: 32 }}>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ display: "block", marginBottom: 16 }}
        />
        <button
          type="submit"
          disabled={!file || status === "processing"}
          style={{ padding: "8px 24px", fontSize: 16, cursor: "pointer" }}
        >
          {status === "processing" ? "処理中..." : "処理開始"}
        </button>
      </form>

      {status === "error" && (
        <p style={{ color: "red", marginTop: 24 }}>エラー: {error}</p>
      )}

      {status === "done" && result && (
        <div style={{ marginTop: 32, borderTop: "1px solid #ddd", paddingTop: 24 }}>
          <p>
            <strong>保存先:</strong> <code>{result.outputPath}</code>
          </p>
          <h2 style={{ marginTop: 24 }}>日報プレビュー</h2>
          <pre
            style={{
              background: "#f5f5f5",
              padding: 16,
              borderRadius: 4,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {result.summary}
          </pre>
        </div>
      )}
    </main>
  );
}
