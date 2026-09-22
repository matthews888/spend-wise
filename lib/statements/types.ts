export type Category =
  | "Subscriptions"
  | "Apple purchases"
  | "Food delivery"
  | "Cafés"
  | "Dining out"
  | "Groceries"
  | "Shopping"
  | "Transport"
  | "Bills"
  | "Convenience"
  | "Transfers"
  | "Income"
  | "Other";

export type Direction = "debit" | "credit" | "refund";
export type WasteStatus = "avoidable" | "necessary" | "unreviewed";

export type PositionedTextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
};

export type ExtractedPage = {
  pageNumber: number;
  width: number;
  height: number;
  items: PositionedTextItem[];
};

export type PdfExtraction = {
  pageCount: number;
  pages: ExtractedPage[];
};

export type TransactionSource = {
  fileName: string;
  pageStart: number;
  pageEnd: number;
  yStart: number;
  yEnd: number;
  blockIndex: number;
};

export type Reconciliation = {
  status: "reconciled" | "unreconciled" | "missing-balance" | "missing-anchor";
  previousBalanceCents: number | null;
  expectedBalanceCents: number | null;
  actualBalanceCents: number | null;
  discrepancyCents: number | null;
};

export type LedgerTransaction = {
  id: string;
  date: string;
  valueDate: string | null;
  description: string;
  rawDescription: string;
  rawLines: string[];
  merchant: string;
  amount: number;
  amountCents: number;
  direction: Direction;
  kind: "debit" | "refund";
  balance: number | null;
  balanceCents: number | null;
  balanceMarkedCredit: boolean;
  category: Category;
  wasteStatus: WasteStatus;
  source: string;
  sourceLocation: TransactionSource;
  reconciliation: Reconciliation;
};

export type StatementSummary = {
  periodStart: string | null;
  periodEnd: string | null;
  openingBalanceCents: number | null;
  closingBalanceCents: number | null;
  statedDebitTotalCents: number | null;
  statedCreditTotalCents: number | null;
};

export type ParseIssue = {
  code: string;
  message: string;
  page: number | null;
  blockIndex: number | null;
  rawLines: string[];
};

export type ParseDiagnostics = {
  transactionsExtracted: number;
  debitsExtracted: number;
  creditsExtracted: number;
  refundsExtracted: number;
  reconciledTransactions: number;
  unreconciledTransactions: number;
  missingBalanceTransactions: number;
  debitTotalCents: number;
  creditTotalCents: number;
  refundTotalCents: number;
  reconciliationDiscrepancyCents: number;
  closingBalanceDiscrepancyCents: number | null;
  statedDebitDiscrepancyCents: number | null;
  statedCreditDiscrepancyCents: number | null;
  issues: ParseIssue[];
};

export type StatementParseResult = {
  transactions: LedgerTransaction[];
  spendingTransactions: LedgerTransaction[];
  statement: StatementSummary;
  diagnostics: ParseDiagnostics;
};

export type StatementRecord = {
  id: string;
  name: string;
  uploadedAt: string;
  transactionCount: number;
  diagnostics?: ParseDiagnostics;
};
