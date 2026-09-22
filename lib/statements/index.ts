import { parseCsvStatement } from "./csv";
import { extractPdf } from "./extractPdf";
import { parseCommBankStatement } from "./parsers/commbank";

export async function parseStatementFile(file: File) {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  return isPdf ? parseCommBankStatement(await extractPdf(file), file.name) : parseCsvStatement(await file.text(), file.name);
}

export { extractPdf, parseCommBankStatement, parseCsvStatement };
export type * from "./types";
