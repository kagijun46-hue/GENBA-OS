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
            音声 → 文字起こし → AI抽出 → LINE用テンプレ日報
          </p>
        </header>

        {/* ── Step 1: 音声 / テキスト ─────────────────── */}
        <section style={s.card}>
          <h2 style={s.cardTitle}>
            <span style={s.step}>01</span>
            音声アップロード・テキスト入力
          </h2>
          <AudioUploader rawText={rawText} onRawTextChange={setRawText} />
        </section>

        {/* ── Step 2: 日報生成 ─────────────────────────── */}
        <section style={s.card}>
          <h2 style={s.cardTitle}>
            <span style={s.step}>02</span>
            日報生成
          </h2>
          <ReportBuilder rawText={rawText} />
        </section>
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
    letterSpacing: "0.02em",
  } as React.CSSProperties,

  card: {
    background: "#141414",
    border: "1px solid #222",
    borderRadius: 10,
    padding: "24px 22px",
    marginBottom: 14,
  } as React.CSSProperties,

  cardTitle: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    fontWeight: 700,
    color: "#666",
    margin: "0 0 20px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  } as React.CSSProperties,

  step: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    background: "#1E1E1E",
    border: "1px solid #2C2C2C",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 800,
    color: "#3B82F6",
    letterSpacing: 0,
    flexShrink: 0,
  } as React.CSSProperties,
} as const;
