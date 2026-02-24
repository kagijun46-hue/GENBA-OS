import { NextResponse } from 'next/server';
import { getAllAssignments, getAllStaff, getSettings } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get('year'));
  const month = Number(searchParams.get('month'));

  if (!year || !month) {
    return NextResponse.json({ error: 'year と month が必要です' }, { status: 400 });
  }

  const assignments = getAllAssignments().filter(
    (a) => a.year === year && a.month === month
  );
  const staff = getAllStaff();
  const settings = getSettings();

  if (!settings) {
    return NextResponse.json({ error: '設定が見つかりません' }, { status: 400 });
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const staffMap = Object.fromEntries(staff.map((s) => [s.id, s]));
  const slotMap = Object.fromEntries(settings.slots.map((s) => [s.id, s]));

  // CSV形式：日付,枠,スタッフ名,役割
  const rows: string[] = [
    '日付,シフト枠,スタッフ名,役割',
  ];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayAssignments = assignments.filter((a) => a.date === date);

    for (const slot of settings.slots.sort((a, b) => a.order - b.order)) {
      const slotAssignments = dayAssignments.filter((a) => a.slotId === slot.id);
      if (slotAssignments.length === 0) {
        rows.push(`${date},${slot.label},,`);
      } else {
        for (const asgn of slotAssignments) {
          const s = staffMap[asgn.staffId];
          rows.push(
            `${date},${slotMap[asgn.slotId]?.label ?? asgn.slotId},${s?.name ?? '不明'},${s?.role ?? ''}`
          );
        }
      }
    }
  }

  const csv = rows.join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="shift-${year}-${String(month).padStart(2, '0')}.csv"`,
    },
  });
}
