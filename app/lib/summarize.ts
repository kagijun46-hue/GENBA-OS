export interface DailyReport {
  date: string;
  constructionName: string;
  location: string;
  workContent: string;
  issues: string;
  nextActions: string;
  transcription: string;
}

/**
 * 現場日報テンプレート要約モジュール
 * TODO: Claude API 等に差し替える
 */
export async function summarize(
  transcription: string,
  constructionName: string,
  location: string
): Promise<DailyReport> {
  // ダミー実装 — 固定テンプレートを返す
  const today = new Date().toISOString().split("T")[0];
  return {
    date: today,
    constructionName,
    location,
    workContent: transcription,
    issues: "特になし（ダミー）",
    nextActions: "次回確認予定（ダミー）",
    transcription,
  };
}

export function toMarkdown(report: DailyReport): string {
  return `# 現場日報

**日付:** ${report.date}
**工事名:** ${report.constructionName}
**場所:** ${report.location}

## 作業内容
${report.workContent}

## 問題・課題
${report.issues}

## 次回アクション
${report.nextActions}

---
*文字起こし原文:*
${report.transcription}
`;
}
