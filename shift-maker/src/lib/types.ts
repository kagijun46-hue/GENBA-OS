// ============================================================
// データモデル定義
// ============================================================

export type Role = 'hall' | 'kitchen' | 'leader';
export type DayType = 'weekday' | 'weekend';

// スタッフ
export interface Staff {
  id: string;
  name: string;
  role: Role;
  priority: number; // 1-5 (5が最高優先度)
  weeklyLimit?: number; // 週の上限回数
  createdAt: string;
}

// シフト枠定義（設定から）
export interface ShiftSlot {
  id: string;
  label: string; // "08:00-17:00", "11:00-L", "17:00-22:00"
  order: number; // 表示順
}

// 曜日区分×枠×役割ごとの必要人数
export interface Requirement {
  id: string;
  dayType: DayType;
  slotId: string;
  role: Role;
  count: number;
}

// 月設定
export interface MonthSettings {
  year: number;
  month: number; // 1-12
  slots: ShiftSlot[];
  requirements: Requirement[];
}

// スタッフごとの希望（1日×1レコード）
export interface StaffRequest {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  available: boolean; // false = 不可
  availableSlots: string[]; // 出勤できる枠のIDリスト（空 = 全枠OK）
  updatedAt: string;
}

// シフト割り当て
export interface Assignment {
  id: string;
  date: string; // YYYY-MM-DD
  slotId: string;
  staffId: string;
  year: number;
  month: number;
  isManual: boolean; // 手動調整フラグ
  createdAt: string;
}

// 自動編成の警告
export interface ScheduleWarning {
  type: 'weekly_limit' | 'consecutive' | 'no_staff' | 'role_shortage';
  date?: string;
  slotId?: string;
  staffId?: string;
  message: string;
}

// APIレスポンス汎用型
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
