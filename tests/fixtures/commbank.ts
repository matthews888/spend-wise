import type { ExtractedPage, PdfExtraction, PositionedTextItem } from "../../lib/statements/types";

let index = 0;
function item(str: string, x: number, y: number): PositionedTextItem {
  return { str, x, y, width: str.length * 5, height: 10, index: index++ };
}

export function transactionRow(args: { y: number; date: string; description: string; debit?: string; credit?: string; balance: string; continuation?: string[]; valueDate?: string }) {
  const items = [item(`${args.date} ${args.description}`, 60, args.y)];
  if (args.debit) items.push(item(args.debit, 367, args.y));
  if (args.credit) items.push(item(args.credit, 420, args.y));
  items.push(item(args.balance, 499, args.y));
  (args.continuation ?? []).forEach((text, offset) => items.push(item(text, 91, args.y - 12 * (offset + 1))));
  if (args.valueDate) items.push(item(`Value Date ${args.valueDate}`, 91, args.y - 12 * ((args.continuation?.length ?? 0) + 1)));
  return items;
}

export function splitDateDescriptionRow(y: number, date: string, description: string, debit: string, balance: string) {
  return [item(date, 60, y), item(description, 105, y), item(debit, 367, y), item(balance, 499, y)];
}

export function fixture(items: PositionedTextItem[]): PdfExtraction {
  index = 0;
  const page: ExtractedPage = { pageNumber: 1, width: 595, height: 842, items: [item("Statement period", 60, 760), item("1 Dec 2025 - 31 Jan 2026", 160, 760), ...items] };
  return { pageCount: 1, pages: [page] };
}
