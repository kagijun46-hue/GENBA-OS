"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AudioUploader } from "@/components/AudioUploader";
import { ReportBuilder } from "@/components/ReportBuilder";

type SidStatus = "idle" | "loading" | "done" | "error";

export default function ReportPage() {
  const [rawText, setRawText] = useState("");
  // Both states are initialized synchronously from URL to avoid setState-in-effect lint errors
  const [sidStatus, setSidStatus] = useState<SidStatus>(() => {
    if (typeof window === "undefined") return "idle";
    return new URLSearchParams(window.location.search).has("sid") ? "loading" : "idle";
  });
  const [sidError, setSidError] = useState("");
  const [fromShare] = useState<boolean>(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("from") === "share"
  );
  const [clipMsg, setClipMsg] = useState("");

  // Fetch text from intake API when ?sid=xxx is present (only async setState in .then callbacks)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sid = new URLSearchParams(window.location.search).get("sid");
    if (!sid) return;
    fetch(`/api/intake?id=${encodeURIComponent(sid)}`)
      .then((r) => r.json())
      .then((data: { text?: string; error?: string }) => {
        if (data.text) {
          setRawText(data.text);
          setSidStatus("done");
        } else {
          setSidError(data.error ?? "テキストの取得に失敗しました。");
          setSidStatus("error");
        }
      })
      .catch(() => {
        setSidError("通信エラー: /api/intake に接続できませんでした。");
        setSidStatus("error");
      });
  }, []);

  const handleClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setRawText(text.trim());
        setClipMsg("✓ クリップボードから貼り付けました");
        setTimeout(() => setClipMsg(""), 3000);
      } else {
        setClipMsg("クリップボードが空です");
        setTimeout(() => setClipMsg(""), 2000);
      }
    } catch {
      setClipMsg("クリップボードへのアクセスが拒否されました。手動で貼り付けてください。");
      setTimeout(() => setClipMsg(""), 3000);
    }
  };

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

        {/* ── sid status banners ─────────────────────── */}
        {sidStatus === "loading" && (
          <div style={{ ...s.banner, ...s.bannerInfo }}>
            ⏳ テキストを読み込んでいます…
          </div>
        )}
        {sidStatus === "done" && (
          <div style={{ ...s.banner, ...s.bannerSuccess }}>
            ✓ テキストを自動入力しました。確認してから「日報を生成する」を押してください。
          </div>
        )}
        {sidStatus === "error" && (
          <div style={{ ...s.banner, ...s.bannerError }}>
            {sidError}
          </div>
        )}

        {/* ── Main card ─────────────────────────────── */}
        <section style={s.card}>
          {/* Clipboard paste button — prominent when from=share */}
          {fromShare && (
            <div style={s.shareRow}>
              <button onClick={handleClipboardPaste} style={s.clipBtn}>
                📋　クリップボードから貼り付け
              </button>
              {clipMsg && <span style={s.clipMsg}>{clipMsg}</span>}
            </div>
          )}

          {/* Paste textarea */}
          <div style={{ marginBottom: 24, position: "relative" }}>
            <div style={s.labelRow}>
              <label style={s.label}>文字起こしテキスト</label>
              {/* Clipboard button — subtle version when not from=share */}
              {!fromShare && (
                <button onClick={handleClipboardPaste} style={s.clipBtnSmall}>
                  📋 貼り付け
                </button>
              )}
            </div>
            {!fromShare && clipMsg && (
              <p style={s.clipMsgSmall}>{clipMsg}</p>
            )}
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

        {/* ── 音声文字起こし（将来機能） ────────────── */}
        <details style={s.details}>
          <summary style={s.summary}>
            🎤　音声から文字起こし（将来機能）
          </summary>
          <div style={s.detailBody}>
            <p style={s.detailNote}>
              OPENAI_API_KEY を設定すると、音声ファイルを直接アップロードして
              Whisper で文字起こしできます。結果は上の textarea に自動反映されます。
            </p>
            <AudioUploader onTranscribed={setRawText} />
          </div>
        </details>

        {/* ── /api/intake 使い方ガイド ──────────────── */}
        <details style={{ ...s.details, marginTop: 8 }}>
          <summary style={s.summary}>
            🔗　自動連携 (SuperWhisper → GENBA-OS) の設定方法
          </summary>
          <div style={s.detailBody}>
            <p style={s.detailNote}>
              SuperWhisper 等の転写後 Webhook に以下の設定を追加すると、
              テキストが自動入力された URL が生成されます。
            </p>
            <pre style={s.codeBlock}>{`# 1) 文字起こし完了後にPOST
curl -X POST https://<your-domain>/api/intake \\
  -H "Content-Type: application/json" \\
  -d '{"text": "{{transcript}}"}'

# → { "id": "a1b2c3d4e5f6..." }

# 2) 返ってきた id で /report を開く
https://<your-domain>/report?sid=a1b2c3d4e5f6...`}</pre>
            <p style={s.detailNote}>
              ID は取得後に削除されます（ワンタイム）。有効期限は 30 分です。
            </p>
          </div>
        </details>
      </div>
    </main>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
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

  // ── Banners ──
  banner: {
    padding: "10px 14px",
    borderRadius: 7,
    fontSize: 13,
    lineHeight: 1.5,
    marginBottom: 12,
  } as React.CSSProperties,

  bannerInfo: {
    background: "rgba(59,130,246,0.08)",
    border: "1px solid rgba(59,130,246,0.2)",
    color: "#93C5FD",
  } as React.CSSProperties,

  bannerSuccess: {
    background: "rgba(52,211,153,0.08)",
    border: "1px solid rgba(52,211,153,0.2)",
    color: "#6EE7B7",
  } as React.CSSProperties,

  bannerError: {
    background: "rgba(248,113,113,0.08)",
    border: "1px solid rgba(248,113,113,0.25)",
    color: "#FCA5A5",
  } as React.CSSProperties,

  // ── Main card ──
  card: {
    background: "#141414",
    border: "1px solid #222",
    borderRadius: 10,
    padding: "24px 22px",
    marginBottom: 14,
  } as React.CSSProperties,

  // ── Share / clipboard ──
  shareRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    padding: "12px 14px",
    background: "rgba(59,130,246,0.07)",
    border: "1px solid rgba(59,130,246,0.18)",
    borderRadius: 7,
  } as React.CSSProperties,

  clipBtn: {
    padding: "10px 18px",
    background: "#3B82F6",
    border: "none",
    borderRadius: 6,
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,

  clipMsg: {
    fontSize: 13,
    color: "#6EE7B7",
  } as React.CSSProperties,

  labelRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  } as React.CSSProperties,

  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "#555",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
  } as React.CSSProperties,

  clipBtnSmall: {
    padding: "4px 10px",
    background: "transparent",
    border: "1px solid #2C2C2C",
    borderRadius: 5,
    color: "#555",
    fontSize: 12,
    cursor: "pointer",
  } as React.CSSProperties,

  clipMsgSmall: {
    fontSize: 12,
    color: "#6EE7B7",
    margin: "0 0 6px",
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

  // ── Collapsed sections ──
  details: {
    border: "1px solid #1A1A1A",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
  } as React.CSSProperties,

  summary: {
    padding: "12px 16px",
    fontSize: 13,
    color: "#3A3A3A",
    cursor: "pointer",
    listStyle: "none",
    userSelect: "none" as const,
  } as React.CSSProperties,

  detailBody: {
    padding: "0 16px 20px",
    borderTop: "1px solid #1A1A1A",
  } as React.CSSProperties,

  detailNote: {
    fontSize: 13,
    color: "#484848",
    lineHeight: 1.6,
    margin: "14px 0 12px",
  } as React.CSSProperties,

  codeBlock: {
    background: "#111",
    border: "1px solid #222",
    borderRadius: 6,
    padding: "12px 14px",
    color: "#A0A0A0",
    fontSize: 12,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-all" as const,
    margin: 0,
    fontFamily: "'Courier New', monospace",
  } as React.CSSProperties,
} as const;
