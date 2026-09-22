type MerchantRule = { pattern: RegExp; merchant: string };

const merchantRules: MerchantRule[] = [
  { pattern: /\buber\s*\*?\s*eats\b/i, merchant: "Uber Eats" },
  { pattern: /\bdoordash\b/i, merchant: "DoorDash" },
  { pattern: /\bmenulog\b/i, merchant: "Menulog" },
  { pattern: /\bdeliveroo\b/i, merchant: "Deliveroo" },
  { pattern: /\b7[- ]eleven\b/i, merchant: "7-Eleven" },
  { pattern: /\bkfc\b/i, merchant: "KFC" },
  { pattern: /\bmcdonald(?:'s|s)?\b/i, merchant: "McDonald’s" },
  { pattern: /\bnetflix\b/i, merchant: "Netflix" },
  { pattern: /\bspotify\b/i, merchant: "Spotify" },
  { pattern: /\byoutube(?:\s+premium)?\b/i, merchant: "YouTube Premium" },
  { pattern: /\badobe\b|\bcreative cloud\b/i, merchant: "Adobe Creative Cloud" },
  { pattern: /\bfitlife\b|\banytime fitness\b|\bgoodlife\b/i, merchant: "Gym" },
  { pattern: /\btelstra\b/i, merchant: "Telstra" },
  { pattern: /\bapple\.com\/bill\b|\bicloud\b/i, merchant: "Apple" },
  { pattern: /\bclaude\.ai\b|\banthropic\b/i, merchant: "Claude" },
  { pattern: /\bplaystation\b|\bsony psn\b/i, merchant: "PlayStation" },
  { pattern: /\bgoogle\*?gsuite\b|\bgoogle workspace\b/i, merchant: "Google Workspace" },
  { pattern: /\bdomino(?:'s|s)?\b/i, merchant: "Domino’s" },
  { pattern: /\bguzman\b/i, merchant: "Guzman y Gomez" },
  { pattern: /\bwoolworths\b/i, merchant: "Woolworths" },
  { pattern: /\bcoles\b/i, merchant: "Coles" },
  { pattern: /\bafterpay\b/i, merchant: "Afterpay" },
  { pattern: /\bzipmoney\b/i, merchant: "ZipMoney" },
];

export function normalizeMerchant(description: string) {
  const matched = merchantRules.find((rule) => rule.pattern.test(description));
  if (matched) return matched.merchant;

  return (
    description
      .replace(/^Return\s+/i, "")
      .replace(/\b(Card\s+x+\d+|Value Date\s+\d{1,2}\/\d{1,2}\/\d{4})\b.*$/i, "")
      .replace(/\b(AUS|AUSTRALIA)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 5)
      .join(" ") || "Other purchase"
  );
}
