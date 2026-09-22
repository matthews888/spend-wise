import { categorizeTransaction } from "../categorize";
import { normalizeMerchant } from "../normalizeMerchant";
import { reconcileTransactions } from "../reconcile";
import type {
  ExtractedPage,
  LedgerTransaction,
  ParseDiagnostics,
  ParseIssue,
  PdfExtraction,
  PositionedTextItem,
  StatementParseResult,
  StatementSummary,
} from "../types";

const monthNumbers: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};
const dateStart = /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s+(\d{4}))?\s+(.+)$/i;
const moneyPattern = /^\$?([\d,]+\.\d{2})(?:\s+(CR))?$/i;

type Row = { page: number; y: number; items: PositionedTextItem[] };
type Block = { index: number; rows: Row[] };

function cents(value: string) {
  return Math.round(Number(value.replace(/[$,]/g, "")) * 100);
}

function parseMoney(item: PositionedTextItem | undefined) {
  if (!item) return null;
  const match = item.str.match(moneyPattern);
  return match ? { cents: cents(match[1]), creditMarked: Boolean(match[2]) } : null;
}

function rowsFor(page: ExtractedPage): Row[] {
  const sorted = [...page.items].sort((a, b) => b.y - a.y || a.x - b.x || a.index - b.index);
  const rows: Row[] = [];
  for (const item of sorted) {
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 1.5);
    if (row) row.items.push(item);
    else rows.push({ page: page.pageNumber, y: item.y, items: [item] });
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) => ({ ...row, items: row.items.sort((a, b) => a.x - b.x || a.index - b.index) }));
}

function rowText(row: Row) {
  return row.items.map((item) => item.str).join(" ").replace(/\s+/g, " ").trim();
}

function datedRow(row: Row) {
  const complete = row.items.find((item) => item.x >= 45 && item.x < 90 && dateStart.test(item.str));
  if (complete) return { match: complete.str.match(dateStart)!, anchor: complete };
  const dateOnly = /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s+(\d{4}))?$/i;
  const anchor = row.items.find((item) => item.x >= 45 && item.x < 90 && dateOnly.test(item.str));
  if (!anchor) return null;
  const text = row.items
    .filter((item) => item.x >= anchor.x && item.x < 345)
    .map((item) => item.str)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const match = text.match(dateStart);
  return match ? { match, anchor } : null;
}

function transactionBlocks(extraction: PdfExtraction) {
  const blocks: Block[] = [];
  let current: Block | null = null;
  for (const page of extraction.pages) {
    for (const row of rowsFor(page)) {
      if (datedRow(row)) {
        if (current) blocks.push(current);
        current = { index: blocks.length, rows: [row] };
      } else if (current) {
        current.rows.push(row);
      }
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

function findPeriod(extraction: PdfExtraction) {
  const text = extraction.pages.slice(0, 2).flatMap((page) => page.items.map((item) => item.str)).join(" ");
  const match = text.match(/Statement period\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s*-\s*(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
  if (!match) return { periodStart: null, periodEnd: null };
  return {
    periodStart: isoDate(Number(match[1]), match[2], Number(match[3])),
    periodEnd: isoDate(Number(match[4]), match[5], Number(match[6])),
  };
}

function isoDate(day: number, monthName: string, year: number) {
  const canonical = `${monthName.slice(0, 1).toUpperCase()}${monthName.slice(1, 3).toLowerCase()}`;
  const month = monthNumbers[canonical];
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function inferYear(monthName: string, explicitYear: string | undefined, periodStart: string | null) {
  if (explicitYear) return Number(explicitYear);
  if (!periodStart) return new Date().getFullYear();
  const startYear = Number(periodStart.slice(0, 4));
  const startMonth = Number(periodStart.slice(5, 7));
  const month = monthNumbers[`${monthName[0].toUpperCase()}${monthName.slice(1, 3).toLowerCase()}`];
  return month < startMonth ? startYear + 1 : startYear;
}

function parseValueDate(rows: Row[]) {
  for (const row of rows) {
    const match = rowText(row).match(/Value Date\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
    if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }
  return null;
}

function parseSummary(extraction: PdfExtraction, period: Pick<StatementSummary, "periodStart" | "periodEnd">) {
  const summary: StatementSummary = {
    ...period,
    openingBalanceCents: null,
    closingBalanceCents: null,
    statedDebitTotalCents: null,
    statedCreditTotalCents: null,
  };
  for (const page of extraction.pages) {
    const rows = rowsFor(page);
    const labels = rows.find((row) => /Opening balance/i.test(rowText(row)) && /Total debits/i.test(rowText(row)));
    if (!labels) continue;
    const values = rows.find((row) => row.y < labels.y && labels.y - row.y < 35 && row.items.filter((item) => moneyPattern.test(item.str)).length >= 4);
    if (!values) continue;
    const byColumn = values.items.filter((item) => moneyPattern.test(item.str));
    const openingItem = byColumn.find((item) => item.x >= 160 && item.x < 270);
    const closingItem = byColumn.find((item) => item.x >= 465);
    const opening = parseMoney(openingItem);
    const debits = parseMoney(byColumn.find((item) => item.x >= 270 && item.x < 365));
    const credits = parseMoney(byColumn.find((item) => item.x >= 365 && item.x < 465));
    const closing = parseMoney(closingItem);
    const openingHasCr = opening?.creditMarked || values.items.some((item) => /^CR$/i.test(item.str) && openingItem && item.x > openingItem.x && item.x - openingItem.x < 60);
    const closingHasCr = closing?.creditMarked || values.items.some((item) => /^CR$/i.test(item.str) && closingItem && item.x > closingItem.x && item.x - closingItem.x < 60);
    summary.openingBalanceCents = opening ? (openingHasCr ? opening.cents : -opening.cents) : null;
    summary.statedDebitTotalCents = debits?.cents ?? null;
    summary.statedCreditTotalCents = credits?.cents ?? null;
    summary.closingBalanceCents = closing ? (closingHasCr ? closing.cents : -closing.cents) : null;
    break;
  }
  return summary;
}

function emptyReconciliation(): LedgerTransaction["reconciliation"] {
  return { status: "missing-anchor", previousBalanceCents: null, expectedBalanceCents: null, actualBalanceCents: null, discrepancyCents: null };
}

export function parseCommBankStatement(extraction: PdfExtraction, fileName = "CommBank statement"): StatementParseResult {
  const issues: ParseIssue[] = [];
  const period = findPeriod(extraction);
  const statement = parseSummary(extraction, period);
  const blocks = transactionBlocks(extraction);
  const transactions: LedgerTransaction[] = [];

  for (const block of blocks) {
    const firstRow = block.rows[0];
    const dated = datedRow(firstRow);
    if (!dated) continue;
    const { match: dateMatch, anchor: dateItem } = dated;
    const descriptionStart = dateMatch[4].trim();
    const rawLines = block.rows.map(rowText);
    if (/^OPENING BALANCE$/i.test(descriptionStart)) {
      const balanceItem = firstRow.items.find((item) => item.x >= 465 && moneyPattern.test(item.str));
      const opening = parseMoney(balanceItem);
      if (opening && statement.openingBalanceCents === null) statement.openingBalanceCents = opening.creditMarked ? opening.cents : -opening.cents;
      continue;
    }
    if (/^CLOSING BALANCE$/i.test(descriptionStart)) continue;

    const debitCandidates = block.rows.flatMap((row) => row.items.filter((item) => item.x >= 345 && item.x < 405 && moneyPattern.test(item.str)));
    const creditCandidates = block.rows.flatMap((row) => row.items.filter((item) => item.x >= 405 && item.x < 465 && moneyPattern.test(item.str)));
    const balanceCandidates = block.rows.flatMap((row) => row.items.filter((item) => item.x >= 465 && moneyPattern.test(item.str)));
    if (debitCandidates.length + creditCandidates.length !== 1) {
      issues.push({ code: "AMBIGUOUS_AMOUNT", message: "Expected exactly one debit or credit amount.", page: firstRow.page, blockIndex: block.index, rawLines });
      continue;
    }
    const isDebit = debitCandidates.length === 1;
    const amount = parseMoney(isDebit ? debitCandidates[0] : creditCandidates[0]);
    const balance = parseMoney(balanceCandidates[0]);
    if (!amount) continue;

    const continuationLines = block.rows.slice(1)
      .filter((row) => row.y >= 80 && (row.page === firstRow.page ? row.y < firstRow.y : row.y < 600))
      .flatMap((row) => row.items
      .filter((item) => item.x >= 80 && item.x < 345)
      .map((item) => item.str)
      .filter((text) => !/^Value Date\b/i.test(text) && !/^Card\s+/i.test(text) && !/^Date$/i.test(text)));
    const rawDescription = [descriptionStart, ...continuationLines].join(" ").replace(/\s+/g, " ").trim();
    const returnLike = /\b(return|refund|reversal|reversed)\b/i.test(rawDescription);
    const direction = isDebit ? "debit" as const : returnLike ? "refund" as const : "credit" as const;
    const merchant = normalizeMerchant(rawDescription);
    const classification = categorizeTransaction(rawDescription, merchant, direction);
    const year = inferYear(dateMatch[2], dateMatch[3], period.periodStart);
    const date = isoDate(Number(dateMatch[1]), dateMatch[2], year);
    const balanceCents = balance ? (balance.cents === 0 ? 0 : balance.creditMarked ? balance.cents : -balance.cents) : null;
    const pageEnd = block.rows.at(-1)?.page ?? firstRow.page;
    const yEnd = block.rows.at(-1)?.y ?? firstRow.y;

    transactions.push({
      id: `${fileName}:${firstRow.page}:${block.index}:${dateItem.index}`,
      date,
      valueDate: parseValueDate(block.rows),
      description: rawDescription,
      rawDescription,
      rawLines,
      merchant,
      amount: amount.cents / 100,
      amountCents: amount.cents,
      direction,
      kind: direction === "refund" ? "refund" : "debit",
      balance: balanceCents === null ? null : balanceCents / 100,
      balanceCents,
      balanceMarkedCredit: balance?.creditMarked ?? false,
      category: classification.category,
      wasteStatus: classification.wasteStatus,
      source: fileName,
      sourceLocation: { fileName, pageStart: firstRow.page, pageEnd, yStart: firstRow.y, yEnd, blockIndex: block.index },
      reconciliation: emptyReconciliation(),
    });
  }

  reconcileTransactions(transactions, statement.openingBalanceCents, issues);
  const debitTotalCents = transactions.filter((item) => item.direction === "debit").reduce((sum, item) => sum + item.amountCents, 0);
  const creditTotalCents = transactions.filter((item) => item.direction !== "debit").reduce((sum, item) => sum + item.amountCents, 0);
  const refundTotalCents = transactions.filter((item) => item.direction === "refund").reduce((sum, item) => sum + item.amountCents, 0);
  const lastBalanceCents = transactions.at(-1)?.balanceCents ?? null;
  const diagnostics: ParseDiagnostics = {
    transactionsExtracted: transactions.length,
    debitsExtracted: transactions.filter((item) => item.direction === "debit").length,
    creditsExtracted: transactions.filter((item) => item.direction === "credit").length,
    refundsExtracted: transactions.filter((item) => item.direction === "refund").length,
    reconciledTransactions: transactions.filter((item) => item.reconciliation.status === "reconciled").length,
    unreconciledTransactions: transactions.filter((item) => item.reconciliation.status === "unreconciled" || item.reconciliation.status === "missing-anchor").length,
    missingBalanceTransactions: transactions.filter((item) => item.reconciliation.status === "missing-balance").length,
    debitTotalCents,
    creditTotalCents,
    refundTotalCents,
    reconciliationDiscrepancyCents: transactions.reduce((sum, item) => sum + Math.abs(item.reconciliation.discrepancyCents ?? 0), 0),
    closingBalanceDiscrepancyCents: statement.closingBalanceCents === null || lastBalanceCents === null ? null : lastBalanceCents - statement.closingBalanceCents,
    statedDebitDiscrepancyCents: statement.statedDebitTotalCents === null ? null : debitTotalCents - statement.statedDebitTotalCents,
    statedCreditDiscrepancyCents: statement.statedCreditTotalCents === null ? null : creditTotalCents - statement.statedCreditTotalCents,
    issues,
  };
  return {
    transactions,
    spendingTransactions: transactions.filter((item) => item.direction === "debit" || item.direction === "refund"),
    statement,
    diagnostics,
  };
}
