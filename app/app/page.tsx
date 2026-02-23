"use client";

import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "paste" | "record" | "audio";
type RecordState = "idle" | "requesting" | "recording" | "recorded";
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

const STEPS: Record<Mode, { key: Step; label: string }[]> = {
  paste: [
    { key: "summarizing", label: "① 要約" },
    { key: "saving",      label: "② 保存" },
  ],
  record: [
    { key: "uploading",    label: "① 送信" },
    { key: "transcribing", label: "② 文字起こし" },
    { key: "summarizing",  label: "③ 要約" },
    { key: "saving",       label: "④ 保存" },
  ],
  audio: [
    { key: "uploading",    label: "① アップロード" },
    { key: "transcribing", label: "② 文字起こし" },
    { key: "summarizing",  label: "③ 要約" },
    { key: "saving",       label: "④ 保存" },
  ],
};

const PROCESSING_KEYS = new Set<Step>(["uploading", "transcribing", "summarizing", "saving"]);

const TAB_LABELS: Record<Mode, string> = {
  paste:  "貼り付け",
  record: "録音",
  audio:  "ファイル",
};

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

function fmtTime(sec: number) {
  return `${Math.floor(sec / 60).toString().padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;
}

function bestMime(): string {
  const candidates = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function mimeToExt(mime: string): string {
  if (mime.startsWith("audio/mp4"))  return "m4a";
  if (mime.startsWith("audio/webm")) return "webm";
  if (mime.startsWith("audio/ogg"))  return "ogg";
  return "webm";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  // shared
  const [mode, setMode]                   = useState<Mode>("paste");
  const [constructionName, setConstructionName] = useState("");
  const [location, setLocation]           = useState("");
  const [status, setStatus]               = useState<Status>("idle");
  const [result, setResult]               = useState<Result | null>(null);
  const [error, setError]                 = useState("");

  // paste
  const [pastedText, setPastedText] = useState("");

  // audio file
  const [file, setFile] = useState<File | null>(null);

  // recording
  const [recordState, setRecordState]   = useState<RecordState>("idle");
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedMime, setRecordedMime] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);

  // unmount cleanup
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const isProcessing  = PROCESSING_KEYS.has(status as Step);
  const steps         = STEPS[mode];
  const stepOrder     = steps.map((s) => s.key);
  const currentStepIdx = stepOrder.indexOf(status as Step);
  const commonOk      = constructionName.trim() && location.trim();

  const canSubmit =
    !isProcessing &&
    !!commonOk &&
    (mode === "paste"  ? !!pastedText.trim() :
     mode === "record" ? recordState === "recorded" :
     !!file);

  // ── mode switch ───────────────────────────────────────
  function switchMode(next: Mode) {
    if (isProcessing) return;
    if (mode === "record" && recordState === "recording") {
      mediaRecorderRef.current?.stop();
    }
    setMode(next);
    setRecordState("idle");
    setRecordSeconds(0);
    setRecordedBlob(null);
    setStatus("idle");
    setResult(null);
    setError("");
  }

  // ── recording ─────────────────────────────────────────
  async function startRecording() {
    setRecordState("requesting");
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime   = bestMime();
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        setRecordedBlob(blob);
        setRecordedMime(mr.mimeType);
        setRecordState("recorded");
        if (timerRef.current) clearInterval(timerRef.current);
      };

      mr.start(500);
      setRecordState("recording");
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      setRecordState("idle");
      setError("マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function resetRecording() {
    setRecordState("idle");
    setRecordedBlob(null);
    setRecordSeconds(0);
  }

  // ── upload helper (record + audio share this) ─────────
  async function submitToUpload(audioFile: File) {
    const formData = new FormData();
    formData.append("constructionName", constructionName.trim());
    formData.append("location", location.trim());
    formData.append("audio", audioFile);

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
    await new Promise((r) => setTimeout(r, 280));
    setStatus("done");
    setResult(json);
  }

  // ── submit handlers ───────────────────────────────────
  async function handlePasteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setResult(null);
    setStatus("summarizing");

    const res = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        constructionName: constructionName.trim(),
        location:         location.trim(),
        transcription:    pastedText.trim(),
      }),
    });

    const json = await res.json();
    if (!res.ok) { setStatus("error"); setError(json.error ?? "不明なエラーが発生しました"); return; }

    setStatus("saving");
    await new Promise((r) => setTimeout(r, 280));
    setStatus("done");
    setResult(json);
  }

  async function handleRecordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !recordedBlob) return;
    setError("");
    setResult(null);
    const ext  = mimeToExt(recordedMime);
    const audioFile = new File([recordedBlob], `recording.${ext}`, { type: recordedMime });
    await submitToUpload(audioFile);
  }

  async function handleAudioSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !file) return;
    setError("");
    setResult(null);
    await submitToUpload(file);
  }

  const handleSubmit =
    mode === "paste"  ? handlePasteSubmit  :
    mode === "record" ? handleRecordSubmit :
                        handleAudioSubmit;

  const submitLabel =
    isProcessing      ? "処理中..." :
    status === "error" ? "再試行" :
    "日報を生成する";

  // ── render ────────────────────────────────────────────
  return (
    <main style={{
      maxWidth: 640,
      margin: "0 auto",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
      padding: "40px 20px 100px",
    }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>GENBA-OS</h1>
      <p style={{ color: "#666", marginTop: 0, marginBottom: 28, fontSize: 14 }}>
        録音・貼り付け → 文字起こし → AI 日報生成 → 保存
      </p>

      {/* ── Tabs ──────────────────────────────────────── */}
      <div style={{ display: "flex", borderBottom: "2px solid #e8e8e8", marginBottom: 24 }}>
        {(["paste", "record", "audio"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            style={{
              flex: 1,
              padding: "10px 4px",
              fontSize: 14,
              fontWeight: mode === m ? 700 : 400,
              background: "none",
              border: "none",
              borderBottom: mode === m ? "2px solid #0070f3" : "2px solid transparent",
              marginBottom: -2,
              color: mode === m ? "#0070f3" : "#888",
              cursor: "pointer",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {TAB_LABELS[m]}
          </button>
        ))}
      </div>

      {/* ── Paste hint ────────────────────────────────── */}
      {mode === "paste" && (
        <div style={{
          fontSize: 13, color: "#444", background: "#f0f7ff",
          border: "1px solid #c8dffe", borderLeft: "4px solid #0070f3",
          borderRadius: 8, padding: "10px 14px", marginBottom: 24, lineHeight: 1.6,
        }}>
          SuperWhisper などで文字起こしたテキストをコピーして貼り付けてください。
        </div>
      )}

      {/* ── Form ──────────────────────────────────────── */}
      <form onSubmit={handleSubmit}>
        {/* 共通フィールド */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>工事名</label>
          <input type="text" inputMode="text" value={constructionName}
            onChange={(e) => setConstructionName(e.target.value)}
            placeholder="例: ○○ビル外壁補修工事"
            disabled={isProcessing} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>場所</label>
          <input type="text" inputMode="text" value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="例: 東京都新宿区○○"
            disabled={isProcessing} style={inputStyle} />
        </div>

        {/* ── Paste ── */}
        {mode === "paste" && (
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>
              文字起こしテキスト
              {pastedText && (
                <span style={{ fontWeight: 400, color: "#999", fontSize: 12, marginLeft: 8 }}>
                  {pastedText.length} 文字
                </span>
              )}
            </label>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={"ここにテキストを貼り付け...\n\n（長押し → ペースト）"}
              disabled={isProcessing}
              style={{
                width: "100%", minHeight: 220, padding: "14px",
                fontSize: 16, lineHeight: 1.7,
                border: "1px solid #ccc", borderRadius: 10,
                boxSizing: "border-box", resize: "vertical",
                fontFamily: "inherit", color: "#222", WebkitAppearance: "none",
              }}
            />
          </div>
        )}

        {/* ── Record ── */}
        {mode === "record" && (
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>録音</label>

            {recordState === "idle" && (
              <button type="button" onClick={startRecording}
                disabled={isProcessing}
                style={{
                  width: "100%", minHeight: 72, fontSize: 18, fontWeight: 700,
                  background: "#dc2626", color: "#fff", border: "none",
                  borderRadius: 12, cursor: "pointer",
                  touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                }}>
                ● 録音開始
              </button>
            )}

            {recordState === "requesting" && (
              <p style={{ color: "#666", fontSize: 14, marginTop: 8 }}>
                マイクへのアクセスを許可してください...
              </p>
            )}

            {recordState === "recording" && (
              <div style={{
                background: "#fff0f0", border: "1px solid #fca5a5",
                borderRadius: 12, padding: "20px 16px", textAlign: "center",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 20 }}>
                  <span style={{ color: "#dc2626", fontSize: 22, animation: "none" }}>●</span>
                  <span style={{ fontSize: 36, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: 2 }}>
                    {fmtTime(recordSeconds)}
                  </span>
                </div>
                <button type="button" onClick={stopRecording}
                  style={{
                    width: "100%", minHeight: 52, fontSize: 17, fontWeight: 700,
                    background: "#1f2937", color: "#fff", border: "none",
                    borderRadius: 10, cursor: "pointer",
                    touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                  }}>
                  ■ 録音停止
                </button>
              </div>
            )}

            {recordState === "recorded" && (
              <div style={{
                background: "#f0fdf4", border: "1px solid #86efac",
                borderRadius: 12, padding: "16px",
              }}>
                <p style={{ margin: 0, fontSize: 15, color: "#166534", fontWeight: 600 }}>
                  ✓ 録音完了　{fmtTime(recordSeconds)}
                </p>
                <button type="button" onClick={resetRecording}
                  style={{
                    marginTop: 10, fontSize: 13, color: "#888",
                    background: "none", border: "none", cursor: "pointer",
                    textDecoration: "underline", padding: 0,
                  }}>
                  やり直す
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Audio file ── */}
        {mode === "audio" && (
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>音声ファイル（m4a / wav / mp3）</label>
            <input type="file" accept=".m4a,.wav,.mp3,audio/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={isProcessing}
              style={{ display: "block", fontSize: 16, marginTop: 6 }} />
            {file && (
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "#555" }}>
                {file.name}（{(file.size / 1024).toFixed(1)} KB）
              </p>
            )}
          </div>
        )}

        {/* ── Submit ── */}
        {(mode !== "record" || recordState === "recorded" || status === "error") && (
          <button type="submit" disabled={!canSubmit}
            style={{
              width: "100%", minHeight: 54, fontSize: 17, fontWeight: 700,
              border: "none", borderRadius: 12,
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.4,
              background: canSubmit ? "#0070f3" : "#aaa",
              color: "#fff",
              touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
              transition: "opacity 0.15s",
            }}>
            {submitLabel}
          </button>
        )}
      </form>

      {/* ── Step indicator ────────────────────────────── */}
      {(isProcessing || status === "done") && (
        <div style={{ display: "flex", gap: 4, marginTop: 20, flexWrap: "wrap" }}>
          {steps.map((step, i) => {
            const done   = status === "done" || i < currentStepIdx;
            const active = i === currentStepIdx;
            return (
              <div key={step.key} style={{ display: "flex", alignItems: "center" }}>
                <span style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 13,
                  fontWeight: active ? 700 : 400,
                  background: done ? "#d4edda" : active ? "#cce5ff" : "#f0f0f0",
                  color:      done ? "#155724" : active ? "#004085" : "#888",
                  border: active ? "1px solid #b8daff" : "1px solid transparent",
                }}>
                  {step.label}
                </span>
                {i < steps.length - 1 && (
                  <span style={{ color: "#ccc", margin: "0 4px", fontSize: 12 }}>→</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Error ────────────────────────────────────── */}
      {status === "error" && (
        <div style={{
          marginTop: 20, padding: "14px 16px",
          background: "#fff5f5", border: "1px solid #fcc",
          borderRadius: 10, color: "#c00", fontSize: 14,
          lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {error}
        </div>
      )}

      {/* ── Result ───────────────────────────────────── */}
      {status === "done" && result && (
        <div style={{ marginTop: 40 }}>
          {result.outputPath ? (
            <p style={{ fontSize: 13, color: "#666", wordBreak: "break-all" }}>
              保存先: <code>{result.outputPath}</code>
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 8 }}>
              <button type="button"
                onClick={() => download(result.mdContent, `${result.slug}.md`, "text/markdown")}
                style={dlBtnStyle}>
                日報 .md をダウンロード
              </button>
              <button type="button"
                onClick={() => download(result.jsonContent, `${result.slug}.json`, "application/json")}
                style={dlBtnStyle}>
                日報 .json をダウンロード
              </button>
            </div>
          )}

          <section style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>文字起こし</h2>
            <pre style={preStyle}>{result.transcription}</pre>
          </section>

          <section style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>現場日報（AI 要約）</h2>
            <pre style={preStyle}>{result.summary}</pre>
          </section>
        </div>
      )}
    </main>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block", marginBottom: 8, fontWeight: 600, fontSize: 15,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", fontSize: 16,
  border: "1px solid #ccc", borderRadius: 10, boxSizing: "border-box",
  WebkitAppearance: "none", color: "#222",
};

const preStyle: React.CSSProperties = {
  background: "#f6f6f6", padding: "14px 16px", borderRadius: 10,
  whiteSpace: "pre-wrap", wordBreak: "break-word",
  fontSize: 14, lineHeight: 1.75, margin: 0,
};

const dlBtnStyle: React.CSSProperties = {
  width: "100%", minHeight: 52, padding: "12px 16px",
  fontSize: 16, fontWeight: 600, cursor: "pointer",
  background: "#fff", border: "2px solid #0070f3", color: "#0070f3",
  borderRadius: 12, touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
};
