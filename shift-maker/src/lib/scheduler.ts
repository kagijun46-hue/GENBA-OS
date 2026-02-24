import type {
  Staff,
  MonthSettings,
  StaffRequest,
  Assignment,
  ScheduleWarning,
  Role,
  DayType,
} from './types';

// ============================================================
// 自動シフト編成（貪欲法）
// ============================================================

export function generateSchedule(
  year: number,
  month: number,
  staff: Staff[],
  settings: MonthSettings,
  requests: StaffRequest[]
): { assignments: Assignment[]; warnings: ScheduleWarning[] } {
  const assignments: Assignment[] = [];
  const warnings: ScheduleWarning[] = [];

  const daysInMonth = new Date(year, month, 0).getDate(); // month は 1-12

  // 日ごとに処理
  for (let day = 1; day <= daysInMonth; day++) {
    const date = formatDate(year, month, day);
    const dayOfWeek = new Date(year, month - 1, day).getDay(); // 0=日, 6=土
    const dayType: DayType =
      dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : 'weekday';

    // 枠を順番に処理
    const sortedSlots = [...settings.slots].sort((a, b) => a.order - b.order);

    for (const slot of sortedSlots) {
      const slotReqs = settings.requirements.filter(
        (r) => r.slotId === slot.id && r.dayType === dayType
      );

      // leader → hall → kitchen の順で割り当て（leaderを優先）
      const orderedRoles: Role[] = ['leader', 'hall', 'kitchen'];

      for (const role of orderedRoles) {
        const req = slotReqs.find((r) => r.role === role);
        if (!req || req.count === 0) continue;

        const eligible = getEligibleStaff(
          staff,
          role,
          date,
          slot.id,
          assignments,
          requests
        );

        for (let i = 0; i < req.count; i++) {
          if (eligible.length > 0) {
            const chosen = eligible.shift()!;
            assignments.push({
              id: `${date}-${slot.id}-${chosen.id}`,
              date,
              slotId: slot.id,
              staffId: chosen.id,
              year,
              month,
              isManual: false,
              createdAt: new Date().toISOString(),
            });
          } else {
            warnings.push({
              type: 'role_shortage',
              date,
              slotId: slot.id,
              message: `${date} [${slot.label}]: ${roleLabel(role)}が${req.count}人必要ですが、割り当て可能なスタッフが不足しています`,
            });
          }
        }
      }
    }
  }

  // 週上限チェック
  for (const s of staff) {
    if (!s.weeklyLimit) continue;
    const weeks = getWeeksInMonth(year, month);
    for (const [wStart, wEnd] of weeks) {
      const count = assignments.filter(
        (a) => a.staffId === s.id && a.date >= wStart && a.date <= wEnd
      ).length;
      if (count > s.weeklyLimit) {
        warnings.push({
          type: 'weekly_limit',
          staffId: s.id,
          date: wStart,
          message: `${s.name}: 週(${wStart}〜${wEnd})の上限${s.weeklyLimit}回を超えています（${count}回）`,
        });
      }
    }
  }

  // 連勤チェック（3日以上連続は警告）
  for (const s of staff) {
    const staffDates = assignments
      .filter((a) => a.staffId === s.id)
      .map((a) => a.date)
      .sort();

    let consecutive = 1;
    for (let i = 1; i < staffDates.length; i++) {
      const prev = new Date(staffDates[i - 1]);
      const curr = new Date(staffDates[i]);
      const diff =
        (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        consecutive++;
        if (consecutive >= 3) {
          warnings.push({
            type: 'consecutive',
            staffId: s.id,
            date: staffDates[i],
            message: `${s.name}: ${staffDates[i]} まで${consecutive}日連続出勤です`,
          });
        }
      } else {
        consecutive = 1;
      }
    }
  }

  return { assignments, warnings };
}

// ============================================================
// 割り当て可能なスタッフを取得（優先度・均等化でソート）
// ============================================================
function getEligibleStaff(
  staff: Staff[],
  role: Role,
  date: string,
  slotId: string,
  currentAssignments: Assignment[],
  requests: StaffRequest[]
): Staff[] {
  return staff
    .filter((s) => s.role === role)
    .filter((s) => {
      // 希望確認
      const req = requests.find(
        (r) => r.staffId === s.id && r.date === date
      );
      if (!req) return true; // 希望未提出 = 割り当て可能
      if (!req.available) return false; // × = 不可
      if (
        req.availableSlots.length > 0 &&
        !req.availableSlots.includes(slotId)
      )
        return false;
      return true;
    })
    .filter((s) => {
      // 同日に別枠で既に割り当て済みでないか
      return !currentAssignments.some(
        (a) => a.date === date && a.staffId === s.id
      );
    })
    .filter((s) => {
      // 週上限チェック
      if (!s.weeklyLimit) return true;
      const wStart = getWeekStart(date);
      const wEnd = getWeekEnd(date);
      const weekCount = currentAssignments.filter(
        (a) =>
          a.staffId === s.id && a.date >= wStart && a.date <= wEnd
      ).length;
      return weekCount < s.weeklyLimit;
    })
    .sort((a, b) => {
      // 優先度が高い順、同率なら今月の割り当てが少ない順
      if (b.priority !== a.priority) return b.priority - a.priority;
      const aCount = currentAssignments.filter(
        (x) => x.staffId === a.id
      ).length;
      const bCount = currentAssignments.filter(
        (x) => x.staffId === b.id
      ).length;
      return aCount - bCount;
    });
}

// ============================================================
// ユーティリティ
// ============================================================
function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getWeekStart(date: string): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // 月曜始まり
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function getWeekEnd(date: string): string {
  const start = new Date(getWeekStart(date));
  start.setDate(start.getDate() + 6);
  return start.toISOString().split('T')[0];
}

function getWeeksInMonth(
  year: number,
  month: number
): [string, string][] {
  const weeks: [string, string][] = [];
  const firstDay = formatDate(year, month, 1);
  const lastDay = formatDate(year, month, new Date(year, month, 0).getDate());

  let current = new Date(firstDay);
  const last = new Date(lastDay);

  while (current <= last) {
    const wStart = getWeekStart(current.toISOString().split('T')[0]);
    const wEnd = getWeekEnd(wStart);
    // 月内に clamp
    const clampedStart =
      wStart < firstDay ? firstDay : wStart;
    const clampedEnd = wEnd > lastDay ? lastDay : wEnd;

    if (!weeks.find((w) => w[0] === clampedStart)) {
      weeks.push([clampedStart, clampedEnd]);
    }
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function roleLabel(role: Role): string {
  const map: Record<Role, string> = {
    leader: 'リーダー',
    hall: 'ホール',
    kitchen: 'キッチン',
  };
  return map[role];
}

// ============================================================
// バリデーション（手動調整時のルールチェック）
// ============================================================
export function checkViolations(
  assignment: Assignment,
  allAssignments: Assignment[],
  staff: Staff[],
  requests: StaffRequest[]
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  const s = staff.find((x) => x.id === assignment.staffId);
  if (!s) return warnings;

  // × 希望
  const req = requests.find(
    (r) => r.staffId === s.id && r.date === assignment.date
  );
  if (req && !req.available) {
    warnings.push({
      type: 'no_staff',
      date: assignment.date,
      staffId: s.id,
      message: `${s.name} は ${assignment.date} に出勤不可を希望しています`,
    });
  }

  // 同日ダブルブッキング
  const sameDay = allAssignments.filter(
    (a) =>
      a.staffId === s.id &&
      a.date === assignment.date &&
      a.id !== assignment.id
  );
  if (sameDay.length > 0) {
    warnings.push({
      type: 'no_staff',
      date: assignment.date,
      staffId: s.id,
      message: `${s.name} は ${assignment.date} に既に別枠で割り当て済みです`,
    });
  }

  // 週上限
  if (s.weeklyLimit) {
    const wStart = getWeekStart(assignment.date);
    const wEnd = getWeekEnd(assignment.date);
    const weekCount = allAssignments.filter(
      (a) =>
        a.staffId === s.id &&
        a.date >= wStart &&
        a.date <= wEnd &&
        a.id !== assignment.id
    ).length;
    if (weekCount >= s.weeklyLimit) {
      warnings.push({
        type: 'weekly_limit',
        staffId: s.id,
        date: assignment.date,
        message: `${s.name} の週上限${s.weeklyLimit}回に達しています`,
      });
    }
  }

  return warnings;
}
