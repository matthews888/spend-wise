export type Category =
  | "Subscriptions"
  | "Food delivery"
  | "Cafés"
  | "Dining out"
  | "Groceries"
  | "Shopping"
  | "Transport"
  | "Bills"
  | "Convenience"
  | "Other";

export type WasteStatus = "avoidable" | "necessary" | "unreviewed";

export type Transaction = {
  id: string;
  date: string;
  description: string;
  merchant: string;
  amount: number;
  category: Category;
  kind: "debit" | "refund";
  balance: number | null;
  source: string;
  wasteStatus: WasteStatus;
};

export type StatementRecord = {
  id: string;
  name: string;
  uploadedAt: string;
  transactionCount: number;
};

type MerchantRule = {
  pattern: RegExp;
  category: Category;
  merchant: string;
  waste?: WasteStatus;
};

const rules: MerchantRule[] = [
  { pattern: /uber\s*\*?\s*eats/i, category: "Food delivery", merchant: "Uber Eats", waste: "avoidable" },
  { pattern: /doordash/i, category: "Food delivery", merchant: "DoorDash", waste: "avoidable" },
  { pattern: /menulog|deliveroo/i, category: "Food delivery", merchant: "Food delivery", waste: "avoidable" },
  { pattern: /netflix/i, category: "Subscriptions", merchant: "Netflix" },
  { pattern: /spotify/i, category: "Subscriptions", merchant: "Spotify" },
  { pattern: /youtube\s*(premium)?/i, category: "Subscriptions", merchant: "YouTube Premium" },
  { pattern: /google workspace|gsuite/i, category: "Subscriptions", merchant: "Google Workspace" },
  { pattern: /adobe|creative cloud/i, category: "Subscriptions", merchant: "Adobe Creative Cloud" },
  { pattern: /claude\.ai|anthropic/i, category: "Subscriptions", merchant: "Claude" },
  { pattern: /playstation/i, category: "Subscriptions", merchant: "PlayStation" },
  { pattern: /amazon prime|disney|stan|binge|audible|notion/i, category: "Subscriptions", merchant: "Subscription" },
  { pattern: /fitness|fitlife|gym|anytime fitness|goodlife/i, category: "Subscriptions", merchant: "Gym" },
  { pattern: /apple\.com\/bill|icloud/i, category: "Subscriptions", merchant: "Apple" },
  { pattern: /woolworths|coles|aldi|iga\b/i, category: "Groceries", merchant: "Groceries" },
  { pattern: /mcdonald/i, category: "Dining out", merchant: "McDonald’s", waste: "avoidable" },
  { pattern: /\bkfc\b/i, category: "Dining out", merchant: "KFC", waste: "avoidable" },
  { pattern: /domino/i, category: "Dining out", merchant: "Domino’s", waste: "avoidable" },
  { pattern: /guzman/i, category: "Dining out", merchant: "Guzman y Gomez", waste: "avoidable" },
  { pattern: /starbucks|coffee|cafe|café/i, category: "Cafés", merchant: "Cafés", waste: "avoidable" },
  { pattern: /restaurant|mezze|grill|pizza|sushi|burger/i, category: "Dining out", merchant: "Dining out", waste: "avoidable" },
  { pattern: /7-eleven|7 eleven|nightowl|convenience/i, category: "Convenience", merchant: "Convenience store", waste: "avoidable" },
  { pattern: /uber(?!.*eats)|didi|taxi|go card|translink/i, category: "Transport", merchant: "Transport" },
  { pattern: /amazon|kmart|target|big w|jb hi|officeworks|ebay/i, category: "Shopping", merchant: "Shopping" },
  { pattern: /telstra|optus|vodafone|agl|origin energy|electricity|insurance/i, category: "Bills", merchant: "Household bill" },
];

const categories: Category[] = [
  "Subscriptions",
  "Food delivery",
  "Cafés",
  "Dining out",
  "Groceries",
  "Shopping",
  "Transport",
  "Bills",
  "Convenience",
  "Other",
];

export const categoryList = categories;

export const money = (value: number, decimals = 0) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

export const signedAmount = (transaction: Transaction) =>
  transaction.kind === "refund" ? -transaction.amount : transaction.amount;

export const monthKey = (isoDate: string) => isoDate.slice(0, 7);

export const monthLabel = (key: string, short = false) => {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AU", {
    month: short ? "short" : "long",
    year: short ? undefined : "numeric",
  }).format(new Date(year, month - 1, 1));
};

export function classify(description: string) {
  const rule = rules.find((item) => item.pattern.test(description));
  return {
    category: rule?.category ?? "Other",
    merchant: rule?.merchant ?? cleanMerchant(description),
    wasteStatus: rule?.waste ?? "unreviewed",
  } as const;
}

function cleanMerchant(value: string) {
  return (
    value
      .replace(/\b(eftpos|visa|debit|purchase|card|payment|au|australia)\b/gi, " ")
      .replace(/\d{4,}/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 4)
      .join(" ") || "Other purchase"
  );
}

function toIsoDate(raw: string, fallbackYear = new Date().getFullYear()) {
  const slash = raw.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (slash) {
    const year = Number(slash[3]) < 100 ? 2000 + Number(slash[3]) : Number(slash[3]);
    return `${year}-${String(Number(slash[2])).padStart(2, "0")}-${String(Number(slash[1])).padStart(2, "0")}`;
  }
  const named = raw.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s+(\d{4}))?/i);
  if (named) {
    const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(named[2].toLowerCase()) + 1;
    return `${named[3] ?? fallbackYear}-${String(month).padStart(2, "0")}-${String(Number(named[1])).padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function buildTransaction(args: {
  source: string;
  index: number;
  date: string;
  description: string;
  amount: number;
  balance?: number | null;
  kind?: "debit" | "refund";
}) {
  const matched = classify(args.description);
  return {
    id: `${args.source}-${args.index}-${args.date}-${args.amount}`.replace(/[^a-z0-9.-]/gi, "-"),
    date: args.date,
    description: args.description,
    merchant: matched.merchant,
    amount: Math.abs(args.amount),
    category: matched.category,
    kind: args.kind ?? "debit",
    balance: args.balance ?? null,
    source: args.source,
    wasteStatus: matched.wasteStatus,
  } satisfies Transaction;
}

function parseAmount(block: string) {
  const compact = block.replace(/\s+/g, " ");
  const value = compact.match(/Value Date\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})(\s+CR)?/i);
  if (value) {
    return {
      valueDate: value[1],
      amount: Number(value[2].replace(/,/g, "")),
      balance: Number(value[3].replace(/,/g, "")),
      balanceMarkedCredit: Boolean(value[4]),
    };
  }
  const first = block.split("\n")[0] ?? "";
  const numbers = [...first.matchAll(/([\d,]+\.\d{2})/g)].map((match) => Number(match[1].replace(/,/g, "")));
  return numbers.length >= 2
    ? { valueDate: "", amount: numbers.at(-2)!, balance: numbers.at(-1)!, balanceMarkedCredit: /\bCR\b/i.test(first) }
    : null;
}

export function analyseBankText(text: string, source: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const blocks: string[] = [];
  let current: string[] = [];
  const start = /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i;

  for (const line of lines) {
    if (start.test(line)) {
      if (current.length) blocks.push(current.join("\n"));
      current = [line];
    } else if (current.length) {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current.join("\n"));

  return blocks.flatMap((block, index) => {
    if (/Fast Transfer From|Direct Credit|CREDIT TO ACCOUNT|Salary|Interest Paid/i.test(block)) return [];
    const parsed = parseAmount(block);
    if (!parsed || !parsed.amount || parsed.amount > 100000) return [];
    const first = block.split("\n")[0].replace(/\s+/g, " ").trim();
    const printedDate = (first.match(/^\d{1,2}\s+[A-Za-z]{3}(?:\s+\d{4})?/) ?? [""])[0];
    const date = toIsoDate(parsed.valueDate || printedDate);
    if (!date) return [];
    const refund = /\b(Return|Refund|Reversal)\b/i.test(first);
    const description = first
      .replace(/^\d{1,2}\s+[A-Za-z]{3}(?:\s+\d{4})?\s+/, "")
      .replace(/\s+[\d,]+\.\d{2}\s+[\d,]+\.\d{2}(?:\s+CR)?$/, "")
      .trim();
    return [buildTransaction({ source, index, date, description, amount: parsed.amount, balance: parsed.balance, kind: refund ? "refund" : "debit" })];
  });
}

function detectDelimiter(line: string) {
  return [",", ";", "\t"].sort((a, b) => line.split(b).length - line.split(a).length)[0];
}

function splitCsvLine(line: string, delimiter: string) {
  const output: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) {
      output.push(value.trim());
      value = "";
    } else value += char;
  }
  output.push(value.trim());
  return output;
}

export function analyseCsv(text: string, source: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((header) => header.toLowerCase());
  const find = (...names: string[]) => headers.findIndex((header) => names.some((name) => header.includes(name)));
  const dateIndex = find("date");
  const descriptionIndex = find("description", "narrative", "merchant", "details");
  const debitIndex = find("debit", "withdrawal");
  const creditIndex = find("credit", "deposit");
  const amountIndex = find("amount");
  const balanceIndex = find("balance");

  return lines.slice(1).flatMap((line, index) => {
    const cells = splitCsvLine(line, delimiter);
    const date = toIsoDate(cells[dateIndex] ?? "");
    const description = cells[descriptionIndex] ?? "Card purchase";
    const rawAmount = cells[debitIndex >= 0 ? debitIndex : amountIndex] ?? "";
    const parsedAmount = Number(rawAmount.replace(/[$,\s]/g, ""));
    const creditAmount = creditIndex >= 0 ? Number((cells[creditIndex] ?? "").replace(/[$,\s]/g, "")) : 0;
    const amount = Math.abs(parsedAmount);
    const balance = balanceIndex >= 0 ? Number((cells[balanceIndex] ?? "").replace(/[$,\s]/g, "")) : null;
    if (!date || !amount || creditAmount > 0 || /salary|direct credit|interest paid/i.test(description)) return [];
    return [buildTransaction({ source, index, date, description, amount, balance: Number.isFinite(balance) ? balance : null })];
  });
}

export async function pdfText(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@5.4.149/legacy/build/pdf.worker.min.mjs";
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  let text = "";
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    let line = "";
    let lastY: number | null = null;
    for (const item of content.items as Array<{ str?: string; transform?: number[] }>) {
      if (!("str" in item)) continue;
      const y = item.transform?.[5] ?? 0;
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        text += `${line}\n`;
        line = "";
      }
      line += `${line ? " " : ""}${item.str ?? ""}`;
      lastY = y;
    }
    text += `${line}\n`;
  }
  return text;
}

const sampleRows: Array<[string, string, number]> = [
  ["2026-09-02", "Netflix Standard Plan", 25.99],
  ["2026-09-03", "FitLife Gym Monthly", 49],
  ["2026-09-04", "Uber Eats Sydney", 82.4],
  ["2026-09-05", "Woolworths Metro", 186.25],
  ["2026-09-06", "DoorDash Australia", 67.5],
  ["2026-09-07", "Little Lane Coffee Cafe", 18.4],
  ["2026-09-09", "Amazon AU Purchase", 149.95],
  ["2026-09-10", "Spotify Premium", 13.99],
  ["2026-09-11", "Uber Trip", 46.2],
  ["2026-09-12", "7-Eleven Southbank", 28.75],
  ["2026-09-14", "Adobe Creative Cloud", 32.99],
  ["2026-09-15", "Coles Supermarket", 214.3],
  ["2026-09-17", "Uber Eats Sydney", 91.6],
  ["2026-09-18", "Telstra Services", 89],
  ["2026-09-19", "Kmart Australia", 237.8],
  ["2026-09-20", "Corner Cafe", 24.8],
  ["2026-09-21", "McDonalds", 31.5],
  ["2026-09-22", "Apple iCloud", 4.49],
  ["2026-08-05", "Woolworths", 544.2],
  ["2026-08-07", "Uber Eats", 248.4],
  ["2026-08-09", "Netflix", 25.99],
  ["2026-08-12", "JB Hi Fi", 720],
  ["2026-08-16", "Cafes and Coffee", 146.8],
  ["2026-08-20", "Uber Trip", 184.2],
  ["2026-08-24", "Telstra", 89],
  ["2026-07-03", "Groceries Coles", 630],
  ["2026-07-06", "DoorDash", 311],
  ["2026-07-09", "Gym Monthly", 49],
  ["2026-07-12", "Shopping Amazon", 812],
  ["2026-07-18", "Cafe Coffee", 174],
  ["2026-07-22", "Household bill AGL", 280],
  ["2026-06-02", "Groceries Woolworths", 702],
  ["2026-06-07", "Uber Eats", 402],
  ["2026-06-10", "Shopping Kmart", 928],
  ["2026-06-14", "Cafe Coffee", 208],
  ["2026-06-21", "Transport Uber", 260],
  ["2026-05-04", "Groceries Coles", 745],
  ["2026-05-08", "DoorDash", 356],
  ["2026-05-12", "Shopping Amazon", 1040],
  ["2026-05-18", "Household bill Origin Energy", 310],
  ["2026-04-03", "Groceries Woolworths", 680],
  ["2026-04-08", "Uber Eats", 388],
  ["2026-04-15", "Shopping JB Hi Fi", 1180],
  ["2026-04-20", "Transport Uber", 312],
];

export const sampleTransactions: Transaction[] = sampleRows.map(([date, description, amount], index) =>
  buildTransaction({ source: "Sample data", index, date, description, amount }),
);
