import React from 'react';
import { ShieldCheck, BarChart3, LucideIcon } from 'lucide-react';
import { DEFAULT_HIDDEN_AMOUNT } from '../../../../constants';

interface BalanceCardProps {
  label: string;
  value: number;
  prevValue: number;
  flowValue: number;
  prevLabel: string;
  flowLabel: string;
  variant: 'blue' | 'teal';
  isCurrentCycle?: boolean;
}

const BalanceCard: React.FC<BalanceCardProps> = (props) => {
  const {
    label,
    value,
    prevValue,
    flowValue,
    prevLabel,
    flowLabel,
    variant,
    isCurrentCycle = true,
  } = props;
  const isBlue = variant === 'blue';
  const Icon: LucideIcon = isBlue ? ShieldCheck : BarChart3;

  // Dynamic color mapping
  const styles = {
    bgBlue: `border-blue-100 bg-blue-50/50 hover:bg-blue-50/80 dark:border-blue-500/10 dark:bg-blue-500/5 dark:hover:bg-blue-500/10 text-blue-600/70 dark:text-blue-400/70 balance-text-blue-700 dark:balance-text-blue-300`,
    textBlue: `text-blue-500`,
    bgTeal: `border-teal-100 bg-teal-50/50 hover:bg-teal-50/80 dark:border-teal-500/10 dark:bg-teal-500/5 dark:hover:bg-teal-500/10 text-teal-600/70 dark:text-teal-400/70 balance-text-teal-700 dark:balance-text-teal-300`,
    textTeal: `text-teal-500`,
  };

  const format = (val: number) =>
    val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div
      className={`hover:z-100 group relative flex flex-col justify-center rounded-[18px] border px-3.5 py-3 shadow-sm transition-all ${isBlue ? styles.bgBlue : styles.bgTeal} ${!isCurrentCycle && isBlue && 'cursor-not-allowed'}`}
    >
      {/* TOOLTIP: MATH BREAKDOWN */}

      <div className="pointer-events-none absolute -top-1 left-1/2 z-[1000] w-max -translate-x-1/2 -translate-y-full scale-95 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
        {isCurrentCycle && (
          <>
            <div className="rounded-2xl border border-black/5 bg-white p-3 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#1C1C1E]">
              <div
                className={`mb-1.5 border-b border-black/5 pb-1 text-[8px] font-black uppercase tracking-widest dark:border-white/5 ${isBlue ? styles.textBlue : styles.textTeal}`}
              >
                {label} Math
              </div>
              <div className="flex min-w-[140px] flex-col gap-1.5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[9px] text-slate-500">{prevLabel}</span>
                  <span className="font-mono text-[9px] font-bold text-slate-900 dark:text-white">
                    ₱{format(prevValue)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[9px] text-slate-500">{flowLabel}</span>
                  <span
                    className={`font-mono text-[9px] font-bold ${flowValue >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {flowValue >= 0 ? '+' : ''}₱{format(flowValue)}
                  </span>
                </div>
              </div>
            </div>
            <div className="mx-auto h-2 w-2 -translate-y-1 rotate-45 border-b border-r border-black/5 bg-white/90 dark:border-white/10 dark:bg-[#1C1C1E]/90" />
          </>
        )}
      </div>

      {/* CARD CONTENT */}
      <span className="mb-0.5 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest opacity-80">
        <Icon size={10} strokeWidth={2.5} /> {label}
      </span>
      <span
        className={`font-mono text-[16px] font-black tracking-tight ${value < 0 ? 'text-red-500' : isBlue ? 'text-blue-700 dark:text-blue-300' : 'text-teal-700 dark:text-teal-300'}`}
      >
        <span className="mr-0.5 font-sans text-[12px] font-medium opacity-40">₱</span>
        {isCurrentCycle ? format(value) : DEFAULT_HIDDEN_AMOUNT}
      </span>
    </div>
  );
};

export default BalanceCard;
