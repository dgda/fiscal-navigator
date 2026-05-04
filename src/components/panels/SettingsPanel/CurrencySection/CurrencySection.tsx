import React, { useMemo } from 'react';
import { useTreasury } from '../../../../context/TreasuryContext';
import { Coins } from 'lucide-react';
import currencyCodes from 'currency-codes';
import getSymbolFromCurrency from 'currency-symbol-map';

interface CurrencySectionProps {
  sectionClass: string;
  headerClass: string;
}

const PINNED_CODE = 'PHP';

const CurrencySection: React.FC<CurrencySectionProps> = (props) => {
  const { sectionClass, headerClass } = props;
  const { data, updatePreferences, currencyCode, currencySymbol } = useTreasury();

  // Build the dropdown options once: PHP first, then alphabetical by code.
  const options = useMemo(() => {
    const all = currencyCodes.codes() as string[];
    const sorted = all
      .filter((c) => c !== PINNED_CODE)
      .map((code) => ({
        code,
        symbol: getSymbolFromCurrency(code) || code,
        name: currencyCodes.code(code)?.currency || code,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
    const pinned = {
      code: PINNED_CODE,
      symbol: getSymbolFromCurrency(PINNED_CODE) || '₱',
      name: currencyCodes.code(PINNED_CODE)?.currency || 'Philippine Peso',
    };
    return [pinned, ...sorted];
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (next === data.preferences.currency) return;
    void updatePreferences({ currency: next });
  };

  const labelClass =
    'mb-2 block text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500';
  const inputClass =
    'w-full rounded-xl border border-black/5 bg-white px-4 py-2.5 text-[11px] font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/10 dark:border-white/5 dark:bg-[#2C2C2E] dark:text-white';

  return (
    <section className={sectionClass}>
      <header className={headerClass}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 shadow-sm">
            <Coins size={18} />
          </div>
          <div>
            <h2 className="text-[13px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Currency
            </h2>
            <p className="text-[10px] font-bold text-slate-400">
              Display Symbol Across The Application
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 p-8 md:grid-cols-3">
        <div>
          <label className={labelClass}>Currency</label>
          <select value={currencyCode} onChange={handleChange} className={inputClass}>
            {options.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.code} — {opt.symbol} {opt.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Preview</label>
          <div className="flex items-center gap-2 rounded-xl border border-black/5 bg-white px-4 py-2.5 text-[12px] font-bold text-slate-700 dark:border-white/5 dark:bg-[#2C2C2E] dark:text-slate-200">
            <span className="text-slate-400 dark:text-slate-500">Sample:</span>
            <span className="font-mono">
              {currencySymbol}
              {(12345.67).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CurrencySection;
