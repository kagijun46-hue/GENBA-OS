import { NextResponse } from 'next/server';
import { getAllRequests, saveAllRequests } from '@/lib/db';
import type { StaffRequest } from '@/lib/types';

function genId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get('staffId');
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  let requests = getAllRequests();

  if (staffId) requests = requests.filter((r) => r.staffId === staffId);
  if (year && month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    requests = requests.filter((r) => r.date.startsWith(prefix));
  }

  return NextResponse.json(requests);
}

// スタッフの1ヶ月分の希望をまとめて保存（上書き）
export async function POST(req: Request) {
  try {
    const body = await req.json() as { staffId: string; year: number; month: number; requests: Omit<StaffRequest, 'id' | 'updatedAt'>[] };
    const { staffId, year, month, requests: incoming } = body;

    if (!staffId || !year || !month) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }

    const all = getAllRequests();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;

    // 該当スタッフ×対象月の既存レコードを削除
    const filtered = all.filter(
      (r) => !(r.staffId === staffId && r.date.startsWith(prefix))
    );

    // 新しいリクエストを追加
    const now = new Date().toISOString();
    const newRecords: StaffRequest[] = incoming.map((r) => ({
      id: genId(),
      staffId,
      date: r.date,
      available: r.available,
      availableSlots: r.availableSlots ?? [],
      updatedAt: now,
    }));

    saveAllRequests([...filtered, ...newRecords]);
    return NextResponse.json({ ok: true, count: newRecords.length });
  } catch {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
