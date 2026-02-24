/**
 * シードデータ投入スクリプト
 * npx tsx scripts/seed.ts
 */
import fs from 'fs';
import path from 'path';
import type { Staff, MonthSettings, StaffRequest } from '../src/lib/types';

const DATA_DIR = path.join(process.cwd(), 'data');

function write(filename: string, data: unknown) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
  console.log(`✓ ${filename}`);
}

// ==============================
// スタッフ
// ==============================
const staff: Staff[] = [
  { id: 'staff-1', name: '山田 花子', role: 'leader', priority: 5, weeklyLimit: 5, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'staff-2', name: '鈴木 太郎', role: 'leader', priority: 4, weeklyLimit: 4, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'staff-3', name: '田中 一郎', role: 'hall', priority: 4, weeklyLimit: 5, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'staff-4', name: '佐藤 美咲', role: 'hall', priority: 3, weeklyLimit: 4, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'staff-5', name: '伊藤 健司', role: 'hall', priority: 3, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'staff-6', name: '渡辺 由美', role: 'hall', priority: 2, weeklyLimit: 3, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'staff-7', name: '中村 浩二', role: 'kitchen', priority: 5, weeklyLimit: 5, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'staff-8', name: '小林 恵子', role: 'kitchen', priority: 4, weeklyLimit: 4, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'staff-9', name: '加藤 大輔', role: 'kitchen', priority: 3, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'staff-10', name: '松本 さくら', role: 'kitchen', priority: 2, weeklyLimit: 3, createdAt: '2026-01-01T00:00:00Z' },
];

// ==============================
// 月設定（2026年2月）
// ==============================
const settings: MonthSettings = {
  year: 2026,
  month: 2,
  slots: [
    { id: 'slot-1', label: '08:00-17:00', order: 1 },
    { id: 'slot-2', label: '11:00-L', order: 2 },
    { id: 'slot-3', label: '17:00-22:00', order: 3 },
  ],
  requirements: [
    // 平日
    { id: 'req-1', dayType: 'weekday', slotId: 'slot-1', role: 'leader', count: 1 },
    { id: 'req-2', dayType: 'weekday', slotId: 'slot-1', role: 'hall', count: 1 },
    { id: 'req-3', dayType: 'weekday', slotId: 'slot-1', role: 'kitchen', count: 1 },
    { id: 'req-4', dayType: 'weekday', slotId: 'slot-2', role: 'leader', count: 1 },
    { id: 'req-5', dayType: 'weekday', slotId: 'slot-2', role: 'hall', count: 2 },
    { id: 'req-6', dayType: 'weekday', slotId: 'slot-2', role: 'kitchen', count: 1 },
    { id: 'req-7', dayType: 'weekday', slotId: 'slot-3', role: 'leader', count: 1 },
    { id: 'req-8', dayType: 'weekday', slotId: 'slot-3', role: 'hall', count: 2 },
    { id: 'req-9', dayType: 'weekday', slotId: 'slot-3', role: 'kitchen', count: 1 },
    // 土日
    { id: 'req-10', dayType: 'weekend', slotId: 'slot-1', role: 'leader', count: 1 },
    { id: 'req-11', dayType: 'weekend', slotId: 'slot-1', role: 'hall', count: 2 },
    { id: 'req-12', dayType: 'weekend', slotId: 'slot-1', role: 'kitchen', count: 1 },
    { id: 'req-13', dayType: 'weekend', slotId: 'slot-2', role: 'leader', count: 1 },
    { id: 'req-14', dayType: 'weekend', slotId: 'slot-2', role: 'hall', count: 3 },
    { id: 'req-15', dayType: 'weekend', slotId: 'slot-2', role: 'kitchen', count: 2 },
    { id: 'req-16', dayType: 'weekend', slotId: 'slot-3', role: 'leader', count: 1 },
    { id: 'req-17', dayType: 'weekend', slotId: 'slot-3', role: 'hall', count: 3 },
    { id: 'req-18', dayType: 'weekend', slotId: 'slot-3', role: 'kitchen', count: 2 },
  ],
};

// ==============================
// 希望サンプル（2026年2月）
// ==============================
const requests: StaffRequest[] = [
  // 山田さん: 1日・2日は不可
  { id: 'req-s1-1', staffId: 'staff-1', date: '2026-02-01', available: false, availableSlots: [], updatedAt: '2026-01-20T00:00:00Z' },
  { id: 'req-s1-2', staffId: 'staff-1', date: '2026-02-02', available: false, availableSlots: [], updatedAt: '2026-01-20T00:00:00Z' },
  // 鈴木さん: 14日・15日は不可
  { id: 'req-s2-1', staffId: 'staff-2', date: '2026-02-14', available: false, availableSlots: [], updatedAt: '2026-01-20T00:00:00Z' },
  { id: 'req-s2-2', staffId: 'staff-2', date: '2026-02-15', available: false, availableSlots: [], updatedAt: '2026-01-20T00:00:00Z' },
  // 田中さん: 夜枠のみ希望
  { id: 'req-s3-1', staffId: 'staff-3', date: '2026-02-10', available: true, availableSlots: ['slot-3'], updatedAt: '2026-01-20T00:00:00Z' },
  { id: 'req-s3-2', staffId: 'staff-3', date: '2026-02-11', available: true, availableSlots: ['slot-3'], updatedAt: '2026-01-20T00:00:00Z' },
  // 渡辺さん: 20日は不可
  { id: 'req-s6-1', staffId: 'staff-6', date: '2026-02-20', available: false, availableSlots: [], updatedAt: '2026-01-20T00:00:00Z' },
];

write('staff.json', staff);
write('settings.json', settings);
write('requests.json', requests);
write('assignments.json', []);

console.log('\n✅ シードデータを投入しました。');
console.log('   → npm run dev で起動後、/schedule から自動作成を試してください。');
