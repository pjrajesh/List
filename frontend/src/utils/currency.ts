export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'JPY' | 'CAD' | 'AUD';

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  label: string;
  locale: string;
  flag: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  INR: { code: 'INR', symbol: '₹', label: 'Indian Rupee', locale: 'en-IN', flag: '🇮🇳' },
  USD: { code: 'USD', symbol: '$', label: 'US Dollar', locale: 'en-US', flag: '🇺🇸' },
  EUR: { code: 'EUR', symbol: '€', label: 'Euro', locale: 'de-DE', flag: '🇪🇺' },
  GBP: { code: 'GBP', symbol: '£', label: 'British Pound', locale: 'en-GB', flag: '🇬🇧' },
  AED: { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham', locale: 'en-AE', flag: '🇦🇪' },
  JPY: { code: 'JPY', symbol: '¥', label: 'Japanese Yen', locale: 'ja-JP', flag: '🇯🇵' },
  CAD: { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar', locale: 'en-CA', flag: '🇨🇦' },
  AUD: { code: 'AUD', symbol: 'A$', label: 'Australian Dollar', locale: 'en-AU', flag: '🇦🇺' },
};

export function formatCurrency(amount: number, currency: CurrencyCode = 'INR'): string {
  const meta = CURRENCIES[currency] ?? CURRENCIES.INR;
  // Use Intl-friendly toLocaleString for thousands separators
  const formatted = Math.abs(amount) % 1 === 0
    ? Math.round(amount).toLocaleString(meta.locale)
    : amount.toLocaleString(meta.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Some symbols are post-fix (rare here) — INR/USD/etc. all prefix.
  return `${meta.symbol}${formatted}`;
}

export function getCurrencyDisplay(code: CurrencyCode): string {
  const c = CURRENCIES[code];
  return `${c.symbol} ${c.code}`;
}
