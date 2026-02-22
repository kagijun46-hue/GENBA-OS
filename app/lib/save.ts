import fs from "fs/promises";
import path from "path";
import { DailyReport, toMarkdown } from "./summarize";

const OUTPUTS_DIR = path.resolve(process.cwd(), "..", "outputs");

function sanitize(str: string): string {
  return str.replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 50);
}

function buildSlug(constructionName: string, location: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${date}_${time}_${sanitize(constructionName)}_${sanitize(location)}`;
}

export async function saveReport(report: DailyReport): Promise<string> {
  await fs.mkdir(OUTPUTS_DIR, { recursive: true });

  const slug = buildSlug(report.constructionName, report.location);
  const md = toMarkdown(report);
  const mdPath = path.join(OUTPUTS_DIR, `${slug}.md`);
  const jsonPath = path.join(OUTPUTS_DIR, `${slug}.json`);

  await Promise.all([
    fs.writeFile(mdPath, md, "utf-8"),
    fs.writeFile(jsonPath, JSON.stringify(report, null, 2), "utf-8"),
  ]);

  return mdPath;
}
