import type { LedgerTransaction, ParseIssue } from "./types";

export function reconcileTransactions(
  transactions: LedgerTransaction[],
  openingBalanceCents: number | null,
  issues: ParseIssue[],
) {
  let previousBalanceCents = openingBalanceCents;

  for (const transaction of transactions) {
    if (previousBalanceCents === null) {
      transaction.reconciliation = {
        status: "missing-anchor",
        previousBalanceCents: null,
        expectedBalanceCents: null,
        actualBalanceCents: transaction.balanceCents,
        discrepancyCents: null,
      };
      if (transaction.balanceCents !== null) previousBalanceCents = transaction.balanceCents;
      continue;
    }

    const delta = transaction.direction === "debit" ? -transaction.amountCents : transaction.amountCents;
    const expectedBalanceCents = previousBalanceCents + delta;
    if (transaction.balanceCents === null) {
      transaction.reconciliation = {
        status: "missing-balance",
        previousBalanceCents,
        expectedBalanceCents,
        actualBalanceCents: null,
        discrepancyCents: null,
      };
      issues.push({
        code: "MISSING_RUNNING_BALANCE",
        message: `No running balance was found for ${transaction.description}.`,
        page: transaction.sourceLocation.pageStart,
        blockIndex: transaction.sourceLocation.blockIndex,
        rawLines: transaction.rawLines,
      });
      previousBalanceCents = expectedBalanceCents;
      continue;
    }

    const discrepancyCents = transaction.balanceCents - expectedBalanceCents;
    transaction.reconciliation = {
      status: discrepancyCents === 0 ? "reconciled" : "unreconciled",
      previousBalanceCents,
      expectedBalanceCents,
      actualBalanceCents: transaction.balanceCents,
      discrepancyCents,
    };
    if (discrepancyCents !== 0) {
      issues.push({
        code: "BALANCE_MISMATCH",
        message: `Running balance differs by ${(discrepancyCents / 100).toFixed(2)}.`,
        page: transaction.sourceLocation.pageStart,
        blockIndex: transaction.sourceLocation.blockIndex,
        rawLines: transaction.rawLines,
      });
    }
    previousBalanceCents = transaction.balanceCents;
  }
}
