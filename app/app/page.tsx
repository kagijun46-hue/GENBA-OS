"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "uploading" | "transcribing" | "summarizing" | "saving";
type Status = "idle" | Step | "done" | "error";

interface Result {
  transcription: string;
  summary: string;
  outputPath: string | null;
  mdContent: string;
  jsonContent: string;
  slug: string;
}

// ─── Step indicator config ────────────────────────────────────────────────────

const STEPS: { key: Step; label: string }[] = [
  { key: "uploading",    label: "① アップロード" },
  { key: "transcribing", label: "② 文字起こし" },
  { key: "summarizing",  label: "③ 要約" },
  { key: "saving",       label: "④ 保存" },
];

const STEP_ORDER = STEPS.map((s) => s.key);

function stepIndex(status: Status): number {
  const i = STEP_ORDER.indexOf(status as Step);
  return i === -1 ? (status === "done" ? STEP_ORDER.length : -1) : i;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const [constructionName, setConstructionName] = useState("");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const isProcessing = STEP_ORDER.includes(status as Step);
  const canSubmit = constructionName.trim() && location.trim() && file && !isProcessing;
  const currentStepIdx = stepIndex(status);

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

    setStatus("transcribing");
    await new Promise((r) => setTimeout(r, 400));
    setStatus("summarizing");

    const json = await res.json();

    if (!res.ok) {
      setStatus("error");
      setError(json.error ?? "不明なエラーが発生しました");
      return;
    }

    setStatus("saving");
    await new Promise((r) => setTimeout(r, 300));
    setStatus("done");
    setResult(json);
  }

  return (
    <main style={{ maxWidth: 680, margin: "60px auto", fontFamily: "sans-serif", padding: "0 20px" }}>
      <h1 style={{ marginBottom: 4 }}>GENBA-OS</h1>
      <p style={{ color: "#666", marginTop: 0, marginBottom: 32 }}>
        音声アップロード → 文字起こし → 現場日報 → 保存
      </p>

      {/* ── Form ── */}
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
          <label style={labelStyle}>音声ファイル（m4a / wav / mp3）</label>
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
          {isProcessing ? "処理中..." : "実行"}
        </button>
      </form>

      {/* ── Step indicator ── */}
      {(isProcessing || status === "done") && (
        <div style={{ display: "flex", gap: 0, marginTop: 24, flexWrap: "wrap" }}>
          {STEPS.map((step, i) => {
            const done = i < currentStepIdx;
            const active = i === currentStepIdx;
            return (
              <div key={step.key} style={{ display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: active ? 700 : 400,
                    background: done ? "#d4edda" : active ? "#cce5ff" : "#f0f0f0",
                    color: done ? "#155724" : active ? "#004085" : "#888",
                    border: active ? "1px solid #b8daff" : "1px solid transparent",
                  }}
                >
                  {step.label}
                </span>
                {i < STEPS.length - 1 && (
                  <span style={{ color: "#ccc", margin: "0 4px" }}>→</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Error ── */}
      {status === "error" && (
        <div style={{ marginTop: 24, color: "#c00" }}>エラー: {error}</div>
      )}

      {/* ── Result ── */}
      {status === "done" && result && (
        <div style={{ marginTop: 40 }}>
          {/* 保存先 or ダウンロード */}
          {result.outputPath ? (
            <p style={{ fontSize: 13, color: "#555" }}>
              保存先: <code>{result.outputPath}</code>
            </p>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: "#555", marginBottom: 10 }}>
                このデモ環境ではファイル保存はできません。以下からダウンロードしてください。
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => download(result.mdContent, `${result.slug}.md`, "text/markdown")}
                  style={dlBtnStyle}
                >
                  日報 .md をダウンロード
                </button>
                <button
                  onClick={() => download(result.jsonContent, `${result.slug}.json`, "application/json")}
                  style={dlBtnStyle}
                >
                  日報 .json をダウンロード
                </button>
              </div>
            </div>
          )}

          {/* 文字起こし */}
          <section style={{ marginTop: 28 }}>
            <h2 style={{ marginBottom: 8 }}>文字起こし</h2>
            <pre style={preStyle}>{result.transcription}</pre>
          </section>

          {/* 日報 */}
          <section style={{ marginTop: 28 }}>
            <h2 style={{ marginBottom: 8 }}>現場日報（要約）</h2>
            <pre style={preStyle}>{result.summary}</pre>
          </section>
        </div>
      )}
    </main>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

const dlBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  fontSize: 14,
  cursor: "pointer",
  background: "#fff",
  border: "1px solid #0070f3",
  color: "#0070f3",
  borderRadius: 5,
};
