export interface ReportMeta {
  date?: string;     // YYYY/MM/DD or YYYY-MM-DD
  siteName?: string; // 現場名
  team?: string;     // 班
  project?: string;  // 案件
}

export interface ParsedSections {
  morning: string[];
  afternoon: string[];
  quantity: string[];
  tomorrow: string[];
  preparation: string[];
  members: string[];
  notes: string[];
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

function formatDateWithWeekday(dateStr: string): string {
  if (!dateStr) return "未記入";
  const normalized = dateStr.replace(/\//g, "-");
  const d = new Date(
    normalized.length === 10 ? normalized + "T00:00:00" : normalized
  );
  if (isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}(${WEEKDAYS[d.getDay()]})`;
}

function formatSection(items: string[]): string {
  if (items.length === 0) return "・未記入";
  return items.map((item) => `・${item}`).join("\n");
}

/** Pure formatter: takes pre-parsed sections + meta → fixed template string */
export function formatDailyReport(
  sections: ParsedSections,
  meta: ReportMeta
): string {
  const date = formatDateWithWeekday(meta.date ?? "");
  const siteName = meta.siteName?.trim() || "未記入";
  const team = meta.team?.trim() || "未記入";
  const project = meta.project?.trim() || "未記入";

  return [
    "お疲れ様です。",
    "本日の作業が終了しました。",
    "",
    `【日付】${date}`,
    `【現場】${siteName}`,
    `【班】${team}`,
    `【案件】${project}`,
    "",
    "【本日の作業内容】",
    "■午前",
    formatSection(sections.morning),
    "■午後",
    formatSection(sections.afternoon),
    "",
    "【出来高 / 数量】",
    formatSection(sections.quantity),
    "",
    "【明日の作業】",
    formatSection(sections.tomorrow),
    "",
    "【準備物 / 段取り】",
    formatSection(sections.preparation),
    "",
    "【作業メンバー】",
    formatSection(sections.members),
    "",
    "【連絡事項 / 注意点】",
    formatSection(sections.notes),
  ].join("\n");
}

// ── Regex-based fallback (used when GROQ_API_KEY is not set) ─────────────────

type SectionKey = keyof ParsedSections;

const SECTION_PATTERNS: Array<[RegExp, SectionKey]> = [
  [/午後|夕方/, "afternoon"],
  [/午前|午前中/, "morning"],
  [/数量|出来高|m[23²³]|㎥|㎡|箇所/, "quantity"],
  [/明日の作業|明日|翌日|次回の作業/, "tomorrow"],
  [/準備物|準備|段取り|持ち物|材料|養生/, "preparation"],
  [/作業メンバー|メンバー|作業員|人員|担当者/, "members"],
  [/連絡事項|注意点|連絡|注意|報告|申し送り|伝達/, "notes"],
];

function detectSection(line: string): SectionKey | null {
  for (const [pattern, key] of SECTION_PATTERNS) {
    if (pattern.test(line)) return key;
  }
  return null;
}

function cleanLine(line: string): string {
  return line
    .replace(/^[\s　]*[・\-\–—•*＊◆◇▶▷→►]\s*/, "")
    .replace(/^[\s　]*\d+[.\)]\s*/, "")
    .trim();
}

/** Regex-based section detection — fallback when AI extraction is unavailable */
export function parseFromText(input: string): ParsedSections {
  const sections: ParsedSections = {
    morning: [],
    afternoon: [],
    quantity: [],
    tomorrow: [],
    preparation: [],
    members: [],
    notes: [],
  };
  if (!input.trim()) return sections;

  const lines = input
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let current: SectionKey = "morning";
  for (const line of lines) {
    const detected = detectSection(line);
    if (detected) current = detected;
    const content = cleanLine(line);
    if (content) sections[current].push(content);
  }
  return sections;
}
