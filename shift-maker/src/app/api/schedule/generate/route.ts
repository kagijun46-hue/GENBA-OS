import { NextResponse } from 'next/server';
import {
  getAllStaff,
  getSettings,
  getAllRequests,
  saveAllAssignments,
  getAllAssignments,
} from '@/lib/db';
import { generateSchedule } from '@/lib/scheduler';

export async function POST(req: Request) {
  try {
    const body = await req.json() as { year: number; month: number; overwrite?: boolean };
    const { year, month, overwrite = true } = body;

    if (!year || !month) {
      return NextResponse.json({ error: 'year と month が必要です' }, { status: 400 });
    }

    const staff = getAllStaff();
    const settings = getSettings();
    const requests = getAllRequests();

    if (!settings) {
      return NextResponse.json({ error: '月設定が見つかりません。先に設定を保存してください。' }, { status: 400 });
    }
    if (staff.length === 0) {
      return NextResponse.json({ error: 'スタッフが登録されていません。' }, { status: 400 });
    }

    const { assignments: generated, warnings } = generateSchedule(
      year,
      month,
      staff,
      settings,
      requests
    );

    const allAssignments = getAllAssignments();

    if (overwrite) {
      // 対象月の既存割り当てを削除して新しいものに置き換え
      const other = allAssignments.filter(
        (a) => !(a.year === year && a.month === month)
      );
      saveAllAssignments([...other, ...generated]);
    } else {
      // 既存を保持しつつ追加
      saveAllAssignments([...allAssignments, ...generated]);
    }

    return NextResponse.json({
      count: generated.length,
      warnings,
      assignments: generated,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
