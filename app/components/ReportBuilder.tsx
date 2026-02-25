"use client";

import { useState } from "react";
import { formatDailyReport, type ReportMeta } from "@/lib/reportFormatter";

interface Props {
  rawText: string;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ReportBuilder({ rawText }: Props) {
  const [meta, setMeta] = useState<ReportMeta>({ date: todayISO() });
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  const set = (key: keyof ReportMeta) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setMeta((prev) => ({ ...prev, [key]: e.target.value }));

  const handleGenerate = () => {
    setOutput(formatDailyReport(rawText, meta));
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      // Fallback for environments without clipboard API
      const el = document.createElement("textarea");
      el.value = output;
      el.style.position = "fixed";
      el.style.opacity = "0";
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
    setMeta({ date: todayISO() });
    setCopied(false);
  };

  const s = styles;

  return (
    <div>
      {/* Meta inputs */}
      <div style={{ marginBottom: 16 }}>
        <p style={s.sectionLabel}>メタ情報（任意）</p>
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
      <button onClick={handleGenerate} style={s.generateBtn}>
        日報生成
      </button>

      {/* Output */}
      {output && (
        <div style={{ marginTop: 16 }}>
          <div style={s.outputHeader}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#4A90E2" }}>
              LINE用日報（出力）
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={handleCopy}
                style={{
                  ...s.smallBtn,
                  background: copied ? "#4CAF50" : "#2C2C2C",
                  border: `1px solid ${copied ? "#4CAF50" : "#4A4A4A"}`,
                  color: copied ? "#FFF" : "#F5F5F5",
                }}
              >
                {copied ? "コピー済み ✓" : "コピー"}
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
          <pre style={s.pre}>{output}</pre>
        </div>
      )}
    </div>
  );
}

const styles = {
  sectionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#BDBDBD",
    margin: "0 0 10px",
  } as React.CSSProperties,

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  } as React.CSSProperties,

  label: {
    display: "block",
    fontSize: 12,
    color: "#757575",
    marginBottom: 4,
  } as React.CSSProperties,

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 10px",
    background: "#2C2C2C",
    border: "1px solid #3A3A3A",
    borderRadius: 6,
    color: "#F5F5F5",
    fontSize: 14,
    fontFamily: "inherit",
  } as React.CSSProperties,

  generateBtn: {
    padding: "10px 24px",
    background: "#4A90E2",
    color: "#FFF",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,

  outputHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  } as React.CSSProperties,

  smallBtn: {
    padding: "6px 14px",
    background: "#2C2C2C",
    border: "1px solid #4A4A4A",
    borderRadius: 6,
    color: "#BDBDBD",
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.15s",
  } as React.CSSProperties,

  lineBtn: {
    display: "inline-block",
    padding: "6px 14px",
    background: "#06C755",
    border: "1px solid #06C755",
    borderRadius: 6,
    color: "#FFF",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    lineHeight: "1.4",
  } as React.CSSProperties,

  pre: {
    background: "#1A1A1A",
    border: "1px solid #3A3A3A",
    borderRadius: 6,
    padding: "14px 16px",
    color: "#F5F5F5",
    fontSize: 14,
    lineHeight: 1.8,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontFamily: "'Courier New', Courier, 'Noto Sans Mono', monospace",
    overflowX: "auto",
    margin: 0,
  } as React.CSSProperties,
} as const;
