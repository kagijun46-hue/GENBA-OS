import { NextResponse } from 'next/server';
import { getAllStaff, saveAllStaff } from '@/lib/db';
import type { Staff } from '@/lib/types';

function genId(): string {
  return `staff-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function GET() {
  const staff = getAllStaff();
  return NextResponse.json(staff);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, role, priority, weeklyLimit } = body as Partial<Staff>;

    if (!name || !role || priority === undefined) {
      return NextResponse.json(
        { error: '必須項目が不足しています（name, role, priority）' },
        { status: 400 }
      );
    }

    const staff = getAllStaff();
    const newStaff: Staff = {
      id: genId(),
      name: String(name).trim(),
      role,
      priority: Number(priority),
      weeklyLimit: weeklyLimit ? Number(weeklyLimit) : undefined,
      createdAt: new Date().toISOString(),
    };
    staff.push(newStaff);
    saveAllStaff(staff);
    return NextResponse.json(newStaff, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
