import React from 'react';
import { AlertTriangle, ShieldCheck, LucideIcon, EyeClosed } from 'lucide-react';
import { DEFAULT_HIDDEN_AMOUNT } from '../../../../constants';
import { CycleStatus } from '../../../../types/roadmap';

interface LiquidityGapProps {
  label: string;
  isForecasting: boolean;
  currentLiquidity: number;
  currentLiquidityLabel: string;
  comparisonValue: number;
  comparisonLabel: string;
  marginValue: number;
  marginLabel: string;
  // Allows for the "faded" look in the Projected version
  isProjected?: boolean;
  cycleStatus: CycleStatus;
}

const LiquidityGapIndicator: React.FC<LiquidityGapProps> = (props) => {
  const {
    label,
    isForecasting,
    currentLiquidity,
    currentLiquidityLabel,
    comparisonValue,
    comparisonLabel,
    marginValue,
    marginLabel,
    isProjected = false,
    cycleStatus,
  } = props;
  const isFuture = cycleStatus === CycleStatus.FUTURE;
  const Icon: LucideIcon =
    isFuture && !isForecasting ? EyeClosed : isForecasting ? AlertTriangle : ShieldCheck;

  // Dynamic classes based on state and projection mode
  const statusColor = isFuture && !isForecasting ? 'yellow' : isForecasting ? 'rose' : 'emerald';
  const opacityClass = isFuture ? 'opacity-30' : isProjected ? 'opacity-60' : 'opacity-100';
  const borderOpacity = isProjected ? 'border-opacity-20' : 'border-opacity-100';

  const formatCurrency = (val: number) =>
    val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // 1. Define the status type
  const status: 'neutral' | 'rose' | 'emerald' =
    isFuture && !isForecasting ? 'neutral' : isForecasting ? 'rose' : 'emerald';

  // 2. Create a mapping object with FULL class names
  const statusStyles = {
    neutral: {
      text: 'text-neutral-500',
      textDeep: 'text-neutral-700/90 dark:text-neutral-400/80',
      textMono: 'text-neutral-700 dark:text-neutral-300',
      bg: 'bg-neutral-500',
      bgDeep: 'bg-neutral-500/[0.03] hover:bg-neutral-500/[0.06] dark:bg-neutral-400/[0.02]',
      border: 'border-neutral-500/15 dark:border-neutral-400/10',
      dot: 'bg-neutral-500',
      borderBottom: 'border-neutral-500/5',
      iconColor: 'text-neutral-500/60',
    },
    rose: {
      text: 'text-rose-500',
      textDeep: 'text-rose-700/90 dark:text-rose-400/80',
      textMono: 'text-rose-700 dark:text-rose-300',
      bg: 'bg-rose-500',
      bgDeep: 'bg-rose-500/[0.03] hover:bg-rose-500/[0.06] dark:bg-rose-400/[0.02]',
      border: 'border-rose-500/15 dark:border-rose-400/10',
      dot: 'bg-rose-500',
      borderBottom: 'border-rose-500/5',
      iconColor: 'text-rose-500/60',
    },
    emerald: {
      text: 'text-emerald-500',
      textDeep: 'text-emerald-700/90 dark:text-emerald-400/80',
      textMono: 'text-emerald-700 dark:text-emerald-300',
      bg: 'bg-emerald-500',
      bgDeep: 'bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06] dark:bg-emerald-400/[0.02]',
      border: 'border-emerald-500/15 dark:border-emerald-400/10',
      dot: 'bg-emerald-500',
      borderBottom: 'border-emerald-500/5',
      iconColor: 'text-emerald-500/60',
    },
  };

  const currentStyles = statusStyles[status];

  return (
    <div
      className={`group relative ${isProjected ? 'mb-2' : 'mb-1 mt-2'} ${isFuture && !isForecasting && 'cursor-not-allowed'}`}
    >
      {/* TOOLTIP */}
      <div className="pointer-events-none absolute -top-2 left-1/2 z-[1000] w-max -translate-x-1/2 -translate-y-full scale-95 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
        {(!isFuture || (isFuture && isForecasting)) && (
          <>
            <div className="rounded-2xl border border-black/5 bg-white/90 p-3 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#1C1C1E]/90">
              <div
                className={`mb-1.5 border-b border-black/5 pb-1 text-[8px] font-black uppercase tracking-widest dark:border-white/5 ${currentStyles.text}`}
              >
                {label} {isForecasting ? 'Gap' : 'Surplus'}
              </div>

              <div className="flex min-w-[150px] flex-col gap-1.5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[9px] text-slate-500">{currentLiquidityLabel}</span>
                  <span className="font-mono text-[9px] font-bold text-blue-700 dark:text-blue-500">
                    ₱{formatCurrency(currentLiquidity)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[9px] text-slate-500">{comparisonLabel}</span>
                  <span className="font-mono text-[9px] font-bold text-rose-500">
                    -₱{formatCurrency(comparisonValue)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-4 border-t border-black/5 pt-1 dark:border-white/5">
                  <span className="text-[9px] font-black uppercase text-slate-400">
                    {marginLabel}
                  </span>
                  <span
                    className={`font-mono text-[9px] font-black ${marginValue >= 0 ? 'text-emerald-600' : 'text-rose-700 dark:text-rose-600'}`}
                  >
                    ₱{formatCurrency(marginValue)}
                  </span>
                </div>
              </div>
            </div>
            <div className="mx-auto h-2 w-2 -translate-y-1 rotate-45 border-b border-r border-black/5 bg-white/90 dark:border-white/10 dark:bg-[#1C1C1E]/90" />
          </>
        )}
      </div>

      {/* PILL BAR */}
      <div
        className={`flex items-center justify-between overflow-hidden rounded-full border py-1.5 pl-2.5 pr-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all ${currentStyles.bgDeep} ${opacityClass} ${currentStyles.border}`}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex h-1.5 w-1.5 items-center justify-center">
            <div
              className={`h-1.5 w-1.5 rounded-full ${currentStyles.bg} shadow-[0_0_8px_rgba(245,158,11,0.5)]`}
            />
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-[0.06em] ${currentStyles.textDeep}`}
          >
            {(!isFuture || (isFuture && isForecasting)) &&
              `${label} ${isForecasting ? 'Gap' : 'Surplus'}`}
            {isFuture && !isForecasting && 'No Actual Liquidity Yet'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`font-mono text-[11px] font-black tracking-tight ${currentStyles.textMono}`}
          >
            {marginValue < 0 ? '-' : ''}₱
            {!isFuture || (isFuture && isForecasting)
              ? formatCurrency(Math.abs(marginValue))
              : DEFAULT_HIDDEN_AMOUNT}
          </span>
          <Icon size={10} strokeWidth={3} className={currentStyles.iconColor} />
        </div>
      </div>
    </div>
  );
};

export default LiquidityGapIndicator;
