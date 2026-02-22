import fs from "fs/promises";
import path from "path";
import { DailyReport, toMarkdown } from "./summarize";

const OUTPUTS_DIR = path.resolve(process.cwd(), "..", "outputs");

export interface SaveResult {
  outputPath: string | null; // null on Vercel (no persistent FS)
  mdContent: string;
  jsonContent: string;
  slug: string;
}

function sanitize(str: string): string {
  return str.replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 50);
}

function buildSlug(constructionName: string, location: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${date}_${time}_${sanitize(constructionName)}_${sanitize(location)}`;
}

export async function saveReport(report: DailyReport): Promise<SaveResult> {
  const slug = buildSlug(report.constructionName, report.location);
  const mdContent = toMarkdown(report);
  const jsonContent = JSON.stringify(report, null, 2);

  if (process.env.VERCEL) {
    // Vercel: 永続ファイルシステムなし → コンテンツのみ返す
    return { outputPath: null, mdContent, jsonContent, slug };
  }

  // ローカル: /outputs に保存
  await fs.mkdir(OUTPUTS_DIR, { recursive: true });
  const mdPath = path.join(OUTPUTS_DIR, `${slug}.md`);
  const jsonPath = path.join(OUTPUTS_DIR, `${slug}.json`);
  await Promise.all([
    fs.writeFile(mdPath, mdContent, "utf-8"),
    fs.writeFile(jsonPath, jsonContent, "utf-8"),
  ]);

  return { outputPath: mdPath, mdContent, jsonContent, slug };
}
