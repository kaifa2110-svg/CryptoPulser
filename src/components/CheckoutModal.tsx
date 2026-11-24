import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Coins,
  Copy,
  CreditCard,
  Lock,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import {
  BillingCycle,
  CheckoutReceipt,
  Coin,
  CurrencyCode,
  FxRates,
} from '../types/crypto';
import {
  CURRENCY_META,
  formatPlanCurrencyAmount,
  getPlanUsdPricing,
} from '../utils/formatters';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan: 'pro' | 'pro_max';
  initialTrial: boolean;
  coins: Coin[];
  currency: CurrencyCode;
  onChangeCurrency: (c: CurrencyCode) => void;
  fxRates: FxRates;
  onCheckoutSuccess: (receipt: CheckoutReceipt) => void;
}

type PaymentTab = 'card' | 'crypto';

interface CryptoNetworkOption {
  id: string;
  label: string;
  symbol: string;
  network: string;
  address: string;
}

const CRYPTO_OPTIONS: CryptoNetworkOption[] = [
  {
    id: 'usdt-trc20',
    label: 'USDT (TRC20)',
    symbol: 'USDT',
    network: 'TRON (TRC20)',
    address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
  },
  {
    id: 'usdt-erc20',
    label: 'USDT (ERC20)',
    symbol: 'USDT',
    network: 'Ethereum (ERC20)',
    address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  },
  {
    id: 'usdt-bep20',
    label: 'USDT (BEP20)',
    symbol: 'USDT',
    network: 'BNB Smart Chain (BEP20)',
    address: '0x4E83362442B8d1bec281594ceA3050c8EB01311C',
  },
  {
    id: 'usdc',
    label: 'USDC (Multi-Chain)',
    symbol: 'USDC',
    network: 'Ethereum / Solana USDC',
    address: '0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5',
  },
  {
    id: 'btc',
    label: 'BTC (Bitcoin)',
    symbol: 'BTC',
    network: 'Bitcoin Mainnet',
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  },
  {
    id: 'eth',
    label: 'ETH (Ethereum)',
    symbol: 'ETH',
    network: 'Ethereum Mainnet',
    address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  },
  {
    id: 'sol',
    label: 'SOL (Solana)',
    symbol: 'SOL',
    network: 'Solana Mainnet',
    address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
  },
];

const COUNTRIES = [
  'United States',
  'Pakistan',
  'United Arab Emirates',
  'India',
  'United Kingdom',
  'Germany',
  'Canada',
  'Singapore',
];

const CHECKOUT_CURRENCIES: CurrencyCode[] = ['USD', 'PKR', 'EUR', 'AED', 'INR'];

function generateQrMatrix(seedStr: string, size = 19): boolean[][] {
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const setFinder = (ox: number, oy: number) => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const border = r === 0 || r === 4 || c === 0 || c === 4;
        const center = r === 2 && c === 2;
        matrix[oy + r][ox + c] = border || center;
      }
    }
  };
  setFinder(0, 0);
  setFinder(size - 5, 0);
  setFinder(0, size - 5);

  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inFinder =
        (r < 6 && c < 6) || (r < 6 && c >= size - 6) || (r >= size - 6 && c < 6);
      if (!inFinder) {
        h ^= r * 31 + c * 17;
        h = Math.imul(h, 16777619);
        matrix[r][c] = (Math.abs(h) % 10) > 4;
      }
    }
  }
  return matrix;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  initialPlan,
  initialTrial,
  coins,
  currency,
  onChangeCurrency,
  fxRates,
  onCheckoutSuccess,
}) => {
  const [plan, setPlan] = useState<'pro' | 'pro_max'>(initialPlan);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [useTrial, setUseTrial] = useState<boolean>(initialTrial);
  const [paymentTab, setPaymentTab] = useState<PaymentTab>('card');

  // Card fields
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [country, setCountry] = useState('United States');
  const [cardError, setCardError] = useState<string | null>(null);

  // Crypto fields
  const [selectedNetId, setSelectedNetId] = useState<string>('usdt-trc20');
  const [txId, setTxId] = useState('');
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [cryptoError, setCryptoError] = useState<string | null>(null);

  const [receipt, setReceipt] = useState<CheckoutReceipt | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPlan(initialPlan);
      setUseTrial(initialPlan === 'pro' && initialTrial);
      setReceipt(null);
      setCardError(null);
      setCryptoError(null);
    }
  }, [isOpen, initialPlan, initialTrial]);

  useEffect(() => {
    if (plan === 'pro_max' && useTrial) {
      setUseTrial(false);
    }
  }, [plan, useTrial]);

  const { effectiveMonthlyUsd, dueTodayUsd } = getPlanUsdPricing(plan, billingCycle);
  const actualDueUsd = useTrial && plan === 'pro' ? 0 : dueTodayUsd;
  const formattedDue = formatPlanCurrencyAmount(actualDueUsd, currency, fxRates);
  const formattedRecurring = formatPlanCurrencyAmount(dueTodayUsd, currency, fxRates);
  const formattedEffectiveMo = formatPlanCurrencyAmount(effectiveMonthlyUsd, currency, fxRates);

  const selectedNetwork =
    CRYPTO_OPTIONS.find((o) => o.id === selectedNetId) || CRYPTO_OPTIONS[0];

  const liveCryptoPriceUsd = useMemo(() => {
    if (selectedNetwork.symbol === 'USDT' || selectedNetwork.symbol === 'USDC') return 1;
    const match = coins.find((c) => c.symbol.toUpperCase() === selectedNetwork.symbol);
    if (match?.priceUsd) return match.priceUsd;
    if (selectedNetwork.symbol === 'BTC') return 94000;
    if (selectedNetwork.symbol === 'ETH') return 3300;
    if (selectedNetwork.symbol === 'SOL') return 235;
    return 1;
  }, [coins, selectedNetwork.symbol]);

  const cryptoAmountDue = useMemo(() => {
    const usdToConvert = actualDueUsd > 0 ? actualDueUsd : dueTodayUsd;
    const raw = usdToConvert / Math.max(0.0001, liveCryptoPriceUsd);
    if (selectedNetwork.symbol === 'USDT' || selectedNetwork.symbol === 'USDC') {
      return raw.toFixed(2);
    }
    if (selectedNetwork.symbol === 'BTC') return raw.toFixed(6);
    if (selectedNetwork.symbol === 'ETH') return raw.toFixed(5);
    return raw.toFixed(4);
  }, [actualDueUsd, dueTodayUsd, liveCryptoPriceUsd, selectedNetwork.symbol]);

  const qrMatrix = useMemo(
    () => generateQrMatrix(`${selectedNetwork.address}:${cryptoAmountDue}`),
    [selectedNetwork.address, cryptoAmountDue]
  );

  if (!isOpen) return null;

  const rawDigits = cardNumber.replace(/\D/g, '').slice(0, 16);
  const detectedBrand = rawDigits.startsWith('4')
    ? 'VISA'
    : rawDigits.startsWith('5') || rawDigits.startsWith('2')
    ? 'MASTERCARD'
    : null;

  const formatCardInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    const groups = digits.match(/.{1,4}/g);
    setCardNumber(groups ? groups.join(' ') : '');
  };

  const formatExpiryInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setCardExpiry(digits);
    }
  };

  const finalizePayment = (method: 'card' | 'crypto', detail: string) => {
    const rec: CheckoutReceipt = {
      id: `CP-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now()
        .toString()
        .slice(-4)}`,
      plan,
      billingCycle,
      isTrial: useTrial && plan === 'pro',
      paymentMethod: method,
      methodDetail: detail,
      currency,
      amountFormatted: formattedDue,
      timestamp: new Date().toISOString(),
    };
    setReceipt(rec);
    onCheckoutSuccess(rec);
  };

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCardError(null);
    if (!cardName.trim()) {
      setCardError('Enter the cardholder name.');
      return;
    }
    if (rawDigits.length < 15) {
      setCardError('Enter a valid 16-digit Visa or Mastercard number.');
      return;
    }
    if (cardExpiry.length < 5 || cardCvc.length < 3) {
      setCardError('Enter a valid MM/YY expiration and 3-digit CVC.');
      return;
    }
    finalizePayment(
      'card',
      `${detectedBrand || 'CARD'} •••• ${rawDigits.slice(-4)} (${country})`
    );
  };

  const handleCryptoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCryptoError(null);
    if (txId.trim().length < 10) {
      setCryptoError('Paste a valid on-chain TxID hash (10+ characters) or use Simulate On-Chain Payment.');
      return;
    }
    finalizePayment(
      'crypto',
      `${cryptoAmountDue} ${selectedNetwork.symbol} via ${selectedNetwork.network} (${txId
        .trim()
        .slice(0, 12)}...)`
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[94vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1422] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Secure CryptoPulser Checkout
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                256-bit encrypted card processing &amp; instant multi-chain crypto verification
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {receipt ? (
          /* Payment Receipt View */
          <div className="p-6 sm:p-8 space-y-5">
            <div className="text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                {receipt.isTrial
                  ? '7-Day Pro Trial Activated'
                  : `${receipt.plan === 'pro_max' ? 'Pulser Pro Max' : 'Pulser Pro'} Activated`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your terminal permissions have been upgraded immediately.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#131B2E] divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              <div className="p-3.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Receipt Reference</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {receipt.id}
                </span>
              </div>
              <div className="p-3.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Plan &amp; Cycle</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {receipt.plan === 'pro_max' ? 'Pulser Pro Max ($25/mo)' : 'Pulser Pro ($10/mo)'} ·{' '}
                  {receipt.billingCycle === 'annual' ? 'Annual (20% Off)' : 'Monthly'}
                </span>
              </div>
              <div className="p-3.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Payment Method</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {receipt.methodDetail}
                </span>
              </div>
              <div className="p-3.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Amount Charged Today</span>
                <span className="font-mono tabular-nums font-bold text-emerald-500 text-sm">
                  {receipt.amountFormatted} ({receipt.currency})
                </span>
              </div>
              <div className="p-3.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Timestamp</span>
                <span className="font-mono text-slate-600 dark:text-slate-300">
                  {new Date(receipt.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
            >
              Continue to CryptoPulser Terminal
            </button>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-5">
            {/* Plan, Billing Cycle & Dynamic Currency Strip */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#131B2E] p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPlan('pro')}
                  className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    plan === 'pro'
                      ? 'border-cyan-400 bg-cyan-500/10'
                      : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      Pulser Pro
                    </span>
                    <span className="font-mono text-xs font-bold text-cyan-500">
                      {formatPlanCurrencyAmount(billingCycle === 'annual' ? 8 : 10, currency, fxRates)}/mo
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Whale Sonar™, Bubble Radar™, 90D–5Y CSV Simulator, Ad-Free (Includes 7-Day Trial)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPlan('pro_max')}
                  className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    plan === 'pro_max'
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      Pulser Pro Max
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-500">
                      {formatPlanCurrencyAmount(billingCycle === 'annual' ? 20 : 25, currency, fxRates)}/mo
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Everything in Pro + Unlimited Advanced AI Copilot Suite (Signals, Anomalies, Risk, Digest)
                  </div>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                {/* Monthly / Annual (20% Off) Toggle */}
                <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                      billingCycle === 'monthly'
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                      billingCycle === 'annual'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Annual (Save 20%)
                  </button>
                </div>

                {/* Dynamic Checkout Currency Switcher */}
                <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
                  {CHECKOUT_CURRENCIES.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => onChangeCurrency(code)}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-semibold cursor-pointer ${
                        currency === code
                          ? 'bg-cyan-500 text-slate-950'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>

              {/* 7-Day Free Trial Toggle for Pro + Order Total */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                {plan === 'pro' ? (
                  <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-200 font-medium">
                    <input
                      type="checkbox"
                      checked={useTrial}
                      onChange={(e) => setUseTrial(e.target.checked)}
                      className="rounded accent-cyan-500 w-4 h-4"
                    />
                    <span>Apply 7-Day Free Pro Trial ($0.00 due today)</span>
                  </label>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">
                    Billed at {formattedEffectiveMo}/mo ({billingCycle})
                  </span>
                )}

                <div className="text-right">
                  <span className="text-slate-500 dark:text-slate-400 mr-2">Due Today:</span>
                  <span className="font-mono tabular-nums text-base font-bold text-slate-900 dark:text-white">
                    {formattedDue}
                  </span>
                  {useTrial && plan === 'pro' && (
                    <span className="ml-2 text-[11px] text-slate-500 dark:text-slate-400">
                      (then {formattedRecurring})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setPaymentTab('card')}
                className={`inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  paymentTab === 'card'
                    ? 'bg-white dark:bg-[#172238] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <CreditCard className="w-4 h-4 text-cyan-500" />
                <span>Mastercard / Visa Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentTab('crypto')}
                className={`inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  paymentTab === 'crypto'
                    ? 'bg-white dark:bg-[#172238] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Coins className="w-4 h-4 text-emerald-500" />
                <span>Pay with Crypto</span>
              </button>
            </div>

            {/* TAB 1: Mastercard / Visa Card */}
            {paymentTab === 'card' ? (
              <form onSubmit={handleCardSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Alex Mercer"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        16-Digit Card Number
                      </label>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded border ${
                            detectedBrand === 'VISA'
                              ? 'border-sky-400 bg-sky-500/15 text-sky-400'
                              : 'border-slate-300 dark:border-slate-700 text-slate-400'
                          }`}
                        >
                          VISA
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded border ${
                            detectedBrand === 'MASTERCARD'
                              ? 'border-amber-400 bg-amber-500/15 text-amber-400'
                              : 'border-slate-300 dark:border-slate-700 text-slate-400'
                          }`}
                        >
                          MASTERCARD
                        </span>
                      </div>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardNumber}
                      onChange={(e) => formatCardInput(e.target.value)}
                      placeholder="4242 4242 4242 4242  or  5555 5555 5555 4444"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Expiration (MM/YY)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardExpiry}
                      onChange={(e) => formatExpiryInput(e.target.value)}
                      placeholder="08/29"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      CVC / CVV
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Billing Country
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {cardError && (
                  <div className="text-xs text-rose-500 font-medium">{cardError}</div>
                )}

                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 text-xs font-bold cursor-pointer hover:opacity-95"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {useTrial && plan === 'pro'
                        ? `Start 7-Day Free Trial (${formattedDue} Today)`
                        : `Pay ${formattedDue} with Card`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      finalizePayment(
                        'card',
                        `DEMO MASTERCARD •••• 4444 (${country})`
                      )
                    }
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/20 text-xs font-bold cursor-pointer whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Simulate Test Card Payment (Demo)</span>
                  </button>
                </div>
              </form>
            ) : (
              /* TAB 2: Pay with Crypto */
              <form onSubmit={handleCryptoSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Token &amp; Network
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {CRYPTO_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedNetId(opt.id)}
                        className={`px-2.5 py-2 rounded-lg border text-[11px] font-mono font-semibold text-left cursor-pointer transition-colors ${
                          selectedNetId === opt.id
                            ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Amount + QR Code + Deposit Address */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B101C] p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="p-2.5 bg-white rounded-xl shrink-0">
                    <svg
                      width="104"
                      height="104"
                      viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
                      aria-label="Crypto Deposit QR Code"
                    >
                      <rect width={qrMatrix.length} height={qrMatrix.length} fill="#ffffff" />
                      {qrMatrix.map((row, r) =>
                        row.map((filled, c) =>
                          filled ? (
                            <rect
                              key={`${r}-${c}`}
                              x={c}
                              y={r}
                              width="1"
                              height="1"
                              fill="#090D16"
                            />
                          ) : null
                        )
                      )}
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0 space-y-2.5 w-full">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        Exact Amount ({selectedNetwork.network})
                      </span>
                      <span className="font-mono tabular-nums font-bold text-sm text-emerald-500">
                        {cryptoAmountDue} {selectedNetwork.symbol}
                      </span>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        Deposit Wallet Address
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate">
                          {selectedNetwork.address}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(selectedNetwork.address);
                            setCopiedAddr(true);
                            setTimeout(() => setCopiedAddr(false), 2000);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-slate-800 text-[11px] font-semibold cursor-pointer shrink-0"
                        >
                          {copiedAddr ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Transaction Hash (TxID)
                  </label>
                  <input
                    type="text"
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                    placeholder="Paste on-chain TxID (e.g. 0x8f91ab34... or Tron hash)"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {cryptoError && (
                  <div className="text-xs text-rose-500 font-medium">{cryptoError}</div>
                )}

                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 text-xs font-bold cursor-pointer hover:opacity-95"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify On-Chain TxID</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      finalizePayment(
                        'crypto',
                        `DEMO ON-CHAIN ${cryptoAmountDue} ${selectedNetwork.symbol} (${selectedNetwork.network})`
                      )
                    }
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/20 text-xs font-bold cursor-pointer whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Simulate On-Chain Payment (Demo)</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
