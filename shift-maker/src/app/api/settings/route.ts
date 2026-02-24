import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/db';
import type { MonthSettings } from '@/lib/types';

export async function GET() {
  const settings = getSettings();
  if (!settings) {
    // デフォルト設定を返す
    const now = new Date();
    const defaultSettings: MonthSettings = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      slots: [
        { id: 'slot-1', label: '08:00-17:00', order: 1 },
        { id: 'slot-2', label: '11:00-L', order: 2 },
        { id: 'slot-3', label: '17:00-22:00', order: 3 },
      ],
      requirements: [],
    };
    return NextResponse.json(defaultSettings);
  }
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as MonthSettings;
    if (!body.year || !body.month || !body.slots) {
      return NextResponse.json(
        { error: '必須項目が不足しています（year, month, slots）' },
        { status: 400 }
      );
    }
    saveSettings(body);
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
