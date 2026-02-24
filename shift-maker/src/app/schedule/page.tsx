'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Staff, MonthSettings, Assignment, ScheduleWarning, Role } from '@/lib/types';

const ROLE_COLORS: Record<Role, string> = {
  leader: 'bg-yellow-100 text-yellow-800',
  hall: 'bg-blue-100 text-blue-800',
  kitchen: 'bg-green-100 text-green-800',
};

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

type EditModal = {
  assignment: Assignment | null;
  date: string;
  slotId: string;
  slotLabel: string;
} | null;

export default function SchedulePage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [settings, setSettings] = useState<MonthSettings | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [warnings, setWarnings] = useState<ScheduleWarning[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editModal, setEditModal] = useState<EditModal>(null);
  const [editStaffId, setEditStaffId] = useState('');
  const [cellWarnings, setCellWarnings] = useState<ScheduleWarning[]>([]);

  const staffMap = Object.fromEntries(staff.map((s) => [s.id, s]));
  const slotMap = Object.fromEntries(
    (settings?.slots ?? []).map((s) => [s.id, s])
  );

  async function loadData() {
    setLoading(true);
    const [staffRes, settingsRes, assignRes] = await Promise.all([
      fetch('/api/staff'),
      fetch('/api/settings'),
      fetch(`/api/schedule?year=${year}&month=${month}`),
    ]);
    const [staffData, settingsData, assignData] = await Promise.all([
      staffRes.json(),
      settingsRes.json(),
      assignRes.json(),
    ]);
    setStaff(staffData);
    setSettings(settingsData);
    setAssignments(assignData);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const reloadAssignments = useCallback(async () => {
    const res = await fetch(`/api/schedule?year=${year}&month=${month}`);
    setAssignments(await res.json());
  }, [year, month]);

  async function handleGenerate() {
    if (!confirm('現在の月のシフトを自動作成しますか？\n（既存のシフトは上書きされます）')) return;
    setGenerating(true);
    const res = await fetch('/api/schedule/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, overwrite: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? 'エラーが発生しました');
      setGenerating(false);
      return;
    }
    setWarnings(data.warnings ?? []);
    await reloadAssignments();
    setGenerating(false);
  }

  function getAssignments(date: string, slotId: string): Assignment[] {
    return assignments.filter((a) => a.date === date && a.slotId === slotId);
  }

  function openEdit(assignment: Assignment | null, date: string, slotId: string) {
    const slot = slotMap[slotId];
    setEditModal({ assignment, date, slotId, slotLabel: slot?.label ?? slotId });
    setEditStaffId(assignment?.staffId ?? '');
    setCellWarnings([]);
  }

  async function handleEditSave() {
    if (!editModal) return;
    if (!editStaffId) {
      // 削除
      if (editModal.assignment) {
        await fetch(`/api/schedule?id=${editModal.assignment.id}`, { method: 'DELETE' });
      }
      setEditModal(null);
      await reloadAssignments();
      return;
    }

    const payload = {
      id: editModal.assignment?.id,
      date: editModal.date,
      slotId: editModal.slotId,
      staffId: editStaffId,
      year,
      month,
    };
    const res = await fetch('/api/schedule', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setCellWarnings(data.warnings ?? []);
    if (data.warnings?.length === 0) {
      setEditModal(null);
    }
    await reloadAssignments();
  }

  function exportCsv() {
    window.location.href = `/api/schedule/export?year=${year}&month=${month}`;
  }

  const days = settings ? daysInMonth(year, month) : 0;
  const slots = settings?.slots.sort((a, b) => a.order - b.order) ?? [];

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-4 no-print">
        <button
          onClick={() => {
            if (month === 1) { setYear((y) => y - 1); setMonth(12); }
            else setMonth((m) => m - 1);
          }}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
        >◀</button>
        <div className="flex-1 text-center font-bold text-gray-800 text-lg">
          {year}年{month}月 シフト表
        </div>
        <button
          onClick={() => {
            if (month === 12) { setYear((y) => y + 1); setMonth(1); }
            else setMonth((m) => m + 1);
          }}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
        >▶</button>
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2 mb-4 no-print flex-wrap">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-semibold shadow hover:bg-indigo-700 active:scale-95 transition disabled:opacity-60"
        >
          {generating ? '⟳ 作成中…' : '⚡ 自動作成'}
        </button>
        <button
          onClick={exportCsv}
          className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-50 shadow-sm"
        >
          CSV
        </button>
        <button
          onClick={() => window.print()}
          className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-50 shadow-sm"
        >
          印刷
        </button>
      </div>

      {/* 警告 */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 no-print">
          <p className="text-sm font-semibold text-yellow-700 mb-2">⚠️ 警告 ({warnings.length}件)</p>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-yellow-700 flex gap-1">
                <span>•</span>
                <span>{w.message}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setWarnings([])}
            className="mt-2 text-xs text-yellow-600 underline"
          >
            閉じる
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-500 mt-12">読み込み中…</p>
      ) : slots.length === 0 ? (
        <div className="text-center text-gray-400 mt-12">
          <div className="text-4xl mb-2">⚙️</div>
          <p>先に「設定」でシフト枠・必要人数を設定してください</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          {/* 印刷タイトル */}
          <div className="print-only text-center font-bold text-lg mb-2">
            {year}年{month}月 シフト表
          </div>

          <table className="w-full text-xs border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 px-2 py-1.5 text-gray-600 font-semibold sticky left-0 bg-gray-100 min-w-[48px]">
                  日
                </th>
                {slots.map((slot) => (
                  <th
                    key={slot.id}
                    className="border border-gray-200 px-2 py-1.5 text-gray-600 font-semibold text-center min-w-[80px]"
                  >
                    {slot.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
                const date = formatDate(year, month, day);
                const dow = new Date(year, month - 1, day).getDay();
                const isWeekend = dow === 0 || dow === 6;
                const isSun = dow === 0;
                const isSat = dow === 6;

                return (
                  <tr
                    key={day}
                    className={isWeekend ? 'bg-blue-50/40' : 'hover:bg-gray-50/60'}
                  >
                    <td
                      className={`border border-gray-200 px-2 py-1.5 text-center font-medium sticky left-0 ${
                        isWeekend ? 'bg-blue-50' : 'bg-white'
                      } ${isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-gray-700'}`}
                    >
                      <div>{day}</div>
                      <div className="text-gray-400">{DAY_LABELS[dow]}</div>
                    </td>
                    {slots.map((slot) => {
                      const cellAssignments = getAssignments(date, slot.id);
                      return (
                        <td
                          key={slot.id}
                          className="border border-gray-200 px-1 py-1 align-top cursor-pointer hover:bg-indigo-50/50 transition"
                          onClick={() => openEdit(null, date, slot.id)}
                        >
                          <div className="flex flex-col gap-0.5 min-h-[28px]">
                            {cellAssignments.map((a) => {
                              const s = staffMap[a.staffId];
                              if (!s) return null;
                              return (
                                <button
                                  key={a.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEdit(a, date, slot.id);
                                  }}
                                  className={`text-left px-1 py-0.5 rounded text-xs font-medium truncate max-w-[76px] ${
                                    ROLE_COLORS[s.role]
                                  } ${a.isManual ? 'ring-1 ring-indigo-400' : ''}`}
                                >
                                  {s.name}
                                </button>
                              );
                            })}
                            {cellAssignments.length === 0 && (
                              <span className="text-gray-300 text-xs px-1">＋</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* スタッフ凡例 */}
          <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-100 p-3 no-print">
            <p className="text-xs font-semibold text-gray-500 mb-2">スタッフ一覧</p>
            <div className="flex flex-wrap gap-2">
              {staff.map((s) => (
                <span
                  key={s.id}
                  className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[s.role]}`}
                >
                  {s.name}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              ※ 枠を押してスタッフを追加/変更。手動変更分は枠に線が表示されます。
            </p>
          </div>
        </div>
      )}

      {/* 月別サマリー */}
      {staff.length > 0 && assignments.length > 0 && (
        <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-100 p-3 no-print">
          <p className="text-sm font-semibold text-gray-700 mb-2">スタッフ別 出勤回数</p>
          <div className="space-y-1">
            {staff.map((s) => {
              const count = assignments.filter(
                (a) => a.staffId === s.id && a.year === year && a.month === month
              ).length;
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[s.role]}`}>
                    {s.name}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-indigo-400 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((count / days) * 100 * 2, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{count}回</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {editModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end z-50"
          onClick={() => setEditModal(null)}
        >
          <div
            className="bg-white w-full rounded-t-2xl p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-gray-800 mb-1">スタッフ変更</h2>
            <p className="text-sm text-gray-500 mb-3">
              {editModal.date}（{editModal.slotLabel}）
            </p>

            {cellWarnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">
                {cellWarnings.map((w, i) => (
                  <p key={i} className="text-xs text-yellow-700">⚠️ {w.message}</p>
                ))}
              </div>
            )}

            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={editStaffId}
              onChange={(e) => { setEditStaffId(e.target.value); setCellWarnings([]); }}
            >
              <option value="">-- 削除（空白にする）--</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}（{s.role}）
                </option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => { setEditModal(null); setCellWarnings([]); }}
                className="flex-1 border border-gray-300 rounded-lg py-3 text-gray-700 font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handleEditSave}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-3 font-semibold hover:bg-indigo-700"
              >
                {cellWarnings.length > 0 ? '警告を無視して保存' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
