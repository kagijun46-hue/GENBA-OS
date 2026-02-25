export interface ReportMeta {
  date?: string;     // YYYY/MM/DD or YYYY-MM-DD
  siteName?: string; // 現場名
  team?: string;     // 班
  project?: string;  // 案件
}

type SectionKey =
  | "morning"
  | "afternoon"
  | "quantity"
  | "tomorrow"
  | "preparation"
  | "members"
  | "notes";

interface ParsedSections {
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
  // Append time to avoid timezone offset issues
  const d = new Date(normalized.length === 10 ? normalized + "T00:00:00" : normalized);
  if (isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}(${WEEKDAYS[d.getDay()]})`;
}

// Ordered so that more specific patterns match first (午後 before 午前)
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

// Remove leading bullets/markers and trim
function cleanLine(line: string): string {
  return line
    .replace(/^[\s　]*[・\-\–—•*＊◆◇▶▷→►]\s*/, "")
    .replace(/^[\s　]*\d+[.\)]\s*/, "")
    .trim();
}

function formatSection(items: string[]): string {
  if (items.length === 0) return "・未記入";
  return items.map((item) => `・${item}`).join("\n");
}

function parseInput(input: string): ParsedSections {
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

  let currentSection: SectionKey = "morning";

  for (const line of lines) {
    const detected = detectSection(line);
    if (detected) {
      currentSection = detected;
    }
    const content = cleanLine(line);
    if (content) {
      sections[currentSection].push(content);
    }
  }

  return sections;
}

export function formatDailyReport(input: string, meta: ReportMeta): string {
  const s = parseInput(input);
  const date = formatDateWithWeekday(meta.date ?? "");
  const siteName = meta.siteName?.trim() || "未記入";
  const team = meta.team?.trim() || "未記入";
  const project = meta.project?.trim() || "未記入";

  const morning = formatSection(s.morning);
  const afternoon = formatSection(s.afternoon);
  const quantity = formatSection(s.quantity);
  const tomorrow = formatSection(s.tomorrow);
  const preparation = formatSection(s.preparation);
  const members = formatSection(s.members);
  const notes = formatSection(s.notes);

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
    morning,
    "■午後",
    afternoon,
    "",
    "【出来高 / 数量】",
    quantity,
    "",
    "【明日の作業】",
    tomorrow,
    "",
    "【準備物 / 段取り】",
    preparation,
    "",
    "【作業メンバー】",
    members,
    "",
    "【連絡事項 / 注意点】",
    notes,
  ].join("\n");
}
