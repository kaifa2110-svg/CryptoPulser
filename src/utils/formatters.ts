import { BillingCycle, CurrencyCode, FxRates } from '../types/crypto';

export const CURRENCY_META: Record<
  CurrencyCode,
  { symbol: string; name: string; locale: string }
> = {
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  PKR: { symbol: 'Rs ', name: 'Pakistani Rupee', locale: 'en-PK' },
  EUR: { symbol: '€', name: 'Euro', locale: 'en-IE' },
  AED: { symbol: 'AED ', name: 'UAE Dirham', locale: 'en-AE' },
  INR: { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
};

export function convertUsd(amountUsd: number, currency: CurrencyCode, fxRates: FxRates): number {
  const rate = fxRates[currency] ?? 1;
  return amountUsd * rate;
}

export function formatPrice(
  amountUsd: number,
  currency: CurrencyCode,
  fxRates: FxRates
): string {
  const converted = convertUsd(amountUsd, currency, fxRates);
  const meta = CURRENCY_META[currency];

  if (!Number.isFinite(converted)) return `${meta.symbol}0.00`;

  let minFrac = 2;
  let maxFrac = 2;
  if (converted > 0 && converted < 0.0001) {
    minFrac = 6;
    maxFrac = 7;
  } else if (converted > 0 && converted < 0.01) {
    minFrac = 5;
    maxFrac = 6;
  } else if (converted > 0 && converted < 1) {
    minFrac = 4;
    maxFrac = 4;
  } else if (converted >= 1000) {
    minFrac = 2;
    maxFrac = 2;
  }

  const formatted = converted.toLocaleString('en-US', {
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  });

  return `${meta.symbol}${formatted}`;
}

export function formatCompactCurrency(
  amountUsd: number,
  currency: CurrencyCode,
  fxRates: FxRates
): string {
  const converted = convertUsd(amountUsd, currency, fxRates);
  const meta = CURRENCY_META[currency];
  if (!Number.isFinite(converted)) return `${meta.symbol}0`;

  const abs = Math.abs(converted);
  const sign = converted < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}${meta.symbol}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${meta.symbol}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${meta.symbol}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${meta.symbol}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${meta.symbol}${abs.toFixed(2)}`;
}

export function formatSupply(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'Unlimited';
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0.00%';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

export function formatPlanCurrencyAmount(
  usdAmount: number,
  currency: CurrencyCode,
  fxRates: FxRates
): string {
  const converted = convertUsd(usdAmount, currency, fxRates);
  const meta = CURRENCY_META[currency];
  if (!Number.isFinite(converted)) return `${meta.symbol}0.00`;
  if (currency === 'PKR' || currency === 'INR') {
    return `${meta.symbol}${Math.round(converted).toLocaleString('en-US')}`;
  }
  return `${meta.symbol}${converted.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getPlanUsdPricing(
  plan: 'pro' | 'pro_max',
  billingCycle: BillingCycle
): { effectiveMonthlyUsd: number; dueTodayUsd: number; annualTotalUsd: number } {
  const baseMonthly = plan === 'pro' ? 10 : 25;
  if (billingCycle === 'annual') {
    const effectiveMonthlyUsd = baseMonthly * 0.8; // 20% off
    const annualTotalUsd = effectiveMonthlyUsd * 12;
    return { effectiveMonthlyUsd, dueTodayUsd: annualTotalUsd, annualTotalUsd };
  }
  return {
    effectiveMonthlyUsd: baseMonthly,
    dueTodayUsd: baseMonthly,
    annualTotalUsd: baseMonthly * 12 * 0.8,
  };
}

export function formatProMonthlyPrice(currency: CurrencyCode, fxRates: FxRates): string {
  return `${formatPlanCurrencyAmount(10, currency, fxRates)}/mo`;
}

export function downloadCsvFile(filename: string, rows: string[][]): void {
  const escapeCell = (cell: string) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent = rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

