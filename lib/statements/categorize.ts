import type { Category, Direction, WasteStatus } from "./types";

type CategoryRule = { pattern: RegExp; category: Category; wasteStatus?: WasteStatus };

const rules: CategoryRule[] = [
  { pattern: /\buber eats\b|\bdoordash\b|\bmenulog\b|\bdeliveroo\b/i, category: "Food delivery", wasteStatus: "avoidable" },
  { pattern: /\bnetflix\b|\bspotify\b|\byoutube premium\b|\bgoogle workspace\b|\bclaude\b|\bplaystation\b|\badobe\b|\bamazon prime\b|\bdisney\b|\bstan\b|\bbinge\b|\baudible\b|\bnotion\b|\bgym\b|\bfitness\b/i, category: "Subscriptions" },
  { pattern: /\bapple\b/i, category: "Apple purchases" },
  { pattern: /\bwoolworths\b|\bcoles\b|\baldi\b|\biga\b/i, category: "Groceries" },
  { pattern: /\bstarbucks\b|\bcoffee\b|\bcafe\b|\bcafé\b/i, category: "Cafés", wasteStatus: "avoidable" },
  { pattern: /\bkfc\b|\bmcdonald|\bdomino|\bguzman\b|restaurant|mezze|grill|pizza|sushi|burger/i, category: "Dining out", wasteStatus: "avoidable" },
  { pattern: /\b7-eleven\b|\bnightowl\b|convenience/i, category: "Convenience" },
  { pattern: /\buber\b|\bdidi\b|taxi|go card|translink/i, category: "Transport" },
  { pattern: /amazon|kmart|target|big w|jb hi|officeworks|ebay/i, category: "Shopping" },
  { pattern: /telstra|optus|vodafone|agl|origin energy|electricity|insurance/i, category: "Bills" },
  { pattern: /transfer (to|from)|credit to account/i, category: "Transfers" },
  { pattern: /pension|salary|direct credit|better banking payment/i, category: "Income" },
];

export function categorizeTransaction(description: string, merchant: string, direction: Direction) {
  const haystack = `${merchant} ${description}`;
  const matched = rules.find((rule) => rule.pattern.test(haystack));
  const category = matched?.category ?? (direction === "credit" ? "Income" : "Other");
  return { category, wasteStatus: matched?.wasteStatus ?? "unreviewed" };
}
