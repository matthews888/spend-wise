import { categorizeTransaction } from "./categorize";
import { normalizeMerchant } from "./normalizeMerchant";
import type { Direction, LedgerTransaction, ParseDiagnostics, StatementParseResult } from "./types";

function detectDelimiter(line: string) {
  return [",", ";", "\t"].sort((a, b) => line.split(b).length - line.split(a).length)[0];
}

function splitCsvLine(line: string, delimiter: string) {
  const output: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { output.push(value.trim()); value = ""; }
    else value += char;
  }
  output.push(value.trim());
  return output;
}

function dateToIso(raw: string) {
  const slash = raw.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (!slash) return null;
  const year = Number(slash[3]) < 100 ? 2000 + Number(slash[3]) : Number(slash[3]);
  return `${year}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
}

function numberFrom(raw: string | undefined) {
  if (!raw?.trim()) return null;
  const number = Number(raw.replace(/[$,\s]/g, ""));
  return Number.isFinite(number) ? number : null;
}

export function parseCsvStatement(text: string, fileName: string): StatementParseResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("CSV statement has no transaction rows.");
  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((header) => header.toLowerCase());
  const find = (...names: string[]) => headers.findIndex((header) => names.some((name) => header.includes(name)));
  const dateIndex = find("date");
  const descriptionIndex = find("description", "narrative", "merchant", "details");
  const debitIndex = find("debit", "withdrawal");
  const creditIndex = find("credit", "deposit");
  const amountIndex = find("amount");
  const balanceIndex = find("balance");
  if (dateIndex < 0 || descriptionIndex < 0 || (debitIndex < 0 && creditIndex < 0 && amountIndex < 0)) throw new Error("CSV columns could not be identified.");

  const transactions: LedgerTransaction[] = [];
  lines.slice(1).forEach((line, rowIndex) => {
    const cells = splitCsvLine(line, delimiter);
    const date = dateToIso(cells[dateIndex] ?? "");
    if (!date) return;
    const rawDescription = cells[descriptionIndex] || "Transaction";
    const debit = numberFrom(cells[debitIndex]);
    const credit = numberFrom(cells[creditIndex]);
    const signedAmount = numberFrom(cells[amountIndex]);
    const direction: Direction = debit && debit > 0 ? "debit"
      : credit && credit > 0 ? (/return|refund|reversal/i.test(rawDescription) ? "refund" : "credit")
      : signedAmount !== null && signedAmount < 0 ? "debit"
      : /return|refund|reversal/i.test(rawDescription) ? "refund" : "credit";
    const numericAmount = debit ?? credit ?? signedAmount;
    if (numericAmount === null || numericAmount === 0) return;
    const amountCents = Math.round(Math.abs(numericAmount) * 100);
    const balance = numberFrom(cells[balanceIndex]);
    const merchant = normalizeMerchant(rawDescription);
    const classification = categorizeTransaction(rawDescription, merchant, direction);
    transactions.push({
      id: `${fileName}:csv:${rowIndex + 2}`, date, valueDate: null, description: rawDescription, rawDescription, rawLines: [line], merchant,
      amount: amountCents / 100, amountCents, direction, kind: direction === "refund" ? "refund" : "debit", balance,
      balanceCents: balance === null ? null : Math.round(balance * 100), balanceMarkedCredit: balance !== null && balance >= 0,
      category: classification.category, wasteStatus: classification.wasteStatus, source: fileName,
      sourceLocation: { fileName, pageStart: 1, pageEnd: 1, yStart: rowIndex + 2, yEnd: rowIndex + 2, blockIndex: rowIndex },
      reconciliation: { status: "missing-anchor", previousBalanceCents: null, expectedBalanceCents: null, actualBalanceCents: balance === null ? null : Math.round(balance * 100), discrepancyCents: null },
    });
  });

  const debitTotalCents = transactions.filter((item) => item.direction === "debit").reduce((sum, item) => sum + item.amountCents, 0);
  const creditTotalCents = transactions.filter((item) => item.direction !== "debit").reduce((sum, item) => sum + item.amountCents, 0);
  const diagnostics: ParseDiagnostics = {
    transactionsExtracted: transactions.length, debitsExtracted: transactions.filter((item) => item.direction === "debit").length,
    creditsExtracted: transactions.filter((item) => item.direction === "credit").length, refundsExtracted: transactions.filter((item) => item.direction === "refund").length,
    reconciledTransactions: 0, unreconciledTransactions: transactions.length, missingBalanceTransactions: transactions.filter((item) => item.balanceCents === null).length,
    debitTotalCents, creditTotalCents, refundTotalCents: transactions.filter((item) => item.direction === "refund").reduce((sum, item) => sum + item.amountCents, 0),
    reconciliationDiscrepancyCents: 0, closingBalanceDiscrepancyCents: null, statedDebitDiscrepancyCents: null, statedCreditDiscrepancyCents: null, issues: [],
  };
  return {
    transactions, spendingTransactions: transactions.filter((item) => item.direction === "debit" || item.direction === "refund"),
    statement: { periodStart: null, periodEnd: null, openingBalanceCents: null, closingBalanceCents: null, statedDebitTotalCents: null, statedCreditTotalCents: null }, diagnostics,
  };
}
