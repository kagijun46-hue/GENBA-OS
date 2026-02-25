/**
 * POST /api/intake  { text, meta? } → { id }
 * GET  /api/intake?id=xxx          → { text, meta? }  (one-time, then deleted)
 *
 * Storage: in-memory Map with 30-minute TTL.
 * Works on single-process servers (local dev, Railway, Fly.io, etc.).
 * On Vercel serverless, requests to the same warm Lambda instance will work;
 * cold starts create a fresh Map. For persistent multi-instance use, replace
 * the store with Redis / Vercel KV later.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const TTL_MS = 30 * 60 * 1000; // 30 minutes

interface Entry {
  text: string;
  meta?: Record<string, string>;
  expiresAt: number;
}

// Module-level Map (persists across requests within the same process)
const store = new Map<string, Entry>();

function purgeExpired(): void {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expiresAt < now) store.delete(id);
  }
}

function makeId(): string {
  return randomBytes(8).toString("hex"); // 16-char hex
}

// ── POST /api/intake ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { text?: string; meta?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.text?.trim()) {
    return NextResponse.json(
      { error: '"text" is required and must not be empty.' },
      { status: 400 }
    );
  }

  purgeExpired();

  const id = makeId();
  store.set(id, {
    text: body.text.trim(),
    meta: body.meta,
    expiresAt: Date.now() + TTL_MS,
  });

  return NextResponse.json({ id }, { status: 201 });
}

// ── GET /api/intake?id=xxx ───────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ error: '"id" query parameter is required.' }, { status: 400 });
  }

  const entry = store.get(id);

  if (!entry) {
    return NextResponse.json(
      { error: "Not found. The ID may be invalid or already retrieved." },
      { status: 404 }
    );
  }

  if (entry.expiresAt < Date.now()) {
    store.delete(id);
    return NextResponse.json({ error: "Expired." }, { status: 410 });
  }

  // One-time retrieval — delete after reading
  store.delete(id);

  return NextResponse.json({ text: entry.text, meta: entry.meta ?? null });
}
