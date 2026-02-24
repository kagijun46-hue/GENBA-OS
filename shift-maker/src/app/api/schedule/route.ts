import { NextResponse } from 'next/server';
import { getAllAssignments, saveAllAssignments, getAllStaff } from '@/lib/db';
import type { Assignment } from '@/lib/types';
import { checkViolations } from '@/lib/scheduler';

function genId(): string {
  return `asgn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  let assignments = getAllAssignments();

  if (year && month) {
    assignments = assignments.filter(
      (a) => a.year === Number(year) && a.month === Number(month)
    );
  }

  return NextResponse.json(assignments);
}

// 手動で1つの割り当てを追加/更新
export async function PUT(req: Request) {
  try {
    const body = await req.json() as Partial<Assignment> & { id?: string };
    const { date, slotId, staffId, year, month } = body;

    if (!date || !slotId || !staffId || !year || !month) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }

    const assignments = getAllAssignments();
    const staff = getAllStaff();

    let target: Assignment;

    if (body.id) {
      // 既存の割り当てを更新
      const idx = assignments.findIndex((a) => a.id === body.id);
      if (idx === -1) {
        return NextResponse.json({ error: '割り当てが見つかりません' }, { status: 404 });
      }
      target = { ...assignments[idx], staffId, isManual: true };
      assignments[idx] = target;
    } else {
      // 新規割り当て
      target = {
        id: genId(),
        date,
        slotId,
        staffId,
        year: Number(year),
        month: Number(month),
        isManual: true,
        createdAt: new Date().toISOString(),
      };
      assignments.push(target);
    }

    saveAllAssignments(assignments);

    // バリデーション（警告を返す）
    const warnings = checkViolations(target, assignments, staff, []);

    return NextResponse.json({ assignment: target, warnings });
  } catch {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// 割り当て削除
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id が必要です' }, { status: 400 });
    }
    const assignments = getAllAssignments();
    const filtered = assignments.filter((a) => a.id !== id);
    saveAllAssignments(filtered);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
