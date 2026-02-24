'use client';

import { useState, useEffect } from 'react';
import type { MonthSettings, ShiftSlot, Requirement, Role, DayType } from '@/lib/types';

const ROLES: Role[] = ['leader', 'hall', 'kitchen'];
const ROLE_LABELS: Record<Role, string> = {
  leader: 'リーダー',
  hall: 'ホール',
  kitchen: 'キッチン',
};
const DAY_TYPES: { key: DayType; label: string }[] = [
  { key: 'weekday', label: '平日' },
  { key: 'weekend', label: '土日祝' },
];

function genId() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptySettings(year: number, month: number): MonthSettings {
  return {
    year,
    month,
    slots: [
      { id: 'slot-1', label: '08:00-17:00', order: 1 },
      { id: 'slot-2', label: '11:00-L', order: 2 },
      { id: 'slot-3', label: '17:00-22:00', order: 3 },
    ],
    requirements: [],
  };
}

export default function SettingsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [settings, setSettings] = useState<MonthSettings>(emptySettings(year, month));
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [newSlotLabel, setNewSlotLabel] = useState('');

  async function loadSettings() {
    setLoading(true);
    const res = await fetch('/api/settings');
    const data: MonthSettings = await res.json();
    setSettings(data);
    setYear(data.year);
    setMonth(data.month);
    setLoading(false);
  }

  useEffect(() => { loadSettings(); }, []);

  async function handleSave() {
    const payload: MonthSettings = { ...settings, year, month };
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  function addSlot() {
    if (!newSlotLabel.trim()) return;
    const newSlot: ShiftSlot = {
      id: genId(),
      label: newSlotLabel.trim(),
      order: settings.slots.length + 1,
    };
    setSettings({ ...settings, slots: [...settings.slots, newSlot] });
    setNewSlotLabel('');
  }

  function removeSlot(id: string) {
    setSettings({
      ...settings,
      slots: settings.slots.filter((s) => s.id !== id),
      requirements: settings.requirements.filter((r) => r.slotId !== id),
    });
  }

  function getRequirement(dayType: DayType, slotId: string, role: Role): number {
    const req = settings.requirements.find(
      (r) => r.dayType === dayType && r.slotId === slotId && r.role === role
    );
    return req?.count ?? 0;
  }

  function setRequirement(dayType: DayType, slotId: string, role: Role, count: number) {
    const updated = settings.requirements.filter(
      (r) => !(r.dayType === dayType && r.slotId === slotId && r.role === role)
    );
    if (count > 0) {
      updated.push({ id: genId(), dayType, slotId, role, count });
    }
    setSettings({ ...settings, requirements: updated });
  }

  if (loading) return <p className="text-center text-gray-500 mt-8">読み込み中…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">月設定</h1>
        <button
          onClick={handleSave}
          className={`px-4 py-2 rounded-lg text-sm font-semibold shadow transition active:scale-95 ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {saved ? '✓ 保存済み' : '保存'}
        </button>
      </div>

      {/* 対象年月 */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <h2 className="font-semibold text-gray-700 mb-3">対象年月</h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">年</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">月</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* シフト枠 */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <h2 className="font-semibold text-gray-700 mb-3">シフト枠</h2>
        <div className="space-y-2 mb-3">
          {settings.slots
            .sort((a, b) => a.order - b.order)
            .map((slot) => (
              <div key={slot.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm bg-gray-50 rounded px-3 py-2">{slot.label}</span>
                <button
                  onClick={() => removeSlot(slot.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  ✕
                </button>
              </div>
            ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={newSlotLabel}
            onChange={(e) => setNewSlotLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSlot(); } }}
            placeholder="例: 11:00-L"
          />
          <button
            onClick={addSlot}
            className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-200"
          >
            追加
          </button>
        </div>
      </section>

      {/* 必要人数 */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <h2 className="font-semibold text-gray-700 mb-3">必要人数（枠×役割×曜日区分）</h2>
        {settings.slots.length === 0 ? (
          <p className="text-sm text-gray-400">先にシフト枠を追加してください</p>
        ) : (
          <div className="space-y-4">
            {DAY_TYPES.map(({ key: dayType, label: dayLabel }) => (
              <div key={dayType}>
                <h3 className="text-sm font-semibold text-gray-600 mb-2 bg-gray-50 px-2 py-1 rounded">
                  {dayLabel}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left py-1 px-2 text-gray-500 font-medium">枠</th>
                        {ROLES.map((r) => (
                          <th key={r} className="py-1 px-2 text-gray-500 font-medium text-center">
                            {ROLE_LABELS[r]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {settings.slots
                        .sort((a, b) => a.order - b.order)
                        .map((slot) => (
                          <tr key={slot.id} className="border-t border-gray-100">
                            <td className="py-2 px-2 text-gray-700 font-medium">{slot.label}</td>
                            {ROLES.map((role) => (
                              <td key={role} className="py-2 px-2 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={10}
                                  className="w-14 border border-gray-300 rounded px-2 py-1 text-center text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                  value={getRequirement(dayType, slot.id, role)}
                                  onChange={(e) =>
                                    setRequirement(dayType, slot.id, role, Number(e.target.value))
                                  }
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
