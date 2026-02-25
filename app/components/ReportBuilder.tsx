"use client";

import { useEffect, useState } from "react";
import {
  formatDailyReport,
  parseFromText,
  type ParsedSections,
  type ReportMeta,
} from "@/lib/reportFormatter";

interface Props {
  rawText: string;
}

const LS_KEY = "genba_meta_v1";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function loadMeta(): ReportMeta {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (s) return { date: todayISO(), ...JSON.parse(s) };
  } catch {}
  return { date: todayISO() };
}

// Section labels for the collapsible summary
const SECTION_LABELS: Array<[keyof ParsedSections, string]> = [
  ["morning", "■午前"],
  ["afternoon", "■午後"],
  ["quantity", "出来高 / 数量"],
  ["tomorrow", "明日の作業"],
  ["preparation", "準備物 / 段取り"],
  ["members", "作業メンバー"],
  ["notes", "連絡事項 / 注意点"],
];

export function ReportBuilder({ rawText }: Props) {
  // Lazy initializer reads localStorage only on first render (avoids useEffect setState lint)
  const [meta, setMeta] = useState<ReportMeta>(() => loadMeta());
  const [output, setOutput] = useState("");
  const [sections, setSections] = useState<ParsedSections | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [copied, setCopied] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  // Persist meta to localStorage (all fields except date)
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { date: _d, ...rest } = meta;
      localStorage.setItem(LS_KEY, JSON.stringify(rest));
    } catch {}
  }, [meta]);

  const set =
    (key: keyof ReportMeta) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setMeta((prev) => ({ ...prev, [key]: e.target.value }));

  const handleGenerate = async () => {
    setIsGenerating(true);
    setApiError(null);
    setUsedFallback(false);
    setSummaryOpen(false);

    let extracted: ParsedSections;

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription: rawText }),
      });
      const data = await res.json();

      if (res.ok) {
        extracted = data.sections as ParsedSections;
      } else {
        // Show error, fall back to regex
        setApiError(data.error ?? "AI抽出に失敗しました。");
        extracted = parseFromText(rawText);
        setUsedFallback(true);
      }
    } catch {
      setApiError("ネットワークエラー: API に接続できませんでした。");
      extracted = parseFromText(rawText);
      setUsedFallback(true);
    }

    setSections(extracted);
    setOutput(formatDailyReport(extracted, meta));
    setCopied(false);
    setIsGenerating(false);
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      const el = document.createElement("textarea");
      el.value = output;
      el.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setOutput("");
    setSections(null);
    setApiError(null);
    setCopied(false);
    setSummaryOpen(false);
    setUsedFallback(false);
  };

  return (
    <div>
      {/* Meta inputs */}
      <div style={{ marginBottom: 20 }}>
        <p style={s.sectionLabel}>メタ情報（任意 · 自動保存）</p>
        <div style={s.grid}>
          <div>
            <label style={s.label}>日付</label>
            <input
              type="date"
              value={meta.date ?? ""}
              onChange={set("date")}
              style={s.input}
            />
          </div>
          <div>
            <label style={s.label}>現場名</label>
            <input
              type="text"
              value={meta.siteName ?? ""}
              onChange={set("siteName")}
              placeholder="例: ○○工事"
              style={s.input}
            />
          </div>
          <div>
            <label style={s.label}>班</label>
            <input
              type="text"
              value={meta.team ?? ""}
              onChange={set("team")}
              placeholder="例: A班"
              style={s.input}
            />
          </div>
          <div>
            <label style={s.label}>案件</label>
            <input
              type="text"
              value={meta.project ?? ""}
              onChange={set("project")}
              placeholder="例: 基礎工事"
              style={s.input}
            />
          </div>
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !rawText.trim()}
        style={{
          ...s.generateBtn,
          background:
            isGenerating || !rawText.trim() ? C.btnDisabledBg : C.accent,
          color: isGenerating || !rawText.trim() ? C.muted : "#fff",
          cursor: isGenerating || !rawText.trim() ? "not-allowed" : "pointer",
        }}
      >
        {isGenerating ? "生成中…" : "日報を生成する"}
      </button>

      {/* API error / fallback notice */}
      {apiError && (
        <div style={{ ...s.notice, marginTop: 12 }}>
          <span style={{ color: C.errorText }}>{apiError}</span>
          {usedFallback && (
            <span style={{ color: C.muted }}>
              　キーワード検出で生成しました。
            </span>
          )}
        </div>
      )}

      {/* ── Output ─────────────────────────────────────── */}
      {output && (
        <div style={{ marginTop: 24 }}>
          {/* Header row */}
          <div style={s.outputHeader}>
            <span style={s.outputLabel}>
              LINE用日報（出力）
              {usedFallback && (
                <span style={{ fontSize: 11, color: C.muted, marginLeft: 8, fontWeight: 400 }}>
                  キーワード検出
                </span>
              )}
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={handleCopy}
                style={{
                  ...s.smallBtn,
                  background: copied ? "rgba(52,211,153,0.15)" : "transparent",
                  border: `1px solid ${copied ? "#34D399" : C.border}`,
                  color: copied ? "#34D399" : C.textSub,
                }}
              >
                {copied ? "コピー済 ✓" : "コピー"}
              </button>
              <a
                href={`https://line.me/R/msg/text/?${encodeURIComponent(output)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={s.lineBtn}
              >
                LINEで共有
              </a>
              <button onClick={handleClear} style={s.smallBtn}>
                クリア
              </button>
            </div>
          </div>

          {/* Template output */}
          <pre style={s.pre}>{output}</pre>

          {/* Collapsible detail summary */}
          {sections && (
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => setSummaryOpen((o) => !o)}
                style={s.detailToggle}
              >
                {summaryOpen ? "▲" : "▼"}　AI抽出詳細
              </button>
              {summaryOpen && (
                <div style={s.detailBox}>
                  {SECTION_LABELS.map(([key, label]) => (
                    <div key={key} style={{ marginBottom: 10 }}>
                      <span style={s.detailSectionLabel}>{label}</span>
                      {sections[key].length === 0 ? (
                        <span style={{ color: C.muted, fontSize: 13 }}>
                          　（なし）
                        </span>
                      ) : (
                        <ul style={s.detailList}>
                          {sections[key].map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                  {usedFallback && (
                    <p style={{ fontSize: 12, color: C.muted, margin: "8px 0 0" }}>
                      ※ GROQ_API_KEY が未設定または API エラーのため、キーワード検出を使用しました。
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  accent: "#3B82F6",
  border: "#2C2C2C",
  muted: "#555",
  textSub: "#888",
  errorText: "#F87171",
  btnDisabledBg: "#1A1A1A",
} as const;

const s = {
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    margin: "0 0 10px",
  } as React.CSSProperties,

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  } as React.CSSProperties,

  label: {
    display: "block",
    fontSize: 11,
    color: "#555",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  } as React.CSSProperties,

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 10px",
    background: "#1E1E1E",
    border: "1px solid #2C2C2C",
    borderRadius: 6,
    color: "#E0E0E0",
    fontSize: 14,
    fontFamily: "inherit",
  } as React.CSSProperties,

  generateBtn: {
    padding: "12px 28px",
    border: "none",
    borderRadius: 6,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "0.02em",
    transition: "opacity 0.15s",
  } as React.CSSProperties,

  notice: {
    padding: "8px 12px",
    background: "rgba(248,113,113,0.07)",
    border: "1px solid rgba(248,113,113,0.2)",
    borderRadius: 6,
    fontSize: 13,
    lineHeight: 1.5,
  } as React.CSSProperties,

  outputHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    flexWrap: "wrap" as const,
    gap: 8,
  } as React.CSSProperties,

  outputLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: C.accent,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  } as React.CSSProperties,

  smallBtn: {
    padding: "6px 14px",
    background: "transparent",
    border: `1px solid #2C2C2C`,
    borderRadius: 6,
    color: "#888",
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.15s",
  } as React.CSSProperties,

  lineBtn: {
    display: "inline-block",
    padding: "6px 16px",
    background: "#06C755",
    border: "none",
    borderRadius: 6,
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "none",
    lineHeight: "1.5",
  } as React.CSSProperties,

  pre: {
    margin: 0,
    background: "#111",
    border: "1px solid #242424",
    borderRadius: 8,
    padding: "18px 20px",
    color: "#E8E8E8",
    fontSize: 14,
    lineHeight: 1.9,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontFamily: "'Courier New', Courier, 'Noto Sans Mono', monospace",
  } as React.CSSProperties,

  detailToggle: {
    background: "transparent",
    border: "none",
    color: "#555",
    fontSize: 12,
    cursor: "pointer",
    padding: "4px 0",
    letterSpacing: "0.03em",
  } as React.CSSProperties,

  detailBox: {
    marginTop: 8,
    padding: "14px 16px",
    background: "#141414",
    border: "1px solid #242424",
    borderRadius: 6,
  } as React.CSSProperties,

  detailSectionLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#666",
  } as React.CSSProperties,

  detailList: {
    margin: "4px 0 0 16px",
    padding: 0,
    listStyle: "disc",
    color: "#A0A0A0",
    fontSize: 13,
    lineHeight: 1.7,
  } as React.CSSProperties,
} as const;
