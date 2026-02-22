import fs from "fs/promises";
import path from "path";
import { DailyReport, toMarkdown } from "./summarize";

const OUTPUTS_DIR = path.resolve(process.cwd(), "..", "outputs");

export async function saveReport(
  report: DailyReport,
  slug: string
): Promise<string> {
  await fs.mkdir(OUTPUTS_DIR, { recursive: true });

  const md = toMarkdown(report);
  const mdPath = path.join(OUTPUTS_DIR, `${slug}.md`);
  const jsonPath = path.join(OUTPUTS_DIR, `${slug}.json`);

  await Promise.all([
    fs.writeFile(mdPath, md, "utf-8"),
    fs.writeFile(jsonPath, JSON.stringify(report, null, 2), "utf-8"),
  ]);

  return mdPath;
}
