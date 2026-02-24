'use client';

import { useState, useEffect } from 'react';
import type { Staff, Role } from '@/lib/types';

const ROLE_LABELS: Record<Role, string> = {
  leader: 'リーダー',
  hall: 'ホール',
  kitchen: 'キッチン',
};

const ROLE_COLORS: Record<Role, string> = {
  leader: 'bg-yellow-100 text-yellow-800',
  hall: 'bg-blue-100 text-blue-800',
  kitchen: 'bg-green-100 text-green-800',
};

const emptyForm = {
  name: '',
  role: 'hall' as Role,
  priority: 3,
  weeklyLimit: '',
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  async function loadStaff() {
    const res = await fetch('/api/staff');
    const data = await res.json();
    setStaff(data);
    setLoading(false);
  }

  useEffect(() => { loadStaff(); }, []);

  function openAdd() {
    setForm(emptyForm);
    setEditId(null);
    setError('');
    setShowForm(true);
  }

  function openEdit(s: Staff) {
    setForm({
      name: s.name,
      role: s.role,
      priority: s.priority,
      weeklyLimit: s.weeklyLimit != null ? String(s.weeklyLimit) : '',
    });
    setEditId(s.id);
    setError('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('名前を入力してください'); return; }

    const payload = {
      name: form.name.trim(),
      role: form.role,
      priority: Number(form.priority),
      weeklyLimit: form.weeklyLimit !== '' ? Number(form.weeklyLimit) : null,
    };

    if (editId) {
      const res = await fetch(`/api/staff/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { setError('更新に失敗しました'); return; }
    } else {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { setError('追加に失敗しました'); return; }
    }
    setShowForm(false);
    loadStaff();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`${name} を削除しますか？`)) return;
    await fetch(`/api/staff/${id}`, { method: 'DELETE' });
    loadStaff();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">スタッフ管理</h1>
        <button
          onClick={openAdd}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow hover:bg-indigo-700 active:scale-95 transition"
        >
          ＋ 追加
        </button>
      </div>

      {/* フォームモーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setShowForm(false)}>
          <div
            className="bg-white w-full rounded-t-2xl p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">
              {editId ? 'スタッフ編集' : 'スタッフ追加'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名前 *</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例: 田中 太郎"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">役割 *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                >
                  <option value="leader">リーダー</option>
                  <option value="hall">ホール</option>
                  <option value="kitchen">キッチン</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  優先度: {form.priority}（1=低〜5=高）
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1 低</span><span>3</span><span>5 高</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  週の上限回数（任意）
                </label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  value={form.weeklyLimit}
                  onChange={(e) => setForm({ ...form, weeklyLimit: e.target.value })}
                  placeholder="例: 3"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 rounded-lg py-3 text-gray-700 font-medium hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white rounded-lg py-3 font-semibold hover:bg-indigo-700"
                >
                  {editId ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-500 mt-8">読み込み中…</p>
      ) : staff.length === 0 ? (
        <div className="text-center mt-12 text-gray-400">
          <div className="text-5xl mb-3">👤</div>
          <p>スタッフが登録されていません</p>
          <button
            onClick={openAdd}
            className="mt-4 text-indigo-600 underline text-sm"
          >
            最初のスタッフを追加する
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-800">{s.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[s.role]}`}
                  >
                    {ROLE_LABELS[s.role]}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>
                    優先度: {'★'.repeat(s.priority)}{'☆'.repeat(5 - s.priority)}
                  </span>
                  {s.weeklyLimit && (
                    <span>週{s.weeklyLimit}回まで</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(s)}
                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                  aria-label="編集"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(s.id, s.name)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  aria-label="削除"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
