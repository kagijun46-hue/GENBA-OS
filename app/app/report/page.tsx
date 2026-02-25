"use client";

import Link from "next/link";
import { useState } from "react";
import { AudioUploader } from "@/components/AudioUploader";
import { ReportBuilder } from "@/components/ReportBuilder";

export default function ReportPage() {
  const [rawText, setRawText] = useState("");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#1A1A1A",
        padding: "24px 16px 48px",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 6,
            }}
          >
            <Link
              href="/"
              style={{
                fontSize: 13,
                color: "#757575",
                textDecoration: "none",
              }}
            >
              ← ホーム
            </Link>
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#F5F5F5",
              margin: "0 0 4px",
            }}
          >
            現場日報
          </h1>
          <p style={{ fontSize: 13, color: "#757575", margin: 0 }}>
            音声をアップロードして日報を自動生成します。対応形式: m4a / mp3 /
            wav / mp4 / webm　上限: 25MB
          </p>
        </div>

        {/* Step 1: Upload & Transcribe */}
        <section style={cardStyle}>
          <h2 style={cardHeading}>① 音声アップロード・文字起こし</h2>
          <AudioUploader rawText={rawText} onRawTextChange={setRawText} />
        </section>

        {/* Step 2: Build report */}
        <section style={cardStyle}>
          <h2 style={cardHeading}>② 日報生成</h2>
          <ReportBuilder rawText={rawText} />
        </section>
      </div>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#242424",
  border: "1px solid #3A3A3A",
  borderRadius: 8,
  padding: 20,
  marginBottom: 16,
};

const cardHeading: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "#BDBDBD",
  margin: "0 0 16px",
};
