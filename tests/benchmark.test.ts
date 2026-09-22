import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { extractPdf } from "../lib/statements/extractPdf";
import { parseCommBankStatement } from "../lib/statements/parsers/commbank";

const benchmarkPath = process.env.SPENDWISE_BENCHMARK_PDF;

describe.skipIf(!benchmarkPath)("private CommBank benchmark", () => {
  it("matches the statement's own totals and reconciles every transaction", async () => {
    const bytes = new Uint8Array(await readFile(benchmarkPath!));
    const result = parseCommBankStatement(await extractPdf(bytes), "private-benchmark.pdf");
    if (process.env.PRINT_BENCHMARK) {
      const netCategories = result.spendingTransactions.reduce<Record<string, number>>((totals, transaction) => {
        totals[transaction.category] = (totals[transaction.category] ?? 0) + (transaction.direction === "refund" ? -transaction.amountCents : transaction.amountCents);
        return totals;
      }, {});
      const uber = result.transactions.filter((transaction) => transaction.merchant === "Uber Eats").reduce((totals, transaction) => {
        if (transaction.direction === "debit") totals.purchases += transaction.amountCents;
        if (transaction.direction === "refund") totals.refunds += transaction.amountCents;
        return totals;
      }, { purchases: 0, refunds: 0 });
      console.info(JSON.stringify({ statement: result.statement, diagnostics: result.diagnostics, netCategories, uber }, null, 2));
    }
    expect(result.transactions.length).toBeGreaterThan(0);
    expect(result.diagnostics.unreconciledTransactions).toBe(0);
    expect(result.diagnostics.missingBalanceTransactions).toBe(0);
    expect(result.diagnostics.reconciliationDiscrepancyCents).toBe(0);
    expect(result.diagnostics.statedDebitDiscrepancyCents).toBe(0);
    expect(result.diagnostics.statedCreditDiscrepancyCents).toBe(0);
    expect(result.diagnostics.closingBalanceDiscrepancyCents).toBe(0);
  }, 60_000);
});
