/**
 * Browser document handling for the local data mode — replaces the backend
 * `app/shared/documents.py` (pypdf/python-docx) and `job/importer.py`
 * (csv/openpyxl) with in-browser equivalents: pdf.js, mammoth, SheetJS.
 *
 * Heavy parsers are loaded on demand (dynamic import) so they are code-split
 * out of the main bundle and only fetched when a user actually uploads a file.
 */
import { fail } from "@/lib/api/local/helpers";

const ALLOWED_RESUME_EXT = new Set([".pdf", ".docx", ".txt", ".md"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const SUPPORTED_IMPORT_EXT = new Set([".txt", ".md", ".csv", ".xlsx"]);
const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_IMPORT_ROWS = 200;

function extension(filename: string): string {
  const name = filename.toLowerCase().trim();
  const dot = name.lastIndexOf(".");
  return dot !== -1 ? name.slice(dot) : "";
}

/** Collapse excessive whitespace while preserving paragraph breaks. */
export function normalizeText(text: string): string {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim());
  const cleaned: string[] = [];
  let blank = false;
  for (const line of lines) {
    if (line) {
      cleaned.push(line.split(/\s+/).filter(Boolean).join(" "));
      blank = false;
    } else if (!blank) {
      cleaned.push("");
      blank = true;
    }
  }
  return cleaned.join("\n").trim();
}

/** Validate a resume file's extension and size, returning the extension. */
export function validateUpload(filename: string, size: number): string {
  const ext = extension(filename);
  if (!ALLOWED_RESUME_EXT.has(ext)) {
    fail("简历文件格式不支持，请上传 PDF、DOCX、TXT 或 Markdown 文件。");
  }
  if (size > MAX_FILE_BYTES) fail("文件过大，请上传 10MB 以内的简历。");
  return ext;
}

async function extractPdf(data: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(text);
  }
  return pages.join("\n");
}

async function extractDocx(data: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: data });
  return result.value;
}

/** Extract plain text from a supported document, throwing on failure. */
export async function extractText(filename: string, data: ArrayBuffer): Promise<string> {
  const ext = extension(filename);
  let text: string;
  try {
    if (ext === ".pdf") text = await extractPdf(data);
    else if (ext === ".docx") text = await extractDocx(data);
    else if (ext === ".txt" || ext === ".md") text = new TextDecoder("utf-8").decode(data);
    else return fail("简历文件格式不支持。");
  } catch (err) {
    if (err instanceof Error && err.name === "ApiError") throw err;
    return fail("简历解析失败，请确认文件内容完整后重试。");
  }
  return normalizeText(text);
}

// --- Bulk job import -------------------------------------------------------

export interface ParsedJob {
  title: string;
  jdText: string;
  company: string | null;
  city: string | null;
}

export interface ImportParseResult {
  jobs: ParsedJob[];
  errors: string[];
}

const TITLE_KEYS = new Set(["title", "岗位", "岗位名称", "职位", "职位名称"]);
const COMPANY_KEYS = new Set(["company", "公司", "公司名称"]);
const CITY_KEYS = new Set(["city", "城市", "工作地点", "地点"]);
const JD_KEYS = new Set([
  "jd",
  "jdtext",
  "jd_text",
  "jd text",
  "岗位描述",
  "职责",
  "描述",
  "jobdescription",
]);

function pick(row: Map<string, string>, keys: Set<string>): string | null {
  for (const [header, value] of row) {
    if (keys.has(header) && value) return value.trim() || null;
  }
  return null;
}

function rowsToJobs(rows: Map<string, string>[]): ImportParseResult {
  const result: ImportParseResult = { jobs: [], errors: [] };
  rows.forEach((row, idx) => {
    const index = idx + 2; // row 1 is the header
    const title = pick(row, TITLE_KEYS);
    const jdText = pick(row, JD_KEYS);
    if (!title || !jdText) {
      result.errors.push(`第 ${index} 行缺少岗位名称或岗位描述，已跳过。`);
      return;
    }
    result.jobs.push({
      title: title.slice(0, 128),
      jdText: normalizeText(jdText),
      company: pick(row, COMPANY_KEYS),
      city: pick(row, CITY_KEYS),
    });
  });
  return result;
}

function tableToRows(table: unknown[][]): Map<string, string>[] {
  if (!table.length) return [];
  const headers = (table[0] ?? []).map((h) =>
    h === null || h === undefined ? "" : String(h).trim().toLowerCase(),
  );
  const dictRows: Map<string, string>[] = [];
  for (let r = 1; r < table.length; r += 1) {
    const values = table[r] ?? [];
    const record = new Map<string, string>();
    let hasValue = false;
    for (let c = 0; c < headers.length; c += 1) {
      const raw = values[c];
      const cell = raw === null || raw === undefined ? "" : String(raw);
      record.set(headers[c], cell);
      if (cell.trim()) hasValue = true;
    }
    if (hasValue) dictRows.push(record);
    if (dictRows.length >= MAX_IMPORT_ROWS) break;
  }
  return dictRows;
}

async function parseSheet(data: ArrayBuffer, csv: boolean): Promise<ImportParseResult> {
  const XLSX = await import("xlsx");
  const workbook = csv
    ? XLSX.read(new TextDecoder("utf-8").decode(data).replace(/^\uFEFF/, ""), { type: "string" })
    : XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { jobs: [], errors: ["文件为空或缺少表头。"] };
  const sheet = workbook.Sheets[sheetName];
  const table = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
  if (!table.length) return { jobs: [], errors: ["文件为空或缺少表头。"] };
  return rowsToJobs(tableToRows(table));
}

function parseTextImport(data: ArrayBuffer): ImportParseResult {
  const text = normalizeText(new TextDecoder("utf-8").decode(data));
  if (!text) return { jobs: [], errors: ["文本文件为空。"] };
  const title = text.split("\n")[0].trim().slice(0, 128) || "未命名岗位";
  return { jobs: [{ title, jdText: text, company: null, city: null }], errors: [] };
}

/** Parse an uploaded file into job draft rows + per-row errors. */
export async function parseJobsFromFile(
  filename: string,
  data: ArrayBuffer,
): Promise<ImportParseResult> {
  const ext = extension(filename);
  if (!SUPPORTED_IMPORT_EXT.has(ext)) {
    fail("请上传 CSV、Excel(XLSX) 或 TXT 格式的岗位文件。");
  }
  if (data.byteLength > MAX_IMPORT_BYTES) fail("文件过大，请上传 5MB 以内的岗位文件。");

  if (ext === ".csv") return parseSheet(data, true);
  if (ext === ".xlsx") return parseSheet(data, false);
  return parseTextImport(data);
}
