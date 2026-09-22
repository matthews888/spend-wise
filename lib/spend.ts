import { categorizeTransaction } from "./statements/categorize";
import { normalizeMerchant } from "./statements/normalizeMerchant";
import type { Category, LedgerTransaction } from "./statements/types";

export type { Category, StatementRecord, WasteStatus } from "./statements/types";
export type Transaction = LedgerTransaction;
export { parseStatementFile } from "./statements";

export const categoryList: Category[] = [
  "Subscriptions", "Apple purchases", "Food delivery", "Cafés", "Dining out", "Groceries", "Shopping",
  "Transport", "Bills", "Convenience", "Transfers", "Income", "Other",
];

export const money = (value: number, decimals = 0) => new Intl.NumberFormat("en-AU", {
  style: "currency", currency: "AUD", minimumFractionDigits: decimals, maximumFractionDigits: decimals,
}).format(value);

export const signedAmount = (transaction: LedgerTransaction) => transaction.kind === "refund" ? -transaction.amount : transaction.amount;
export const monthKey = (isoDate: string) => isoDate.slice(0, 7);
export const monthLabel = (key: string, short = false) => {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AU", { month: short ? "short" : "long", year: short ? undefined : "numeric" }).format(new Date(year, month - 1, 1));
};

function sampleTransaction(date: string, description: string, amount: number, index: number): LedgerTransaction {
  const merchant = normalizeMerchant(description);
  const classification = categorizeTransaction(description, merchant, "debit");
  return {
    id: `sample-${index}`, date, valueDate: null, description, rawDescription: description, rawLines: [description], merchant,
    amount, amountCents: Math.round(amount * 100), direction: "debit", kind: "debit", balance: null, balanceCents: null,
    balanceMarkedCredit: false, category: classification.category, wasteStatus: classification.wasteStatus, source: "Sample data",
    sourceLocation: { fileName: "Sample data", pageStart: 1, pageEnd: 1, yStart: index, yEnd: index, blockIndex: index },
    reconciliation: { status: "missing-balance", previousBalanceCents: null, expectedBalanceCents: null, actualBalanceCents: null, discrepancyCents: null },
  };
}

const sampleRows: Array<[string, string, number]> = [
  ["2026-09-02", "Netflix Standard Plan", 25.99], ["2026-09-03", "FitLife Gym Monthly", 49], ["2026-09-04", "Uber Eats Sydney", 82.4],
  ["2026-09-05", "Woolworths Metro", 186.25], ["2026-09-06", "DoorDash Australia", 67.5], ["2026-09-07", "Little Lane Coffee Cafe", 18.4],
  ["2026-09-09", "Amazon AU Purchase", 149.95], ["2026-09-10", "Spotify Premium", 13.99], ["2026-09-11", "Uber Trip", 46.2],
  ["2026-09-12", "7-Eleven Southbank", 28.75], ["2026-09-14", "Adobe Creative Cloud", 32.99], ["2026-09-15", "Coles Supermarket", 214.3],
  ["2026-09-17", "Uber Eats Sydney", 91.6], ["2026-09-18", "Telstra Services", 89], ["2026-09-19", "Kmart Australia", 237.8],
  ["2026-09-20", "Corner Cafe", 24.8], ["2026-09-21", "McDonalds", 31.5], ["2026-09-22", "Apple iCloud", 4.49],
  ["2026-08-05", "Woolworths", 544.2], ["2026-08-07", "Uber Eats", 248.4], ["2026-08-09", "Netflix", 25.99], ["2026-08-12", "JB Hi Fi", 720],
  ["2026-08-16", "Cafes and Coffee", 146.8], ["2026-08-20", "Uber Trip", 184.2], ["2026-08-24", "Telstra", 89],
  ["2026-07-03", "Groceries Coles", 630], ["2026-07-06", "DoorDash", 311], ["2026-07-09", "Gym Monthly", 49],
  ["2026-07-12", "Shopping Amazon", 812], ["2026-07-18", "Cafe Coffee", 174], ["2026-07-22", "Household bill AGL", 280],
  ["2026-06-02", "Groceries Woolworths", 702], ["2026-06-07", "Uber Eats", 402], ["2026-06-10", "Shopping Kmart", 928],
  ["2026-06-14", "Cafe Coffee", 208], ["2026-06-21", "Transport Uber", 260], ["2026-05-04", "Groceries Coles", 745],
  ["2026-05-08", "DoorDash", 356], ["2026-05-12", "Shopping Amazon", 1040], ["2026-05-18", "Household bill Origin Energy", 310],
  ["2026-04-03", "Groceries Woolworths", 680], ["2026-04-08", "Uber Eats", 388], ["2026-04-15", "Shopping JB Hi Fi", 1180],
  ["2026-04-20", "Transport Uber", 312],
];

export const sampleTransactions = sampleRows.map(([date, description, amount], index) => sampleTransaction(date, description, amount, index));
