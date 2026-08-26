/**
 * §23 — deterministic extraction from a pasted message.
 *
 * This is intentionally regex-based, not model-based: the scanner's answer must be
 * reproducible and explainable. A model may later *rephrase* the explanation, but it
 * can never introduce, remove or change a signal (§41).
 */
export interface ExtractedFields {
  phoneNumbers: string[];
  /** bKash/Nagad/Rocket personal wallet numbers offered as a payment destination. */
  mobileWalletNumbers: string[];
  bankAccountNumbers: string[];
  amounts: { value: number; currencyHint?: string }[];
  urls: string[];
  domains: string[];
  guaranteePhrases: string[];
  cashPhrases: string[];
  visaClassHints: string[];
  jobPublicIds: string[];
}

const PHONE = /(?:\+?880|0)1[3-9]\d{8}/g;
const WALLET_CONTEXT =
  /(bkash|বিকাশ|nagad|নগদ|rocket|রকেট|personal\s*number|পার্সোনাল)[^\d]{0,24}((?:\+?880|0)1[3-9]\d{8})/gi;
const BANK_ACCOUNT = /\b\d{11,20}\b/g;
const AMOUNT =
  /(?:৳|tk\.?|taka|টাকা|bdt|qar|sar|aed|sgd|myr|eur|gbp|usd)\s*([\d,]+(?:\.\d{1,3})?)|([\d,]{4,})\s*(?:৳|tk\.?|taka|টাকা|bdt)/gi;
const URL = /https?:\/\/[^\s<>"']+/gi;
const DOMAIN = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi;
const JOB_ID = /\bBD-[A-Z]{2}-\d{4}-\d{8}\b/gi;

const GUARANTEE_PATTERNS: RegExp[] = [
  /100\s*%\s*(visa|ভিসা|guarantee|গ্যারান্টি)/i,
  /guaranteed?\s+visa/i,
  /visa\s+guarantee/i,
  /ভিসা\s*(নিশ্চিত|গ্যারান্টি|১০০)/,
  /শতভাগ\s*ভিসা/,
  /no\s+visa\s+no\s+fee\s+guarantee/i,
];

const CASH_PATTERNS: RegExp[] = [
  /\bcash\s*(only|payment|hand)?\b/i,
  /hand\s*cash/i,
  /নগদ\s*(টাকা|পেমেন্ট)?/,
  /হাতে\s*টাকা/,
];

const VISA_CLASS_HINTS: { pattern: RegExp; value: string }[] = [
  { pattern: /visit\s*visa|ভিজিট\s*ভিসা|tourist\s*visa/i, value: 'visit' },
  { pattern: /work\s*visa|ওয়ার্ক\s*ভিসা|employment\s*visa/i, value: 'work' },
  { pattern: /student\s*visa|স্টুডেন্ট\s*ভিসা|study\s*visa/i, value: 'study' },
  { pattern: /free\s*visa|ফ্রি\s*ভিসা/i, value: 'free_visa' },
];

function matchAll(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)].map((m) => m[0]);
}

export function extractFields(text: string): ExtractedFields {
  const walletMatches = [...text.matchAll(WALLET_CONTEXT)].map((m) => m[2]!).filter(Boolean);
  const phones = matchAll(text, PHONE);

  const amounts: ExtractedFields['amounts'] = [];
  for (const match of text.matchAll(AMOUNT)) {
    const raw = match[1] ?? match[2];
    if (!raw) continue;
    const value = Number(raw.replace(/,/g, ''));
    if (Number.isFinite(value)) {
      amounts.push({
        value,
        currencyHint: match[0].replace(/[\d\s,.]/g, '').toUpperCase() || undefined,
      });
    }
  }

  return {
    phoneNumbers: [...new Set(phones)],
    mobileWalletNumbers: [...new Set(walletMatches)],
    bankAccountNumbers: [...new Set(matchAll(text, BANK_ACCOUNT))].filter(
      (n) => !phones.some((p) => p.includes(n)),
    ),
    amounts,
    urls: matchAll(text, URL),
    domains: [...new Set(matchAll(text, DOMAIN).map((d) => d.toLowerCase()))],
    guaranteePhrases: GUARANTEE_PATTERNS.flatMap((p) => (p.test(text) ? [p.source] : [])),
    cashPhrases: CASH_PATTERNS.flatMap((p) => (p.test(text) ? [p.source] : [])),
    visaClassHints: VISA_CLASS_HINTS.filter((h) => h.pattern.test(text)).map((h) => h.value),
    jobPublicIds: [...new Set(matchAll(text, JOB_ID).map((id) => id.toUpperCase()))],
  };
}

/** Loose name comparison: case, punctuation and legal-form noise are ignored. */
export function namesRoughlyMatch(a: string, b: string): boolean {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/\b(demo|ltd|limited|llc|wll|pte|gmbh|sdn|bhd|co|company|inc|est)\b/g, '')
      .replace(/[^a-z0-9ঀ-৿]/g, '');
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}
