import { NextResponse } from 'next/server';
import { getAllStaff, saveAllStaff } from '@/lib/db';
import type { Staff } from '@/lib/types';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const staff = getAllStaff();
    const idx = staff.findIndex((s) => s.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'スタッフが見つかりません' }, { status: 404 });
    }
    const updated: Staff = {
      ...staff[idx],
      name: body.name ?? staff[idx].name,
      role: body.role ?? staff[idx].role,
      priority: body.priority !== undefined ? Number(body.priority) : staff[idx].priority,
      weeklyLimit:
        body.weeklyLimit !== undefined
          ? body.weeklyLimit === '' || body.weeklyLimit === null
            ? undefined
            : Number(body.weeklyLimit)
          : staff[idx].weeklyLimit,
    };
    staff[idx] = updated;
    saveAllStaff(staff);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const staff = getAllStaff();
    const filtered = staff.filter((s) => s.id !== id);
    if (filtered.length === staff.length) {
      return NextResponse.json({ error: 'スタッフが見つかりません' }, { status: 404 });
    }
    saveAllStaff(filtered);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
