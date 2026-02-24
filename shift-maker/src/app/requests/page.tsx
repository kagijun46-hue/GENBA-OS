'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Staff, MonthSettings, StaffRequest } from '@/lib/types';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function RequestsPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [settings, setSettings] = useState<MonthSettings | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  // date -> { available: boolean; slots: string[] }
  const [dayMap, setDayMap] = useState<Record<string, { available: boolean; slots: string[] }>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/staff').then((r) => r.json()).then(setStaff);
    fetch('/api/settings').then((r) => r.json()).then((s: MonthSettings) => {
      setSettings(s);
      setYear(s.year);
      setMonth(s.month);
    });
  }, []);

  const loadRequests = useCallback(async () => {
    if (!selectedStaff) return;
    setLoading(true);
    const res = await fetch(`/api/requests?staffId=${selectedStaff}&year=${year}&month=${month}`);
    const data: StaffRequest[] = await res.json();
    const map: Record<string, { available: boolean; slots: string[] }> = {};
    for (const r of data) {
      map[r.date] = { available: r.available, slots: r.availableSlots };
    }
    setDayMap(map);
    setLoading(false);
  }, [selectedStaff, year, month]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  function toggleDay(date: string) {
    const current = dayMap[date];
    if (!current || current.available) {
      // available → unavailable
      setDayMap({ ...dayMap, [date]: { available: false, slots: [] } });
    } else {
      // unavailable → delete (no preference)
      const next = { ...dayMap };
      delete next[date];
      setDayMap(next);
    }
  }

  function toggleSlot(date: string, slotId: string) {
    const current = dayMap[date] ?? { available: true, slots: [] };
    const slots = current.slots.includes(slotId)
      ? current.slots.filter((s) => s !== slotId)
      : [...current.slots, slotId];
    setDayMap({ ...dayMap, [date]: { available: true, slots } });
  }

  async function handleSave() {
    if (!selectedStaff) return;
    setSaving(true);
    const requests = Object.entries(dayMap).map(([date, v]) => ({
      staffId: selectedStaff,
      date,
      available: v.available,
      availableSlots: v.slots,
    }));
    await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId: selectedStaff, year, month, requests }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const days = daysInMonth(year, month);
  const firstDow = new Date(year, month - 1, 1).getDay();
  const slots = settings?.slots.sort((a, b) => a.order - b.order) ?? [];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">希望入力</h1>

      {/* スタッフ選択 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">スタッフを選択</label>
        <select
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={selectedStaff}
          onChange={(e) => setSelectedStaff(e.target.value)}
        >
          <option value="">-- 選択してください --</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* 年月 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            if (month === 1) { setYear(y => y - 1); setMonth(12); }
            else setMonth(m => m - 1);
          }}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
        >
          ◀
        </button>
        <div className="flex-1 text-center font-semibold text-gray-700 bg-white rounded-lg border border-gray-200 py-2">
          {year}年{month}月
        </div>
        <button
          onClick={() => {
            if (month === 12) { setYear(y => y + 1); setMonth(1); }
            else setMonth(m => m + 1);
          }}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
        >
          ▶
        </button>
      </div>

      {!selectedStaff ? (
        <p className="text-center text-gray-400 mt-8">スタッフを選択してください</p>
      ) : loading ? (
        <p className="text-center text-gray-500 mt-8">読み込み中…</p>
      ) : (
        <>
          {/* 凡例 */}
          <div className="flex gap-3 text-xs text-gray-500 mb-3 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-white border border-gray-200 inline-block" /> 未設定
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-green-100 border border-green-300 inline-block" /> 出勤可
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-red-100 border border-red-300 inline-block" /> 不可 ×
            </span>
          </div>

          {/* カレンダー */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-4">
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map((d, i) => (
                <div
                  key={d}
                  className={`text-center text-xs font-medium py-1 ${
                    i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {/* 空白 */}
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
                const date = formatDate(year, month, day);
                const dow = (firstDow + day - 1) % 7;
                const entry = dayMap[date];
                const isUnavailable = entry?.available === false;
                const isAvailable = entry?.available === true;

                return (
                  <button
                    key={day}
                    onClick={() => toggleDay(date)}
                    className={`
                      aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium border transition
                      ${isUnavailable
                        ? 'bg-red-100 border-red-300 text-red-700'
                        : isAvailable
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }
                      ${dow === 0 ? 'text-red-600' : dow === 6 ? 'text-blue-600' : ''}
                    `}
                  >
                    <span>{day}</span>
                    {isUnavailable && <span className="text-xs">×</span>}
                    {isAvailable && entry.slots.length > 0 && (
                      <span className="text-xs">{entry.slots.length}枠</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 枠選択（利用可能な日を選択時） */}
          {slots.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                各日の出勤可能枠を選択（未選択 = 全枠OK）
              </h3>
              {Array.from({ length: days }, (_, i) => i + 1)
                .filter((day) => {
                  const date = formatDate(year, month, day);
                  return dayMap[date]?.available === true;
                })
                .map((day) => {
                  const date = formatDate(year, month, day);
                  const entry = dayMap[date]!;
                  return (
                    <div key={day} className="mb-3">
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        {month}/{day}（{DAY_LABELS[new Date(year, month - 1, day).getDay()]}）
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {slots.map((slot) => {
                          const selected = entry.slots.length === 0 || entry.slots.includes(slot.id);
                          return (
                            <button
                              key={slot.id}
                              onClick={() => toggleSlot(date, slot.id)}
                              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                                entry.slots.length === 0
                                  ? 'bg-green-100 border-green-300 text-green-700'
                                  : selected
                                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                    : 'bg-gray-50 border-gray-200 text-gray-400'
                              }`}
                            >
                              {slot.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              {Object.values(dayMap).filter((v) => v.available).length === 0 && (
                <p className="text-sm text-gray-400">カレンダーで出勤可能な日を選択してください</p>
              )}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full py-3 rounded-xl font-semibold text-white shadow transition active:scale-95 ${
              saved
                ? 'bg-green-500'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {saving ? '保存中…' : saved ? '✓ 保存しました' : '希望を保存'}
          </button>
        </>
      )}
    </div>
  );
}
