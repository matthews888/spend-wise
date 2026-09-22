import { describe, expect, it } from "vitest";
import { normalizeMerchant } from "../lib/statements/normalizeMerchant";
import { parseCommBankStatement } from "../lib/statements/parsers/commbank";
import { fixture, splitDateDescriptionRow, transactionRow } from "./fixtures/commbank";

function ledgerFixture() {
  return fixture([
    ...transactionRow({ y: 700, date: "01 Dec 2025", description: "OPENING BALANCE", balance: "100.00 CR" }),
    ...transactionRow({ y: 680, date: "02 Dec", description: "CARD PURCHASE", debit: "10.00", balance: "90.00 CR", continuation: ["UBER *EATS SYDNEY", "Card xx1234"], valueDate: "02/12/2025" }),
    ...transactionRow({ y: 630, date: "02 Dec", description: "UBER *EATS SYDNEY", debit: "10.00", balance: "80.00 CR" }),
    ...transactionRow({ y: 610, date: "03 Dec", description: "DIRECT CREDIT", credit: "20.00", balance: "100.00 CR" }),
    ...transactionRow({ y: 590, date: "04 Dec", description: "Return UBER *EATS SYDNEY", credit: "5.00", balance: "105.00 CR" }),
    ...transactionRow({ y: 570, date: "05 Dec", description: "PAYMENT", debit: "105.00", balance: "0.00" }),
    ...transactionRow({ y: 550, date: "06 Dec", description: "DIRECT CREDIT", credit: "20.00", balance: "20.00 CR" }),
  ]);
}

describe("CommBank transaction reconstruction", () => {
  it("extracts debit, credit and refund from their columns", () => {
    const result = parseCommBankStatement(ledgerFixture(), "fixture.pdf");
    expect(result.transactions.map((item) => item.direction)).toEqual(["debit", "debit", "credit", "refund", "debit", "credit"]);
    expect(result.diagnostics.debitsExtracted).toBe(3);
    expect(result.diagnostics.creditsExtracted).toBe(2);
    expect(result.diagnostics.refundsExtracted).toBe(1);
  });

  it("preserves legitimate identical same-day transactions", () => {
    const result = parseCommBankStatement(ledgerFixture(), "fixture.pdf");
    const matches = result.transactions.filter((item) => item.date === "2025-12-02" && item.amountCents === 1000);
    expect(matches).toHaveLength(2);
    expect(new Set(matches.map((item) => item.id)).size).toBe(2);
  });

  it("reconstructs multi-line descriptions and Value Date", () => {
    const transaction = parseCommBankStatement(ledgerFixture(), "fixture.pdf").transactions[0];
    expect(transaction.description).toContain("UBER *EATS SYDNEY");
    expect(transaction.description).not.toContain("Card xx1234");
    expect(transaction.valueDate).toBe("2025-12-02");
    expect(transaction.merchant).toBe("Uber Eats");
  });

  it("reconstructs a transaction split across PDF text items", () => {
    const input = fixture([
      ...transactionRow({ y: 700, date: "01 Dec 2025", description: "OPENING BALANCE", balance: "100.00 CR" }),
      ...splitDateDescriptionRow(680, "02 Dec", "KFC BRISBANE", "10.00", "90.00 CR"),
    ]);
    const transaction = parseCommBankStatement(input).transactions[0];
    expect(transaction.description).toBe("KFC BRISBANE");
    expect(transaction.amountCents).toBe(1000);
    expect(transaction.reconciliation.status).toBe("reconciled");
  });

  it("keeps zero and CR running balances distinct", () => {
    const transactions = parseCommBankStatement(ledgerFixture(), "fixture.pdf").transactions;
    expect(transactions[4].balanceCents).toBe(0);
    expect(transactions[4].balanceMarkedCredit).toBe(false);
    expect(transactions[5].balanceCents).toBe(2000);
    expect(transactions[5].balanceMarkedCredit).toBe(true);
  });

  it("reconciles every transaction against the running balance", () => {
    const result = parseCommBankStatement(ledgerFixture(), "fixture.pdf");
    expect(result.diagnostics.reconciledTransactions).toBe(6);
    expect(result.diagnostics.unreconciledTransactions).toBe(0);
    expect(result.diagnostics.reconciliationDiscrepancyCents).toBe(0);
  });

  it("flags rather than guesses when the running balance disagrees", () => {
    const input = fixture([
      ...transactionRow({ y: 700, date: "01 Dec 2025", description: "OPENING BALANCE", balance: "100.00 CR" }),
      ...transactionRow({ y: 680, date: "02 Dec", description: "CARD PURCHASE", debit: "10.00", balance: "95.00 CR" }),
    ]);
    const result = parseCommBankStatement(input, "broken.pdf");
    expect(result.diagnostics.unreconciledTransactions).toBe(1);
    expect(result.diagnostics.issues[0].code).toBe("BALANCE_MISMATCH");
  });
});

describe("merchant normalisation", () => {
  it.each([
    ["UBER *EATS SYDNEY", "Uber Eats"], ["7-ELEVEN 1234", "7-Eleven"], ["APPLE.COM/BILL", "Apple"],
    ["CLAUDE.AI SUBSCRIPTION", "Claude"], ["GOOGLE*GSUITE", "Google Workspace"], ["MCDONALDS 999", "McDonald’s"],
  ])("normalises %s", (description, expected) => expect(normalizeMerchant(description)).toBe(expected));

  it("does not classify Apple purchases or convenience as subscriptions/waste", () => {
    const input = fixture([
      ...transactionRow({ y: 700, date: "01 Dec 2025", description: "OPENING BALANCE", balance: "100.00 CR" }),
      ...transactionRow({ y: 680, date: "02 Dec", description: "APPLE.COM/BILL", debit: "5.00", balance: "95.00 CR" }),
      ...transactionRow({ y: 660, date: "03 Dec", description: "7-ELEVEN 1234", debit: "5.00", balance: "90.00 CR" }),
    ]);
    const transactions = parseCommBankStatement(input).transactions;
    expect(transactions[0].category).toBe("Apple purchases");
    expect(transactions[1].category).toBe("Convenience");
    expect(transactions[1].wasteStatus).toBe("unreviewed");
  });
});
