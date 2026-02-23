"use client";

import { useEffect, useRef, useState } from "react";

// ─── Design Tokens (Dark Industrial) ─────────────────────────────────────────

const T = {
  bg:          "#1A1A1A",
  bgCard:      "#242424",
  bgInput:     "#2C2C2C",
  border:      "#4A4A4A",
  borderFill:  "#E0E0E0",
  textMain:    "#F5F5F5",
  textSub:     "#BDBDBD",
  textMuted:   "#757575",
  blue:        "#4A90E2",
  red:         "#EF4444",
  green:       "#4CAF50",
  yellow:      "#F59E0B",
  radius:      4,
} as const;

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

interface HealthData {
  groqKeySet: boolean;
  openaiKeySet: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

/** UTF-8 BOM 付きでダウンロード（Windows メモ帳・LINE で文字化けしない） */
function downloadWithBom(content: string, filename: string, mime: string) {
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPlain(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
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

// Feature A: extract candidates from pasted text
function extractConstructionCandidates(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/(?:工事名|現場名)[：:]\s*([^\n\r,、。]+)/g)) {
    const v = m[1].trim();
    if (v) found.add(v);
  }
  for (const m of text.matchAll(/([^\s\n\r、。]{2,20}工事)/g)) {
    const v = m[1].trim();
    if (v) found.add(v);
  }
  return [...found].slice(0, 5);
}

function extractLocationCandidates(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/(?:場所|現場|住所)[：:]\s*([^\n\r,、。]+)/g)) {
    const v = m[1].trim();
    if (v) found.add(v);
  }
  const prefRe = /(?:東京都|大阪府|神奈川県|埼玉県|千葉県|北海道|愛知県|福岡県|京都府|兵庫県|静岡県)[^\n\r、。]{2,30}/g;
  for (const m of text.matchAll(prefRe)) {
    found.add(m[0].trim());
  }
  return [...found].slice(0, 5);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChipRow({ chips, onSelect }: { chips: string[]; onSelect: (v: string) => void }) {
  if (!chips.length) return null;
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "6px 0 2px" }}>
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => onSelect(chip)}
          style={{
            flexShrink: 0, padding: "5px 12px",
            fontSize: 12, fontWeight: 700,
            background: "#1C2A3A", color: T.blue,
            border: `2px solid ${T.blue}`, borderRadius: T.radius,
            cursor: "pointer", whiteSpace: "nowrap",
            touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
          } as React.CSSProperties}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  // shared
  const [mode, setMode]                         = useState<Mode>("paste");
  const [constructionName, setConstructionName] = useState("");
  const [location, setLocation]                 = useState("");
  const [status, setStatus]                     = useState<Status>("idle");
  const [result, setResult]                     = useState<Result | null>(null);
  const [error, setError]                       = useState("");

  // paste
  const [pastedText, setPastedText] = useState("");

  // Feature A: auto-extract chips
  const [constructionChips, setConstructionChips] = useState<string[]>([]);
  const [locationChips, setLocationChips]         = useState<string[]>([]);
  const extractTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // audio file
  const [file, setFile] = useState<File | null>(null);

  // recording
  const [recordState, setRecordState]     = useState<RecordState>("idle");
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob]   = useState<Blob | null>(null);
  const [recordedMime, setRecordedMime]   = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);

  // 429 countdown
  const [retryCountdown, setRetryCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // toast
  const [toast, setToast]     = useState("");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // health check
  const [health, setHealth] = useState<HealthData | null>(null);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (extractTimerRef.current) clearTimeout(extractTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // health check on mount
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d: HealthData) => setHealth(d))
      .catch(() => {});
  }, []);

  // Feature A: debounced auto-extract (600ms)
  useEffect(() => {
    if (extractTimerRef.current) clearTimeout(extractTimerRef.current);
    extractTimerRef.current = setTimeout(() => {
      if (pastedText.trim().length > 10) {
        setConstructionChips(extractConstructionCandidates(pastedText));
        setLocationChips(extractLocationCandidates(pastedText));
      } else {
        setConstructionChips([]);
        setLocationChips([]);
      }
    }, 600);
  }, [pastedText]);

  const isProcessing   = PROCESSING_KEYS.has(status as Step);
  const steps          = STEPS[mode];
  const stepOrder      = steps.map((s) => s.key);
  const currentStepIdx = stepOrder.indexOf(status as Step);
  const commonOk       = constructionName.trim() && location.trim();

  const canSubmit =
    !isProcessing &&
    retryCountdown === 0 &&
    !!commonOk &&
    (mode === "paste"  ? !!pastedText.trim() :
     mode === "record" ? recordState === "recorded" :
     !!file);

  const disabledReason =
    isProcessing                                      ? "" :
    retryCountdown > 0                                ? `${retryCountdown}秒後に再試行できます` :
    !constructionName.trim()                          ? "工事名を入力してください" :
    !location.trim()                                  ? "場所を入力してください" :
    mode === "paste"  && !pastedText.trim()           ? "テキストを貼り付けてください" :
    mode === "record" && recordState !== "recorded"   ? "先に録音してください" :
    mode === "audio"  && !file                        ? "音声ファイルを選択してください" :
    "";

  // ── countdown ────────────────────────────────────────
  function startCountdown(sec: number) {
    setRetryCountdown(sec);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setRetryCountdown((s) => {
        if (s <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  // ── toast ─────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2500);
  }

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

  // ── error handler helper ──────────────────────────────
  function handleApiError(res: Response, json: { error?: string }) {
    const msg = json.error ?? "不明なエラーが発生しました";
    setStatus("error");
    setError(msg);
    if (res.status === 429) startCountdown(30);
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
    if (!res.ok) { handleApiError(res, json); return; }

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
    if (!res.ok) { handleApiError(res, json); return; }

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
    const ext = mimeToExt(recordedMime);
    await submitToUpload(new File([recordedBlob], `recording.${ext}`, { type: recordedMime }));
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
    isProcessing         ? "処理中..." :
    retryCountdown > 0   ? `${retryCountdown}秒後に再試行` :
    status === "error"   ? "再試行" :
    "日報を生成する";

  // ── Feature B: action bar ─────────────────────────────
  function copyToClipboard() {
    if (!result) return;
    navigator.clipboard.writeText(result.mdContent).then(() => showToast("コピーしました"));
  }

  function shareToLine() {
    if (!result) return;
    const text = `【現場日報】${constructionName}\n\n${result.summary}`;
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, "_blank");
  }

  function printReport() {
    window.print();
  }

  function downloadMd() {
    if (!result) return;
    // UTF-8 BOM 付き → Windows メモ帳/LINE で文字化けしない
    downloadWithBom(result.mdContent, `${result.slug}.md`, "text/markdown");
    showToast("ダウンロード開始");
  }

  function downloadJson() {
    if (!result) return;
    downloadPlain(result.jsonContent, `${result.slug}.json`, "application/json");
    showToast("ダウンロード開始");
  }

  // GROQ key missing: show banner on record/audio tabs
  const showGroqMissingBanner =
    health !== null && !health.groqKeySet && (mode === "record" || mode === "audio");

  // OpenAI key missing: show subtle notice in paste tab
  const showOpenAiMissingNotice =
    health !== null && !health.openaiKeySet && mode === "paste";

  // ── render ────────────────────────────────────────────
  return (
    <>
      <main style={{
        maxWidth: 640,
        margin: "0 auto",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
        padding: "0 0 120px",
        background: T.bg,
        minHeight: "100vh",
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: "20px 20px 16px",
          borderBottom: `3px solid ${T.textMain}`,
          background: T.bg,
        }}>
          <h1 style={{
            fontSize: 26, fontWeight: 900, letterSpacing: 1,
            color: T.textMain, margin: 0,
          }}>
            GENBA-OS
          </h1>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 2,
            color: T.textSub, margin: "3px 0 0", textTransform: "uppercase",
          }}>
            Field Report System
          </p>
        </div>

        <div style={{ padding: "20px 20px 0" }}>

          {/* ── Tabs ── */}
          <div style={{
            display: "flex",
            border: `2px solid ${T.textMain}`,
            borderRadius: T.radius,
            overflow: "hidden",
            marginBottom: 20,
          }}>
            {(["paste", "record", "audio"] as Mode[]).map((m, i) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                style={{
                  flex: 1, padding: "11px 4px",
                  fontSize: 14, fontWeight: 700,
                  background: mode === m ? T.textMain : T.bg,
                  color: mode === m ? T.bg : T.textMain,
                  border: "none",
                  borderRight: i < 2 ? `2px solid ${T.textMain}` : "none",
                  cursor: "pointer",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                } as React.CSSProperties}
              >
                {TAB_LABELS[m]}
              </button>
            ))}
          </div>

          {/* ── GROQ key missing banner ── */}
          {showGroqMissingBanner && (
            <div style={{
              marginBottom: 16,
              padding: "12px 14px",
              background: "#2A1F00",
              border: `2px solid ${T.yellow}`,
              borderLeft: `5px solid ${T.yellow}`,
              borderRadius: T.radius,
              color: "#FEF3C7",
              fontSize: 13,
              lineHeight: 1.7,
            }}>
              <strong>⚠ GROQ_API_KEY が未設定です</strong><br />
              録音・ファイルタブの文字起こしには Groq API キーが必要です。<br />
              Vercel: <code style={{ background: "#3A2F00", padding: "1px 5px", borderRadius: 3 }}>
                Settings → Environment Variables
              </code> に追加してください。<br />
              <button
                type="button"
                onClick={() => switchMode("paste")}
                style={{
                  marginTop: 8, fontSize: 13, fontWeight: 700,
                  color: T.yellow, background: "none", border: "none",
                  cursor: "pointer", padding: 0, textDecoration: "underline",
                }}
              >
                → 代わりに「貼り付け」タブを使う（SuperWhisper 推奨）
              </button>
            </div>
          )}

          {/* ── Paste hint ── */}
          {mode === "paste" && (
            <div style={{
              fontSize: 13, color: T.textSub,
              background: "#1C2535",
              border: `2px solid #2D4A7A`,
              borderLeft: `5px solid ${T.blue}`,
              borderRadius: T.radius,
              padding: "10px 14px", marginBottom: 16, lineHeight: 1.6,
            }}>
              SuperWhisper などで文字起こしたテキストをコピーして貼り付けてください。
            </div>
          )}

          {/* ── OpenAI key missing notice (paste tab) ── */}
          {showOpenAiMissingNotice && (
            <div style={{
              marginBottom: 12,
              padding: "8px 12px",
              background: "#242424",
              border: `1px solid ${T.border}`,
              borderRadius: T.radius,
              color: T.textMuted,
              fontSize: 12,
              lineHeight: 1.6,
            }}>
              OPENAI_API_KEY 未設定: テキストをそのまま整形します（AI 要約なし）
            </div>
          )}

          {/* ── Form ── */}
          <form id="main-form" onSubmit={handleSubmit}>

            {/* 工事名 */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>工事名</label>
              <input
                type="text"
                inputMode="text"
                value={constructionName}
                onChange={(e) => setConstructionName(e.target.value)}
                placeholder="例: ○○ビル外壁補修工事"
                disabled={isProcessing}
                style={{
                  ...inputStyle,
                  borderColor: constructionName.trim() ? T.borderFill : T.border,
                }}
              />
              <ChipRow chips={constructionChips} onSelect={(v) => setConstructionName(v)} />
            </div>

            {/* 場所 */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>場所</label>
              <input
                type="text"
                inputMode="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例: 東京都新宿区○○"
                disabled={isProcessing}
                style={{
                  ...inputStyle,
                  borderColor: location.trim() ? T.borderFill : T.border,
                }}
              />
              <ChipRow chips={locationChips} onSelect={(v) => setLocation(v)} />
            </div>

            {/* ── Paste mode ── */}
            {mode === "paste" && (
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>
                  文字起こしテキスト
                  {pastedText && (
                    <span style={{ fontWeight: 400, color: T.textMuted, fontSize: 12, marginLeft: 8 }}>
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
                    width: "100%", minHeight: 220, padding: 14,
                    fontSize: 16, lineHeight: 1.7,
                    background: T.bgInput,
                    border: `2px solid ${pastedText.trim() ? T.borderFill : T.border}`,
                    borderRadius: T.radius,
                    boxSizing: "border-box", resize: "vertical",
                    fontFamily: "inherit",
                    color: T.textMain, fontWeight: 500,
                    WebkitAppearance: "none",
                  } as React.CSSProperties}
                />
              </div>
            )}

            {/* ── Record mode ── */}
            {mode === "record" && (
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>録音</label>

                {recordState === "idle" && (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={isProcessing}
                    style={{
                      width: "100%", minHeight: 72, fontSize: 18, fontWeight: 900,
                      background: T.red, color: "#fff",
                      border: `3px solid ${T.textMain}`, borderRadius: T.radius,
                      cursor: "pointer", letterSpacing: 1,
                      touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                    } as React.CSSProperties}
                  >
                    ● 録音開始
                  </button>
                )}

                {recordState === "requesting" && (
                  <p style={{ color: T.textSub, fontSize: 14, marginTop: 8, fontWeight: 600 }}>
                    マイクへのアクセスを許可してください...
                  </p>
                )}

                {recordState === "recording" && (
                  <div style={{
                    background: "#2A1515",
                    border: `2px solid ${T.red}`,
                    borderRadius: T.radius,
                    padding: "20px 16px", textAlign: "center",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center",
                      justifyContent: "center", gap: 12, marginBottom: 20,
                    }}>
                      <span style={{ color: T.red, fontSize: 22 }}>●</span>
                      <span style={{
                        fontSize: 36, fontWeight: 900,
                        fontVariantNumeric: "tabular-nums", letterSpacing: 2,
                        color: T.textMain,
                      }}>
                        {fmtTime(recordSeconds)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={stopRecording}
                      style={{
                        width: "100%", minHeight: 52, fontSize: 17, fontWeight: 900,
                        background: T.textMain, color: T.bg,
                        border: `2px solid ${T.textMain}`, borderRadius: T.radius,
                        cursor: "pointer",
                        touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                      } as React.CSSProperties}
                    >
                      ■ 録音停止
                    </button>
                  </div>
                )}

                {recordState === "recorded" && (
                  <div style={{
                    background: "#152A1A",
                    border: `2px solid ${T.green}`,
                    borderRadius: T.radius,
                    padding: 16,
                  }}>
                    <p style={{ margin: 0, fontSize: 15, color: T.green, fontWeight: 700 }}>
                      ✓ 録音完了　{fmtTime(recordSeconds)}
                    </p>
                    <button
                      type="button"
                      onClick={resetRecording}
                      style={{
                        marginTop: 10, fontSize: 13, color: T.textMuted,
                        background: "none", border: "none", cursor: "pointer",
                        textDecoration: "underline", padding: 0,
                      }}
                    >
                      やり直す
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Audio file mode ── */}
            {mode === "audio" && (
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>音声ファイル（m4a / wav / mp3）</label>
                <div style={{
                  background: T.bgCard,
                  border: `2px solid ${file ? T.borderFill : T.border}`,
                  borderRadius: T.radius,
                  padding: "12px 14px",
                }}>
                  <input
                    type="file"
                    accept=".m4a,.wav,.mp3,audio/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    disabled={isProcessing}
                    style={{ display: "block", fontSize: 16, color: T.textMain }}
                  />
                  {file && (
                    <p style={{ margin: "8px 0 0", fontSize: 13, color: T.textSub, fontWeight: 600 }}>
                      {file.name}（{(file.size / 1024).toFixed(1)} KB）
                    </p>
                  )}
                </div>
              </div>
            )}

          </form>

          {/* ── Step indicator ── */}
          {(isProcessing || status === "done") && (
            <div style={{ display: "flex", gap: 4, marginTop: 16, flexWrap: "wrap" }}>
              {steps.map((step, i) => {
                const done   = status === "done" || i < currentStepIdx;
                const active = i === currentStepIdx;
                return (
                  <div key={step.key} style={{ display: "flex", alignItems: "center" }}>
                    <span style={{
                      padding: "5px 12px", borderRadius: T.radius,
                      fontSize: 13, fontWeight: 700,
                      background: done ? T.green : active ? T.blue : "#333",
                      color: done || active ? "#fff" : T.textMuted,
                    }}>
                      {step.label}
                    </span>
                    {i < steps.length - 1 && (
                      <span style={{ color: T.border, margin: "0 4px", fontSize: 12 }}>→</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Error ── */}
          {status === "error" && (
            <div style={{
              marginTop: 16, padding: "14px 16px",
              background: "#B91C1C",
              border: `2px solid #DC2626`,
              borderRadius: T.radius,
              color: "#fff", fontSize: 14,
              lineHeight: 1.7, whiteSpace: "pre-wrap",
              wordBreak: "break-word", fontWeight: 600,
            }}>
              {error}
              {retryCountdown > 0 && (
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
                  ⏱ {retryCountdown}秒後に再試行できます
                </div>
              )}
            </div>
          )}

          {/* ── Result ── */}
          {status === "done" && result && (
            <div style={{ marginTop: 32 }}>

              {result.outputPath && (
                <p style={{ fontSize: 13, color: T.textMuted, wordBreak: "break-all", marginBottom: 16 }}>
                  保存先:{" "}
                  <code style={{ background: "#333", color: T.textSub, padding: "2px 6px", borderRadius: 3 }}>
                    {result.outputPath}
                  </code>
                </p>
              )}

              {/* Feature B: Action Bar */}
              <div
                className="no-print"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 24,
                }}
              >
                <button type="button" onClick={copyToClipboard} style={actionBtnStyle}>
                  コピー
                </button>
                <button
                  type="button"
                  onClick={shareToLine}
                  style={{ ...actionBtnStyle, borderColor: T.green, color: T.green }}
                >
                  LINE で共有
                </button>
                <button type="button" onClick={printReport} style={actionBtnStyle}>
                  印刷 / PDF 保存
                </button>
                <button
                  type="button"
                  onClick={downloadMd}
                  style={{ ...actionBtnStyle, borderColor: T.blue, color: T.blue }}
                >
                  .md ダウンロード
                </button>
              </div>

              <section>
                <h2 style={sectionHeadStyle}>文字起こし</h2>
                <pre style={preStyle}>{result.transcription}</pre>
              </section>

              <section style={{ marginTop: 32 }}>
                <h2 style={sectionHeadStyle}>現場日報（AI 要約）</h2>
                <pre style={preStyle}>{result.summary}</pre>
              </section>
            </div>
          )}

        </div>
      </main>

      {/* ── Fixed bottom CTA ── */}
      <div
        className="no-print"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: T.bg,
          borderTop: `3px solid ${T.textMain}`,
          padding: "10px 20px 20px",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {!canSubmit && !isProcessing && disabledReason && (
            <p style={{
              fontSize: 13, color: T.textMuted, fontWeight: 600,
              margin: "0 0 8px", textAlign: "center",
            }}>
              ↑ {disabledReason}
            </p>
          )}
          <button
            form="main-form"
            type="submit"
            disabled={!canSubmit}
            style={{
              width: "100%", minHeight: 54, fontSize: 17, fontWeight: 900,
              border: `3px solid ${T.textMain}`, borderRadius: T.radius,
              cursor: canSubmit ? "pointer" : "not-allowed",
              background: canSubmit ? T.blue : "#333",
              color: canSubmit ? "#fff" : T.textMuted,
              touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
              letterSpacing: 1,
            } as React.CSSProperties}
          >
            {submitLabel}
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 96, left: "50%",
          transform: "translateX(-50%)",
          background: T.textMain, color: T.bg,
          padding: "10px 20px",
          borderRadius: T.radius,
          fontSize: 14, fontWeight: 700,
          pointerEvents: "none", whiteSpace: "nowrap",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          zIndex: 9999,
        }}>
          {toast}
        </div>
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block", marginBottom: 6,
  fontWeight: 700, fontSize: 13,
  textTransform: "uppercase", letterSpacing: 0.5, color: T.textSub,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", fontSize: 16,
  border: "2px solid #4A4A4A", borderRadius: T.radius,
  boxSizing: "border-box", WebkitAppearance: "none",
  background: T.bgInput, color: T.textMain, fontWeight: 600,
};

const preStyle: React.CSSProperties = {
  background: T.bgCard,
  padding: "14px 16px",
  borderRadius: T.radius,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontSize: 14, lineHeight: 1.75, margin: 0,
  border: `2px solid ${T.border}`,
  color: T.textMain,
};

const actionBtnStyle: React.CSSProperties = {
  padding: "12px 16px", fontSize: 14, fontWeight: 700,
  cursor: "pointer",
  background: T.bgCard, color: T.textMain,
  border: `2px solid ${T.border}`,
  borderRadius: T.radius,
  touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
};

const sectionHeadStyle: React.CSSProperties = {
  fontSize: 15, fontWeight: 900,
  marginBottom: 10,
  textTransform: "uppercase", letterSpacing: 1,
  color: T.textMain,
};
