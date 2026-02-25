"use client";

import Link from "next/link";
import { useState } from "react";
import { AudioUploader } from "@/components/AudioUploader";
import { ReportBuilder } from "@/components/ReportBuilder";

export default function ReportPage() {
  const [rawText, setRawText] = useState("");

  return (
    <main style={s.main}>
      <div style={s.container}>
        {/* ── Header ─────────────────────────────────── */}
        <header style={{ marginBottom: 32 }}>
          <Link href="/" style={s.backLink}>← ホーム</Link>
          <h1 style={s.h1}>現場日報</h1>
          <p style={s.subtitle}>
            テキスト貼り付け → AI抽出 → LINE用テンプレ日報
          </p>
        </header>

        {/* ── Main card ─────────────────────────────── */}
        <section style={s.card}>
          {/* Paste textarea */}
          <div style={{ marginBottom: 24 }}>
            <label style={s.label}>文字起こしテキスト</label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={
                "SuperWhisper 等で文字起こしたテキストをここに貼り付けてください。\n\n例:\n午前は型枠の設置を行いました。午後はコンクリート打設。\n明日は養生と片付け予定。メンバーは山田・田中・鈴木の3名。"
              }
              rows={8}
              style={s.textarea}
            />
          </div>

          {/* Meta + generate + output */}
          <ReportBuilder rawText={rawText} />
        </section>

        {/* ── 音声文字起こし（将来機能、折りたたみ） ─── */}
        <details style={s.details}>
          <summary style={s.summary}>
            🎤　音声から文字起こし（将来機能）
          </summary>
          <div style={s.detailBody}>
            <p style={s.detailNote}>
              OPENAI_API_KEY を設定すると、音声ファイルを直接アップロードして
              Whisper で文字起こしできます。文字起こし結果は上の textarea に自動反映されます。
            </p>
            <AudioUploader onTranscribed={setRawText} />
          </div>
        </details>
      </div>
    </main>
  );
}

const s = {
  main: {
    minHeight: "100vh",
    background: "#0C0C0C",
    padding: "28px 16px 64px",
  } as React.CSSProperties,

  container: {
    maxWidth: 640,
    margin: "0 auto",
  } as React.CSSProperties,

  backLink: {
    display: "inline-block",
    fontSize: 13,
    color: "#444",
    textDecoration: "none",
    marginBottom: 16,
    letterSpacing: "0.02em",
  } as React.CSSProperties,

  h1: {
    fontSize: 26,
    fontWeight: 800,
    color: "#F0F0F0",
    margin: "0 0 6px",
    letterSpacing: "-0.02em",
  } as React.CSSProperties,

  subtitle: {
    fontSize: 13,
    color: "#555",
    margin: 0,
  } as React.CSSProperties,

  card: {
    background: "#141414",
    border: "1px solid #222",
    borderRadius: 10,
    padding: "24px 22px",
    marginBottom: 14,
  } as React.CSSProperties,

  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "#555",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    marginBottom: 8,
  } as React.CSSProperties,

  textarea: {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "12px 14px",
    background: "#1A1A1A",
    border: "1px solid #2A2A2A",
    borderRadius: 8,
    color: "#E0E0E0",
    fontSize: 14,
    lineHeight: 1.75,
    resize: "vertical" as const,
    fontFamily: "inherit",
    minHeight: 160,
  } as React.CSSProperties,

  details: {
    border: "1px solid #1E1E1E",
    borderRadius: 8,
    overflow: "hidden",
  } as React.CSSProperties,

  summary: {
    padding: "12px 16px",
    fontSize: 13,
    color: "#484848",
    cursor: "pointer",
    listStyle: "none",
    userSelect: "none" as const,
    letterSpacing: "0.02em",
  } as React.CSSProperties,

  detailBody: {
    padding: "0 16px 20px",
    borderTop: "1px solid #1E1E1E",
  } as React.CSSProperties,

  detailNote: {
    fontSize: 13,
    color: "#484848",
    lineHeight: 1.6,
    margin: "14px 0 16px",
  } as React.CSSProperties,
} as const;
