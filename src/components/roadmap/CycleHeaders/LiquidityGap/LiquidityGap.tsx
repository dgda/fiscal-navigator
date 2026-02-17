import React from 'react';
import { AlertTriangle, ShieldCheck, LucideIcon } from 'lucide-react';

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
}

const LiquidityGapIndicator: React.FC<LiquidityGapProps> = ({
  label,
  isForecasting,
  currentLiquidity,
  currentLiquidityLabel,
  comparisonValue,
  comparisonLabel,
  marginValue,
  marginLabel,
  isProjected = false,
}) => {
  const Icon: LucideIcon = isForecasting ? AlertTriangle : ShieldCheck;

  // Dynamic classes based on state and projection mode
  const statusColor = isForecasting ? 'rose' : 'emerald';
  const opacityClass = isProjected ? 'opacity-60' : 'opacity-100';
  const borderOpacity = isProjected ? 'border-opacity-20' : 'border-opacity-100';

  const formatCurrency = (val: number) =>
    val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className={`group relative ${isProjected ? 'mb-2' : 'mb-1 mt-2'}`}>
      {/* TOOLTIP */}
      <div className="pointer-events-none absolute -top-2 left-1/2 z-[1000] w-max -translate-x-1/2 -translate-y-full scale-95 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
        <div className="rounded-2xl border border-black/5 bg-white/90 p-3 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#1C1C1E]/90">
          <div
            className={`mb-1.5 border-b border-black/5 pb-1 text-[8px] font-black uppercase tracking-widest dark:border-white/5 text-${statusColor}-500`}
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
              <span className="text-[9px] font-black uppercase text-slate-400">{marginLabel}</span>
              <span
                className={`font-mono text-[9px] font-black ${marginValue >= 0 ? 'text-emerald-600' : 'text-rose-700 dark:text-rose-600'}`}
              >
                ₱{formatCurrency(marginValue)}
              </span>
            </div>
          </div>
        </div>
        <div className="mx-auto h-2 w-2 -translate-y-1 rotate-45 border-b border-r border-black/5 bg-white/90 dark:border-white/10 dark:bg-[#1C1C1E]/90" />
      </div>

      {/* PILL BAR */}
      <div
        className={`flex items-center justify-between overflow-hidden rounded-full border border-${statusColor}-500/15 bg-${statusColor}-500/[0.03] py-1.5 pl-2.5 pr-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:bg-${statusColor}-500/[0.06] dark:border-${statusColor}-400/10 dark:bg-${statusColor}-400/[0.02] ${opacityClass}`}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex h-1.5 w-1.5 items-center justify-center">
            <div
              className={`h-1.5 w-1.5 rounded-full bg-${statusColor}-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]`}
            />
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-[0.06em] text-${statusColor}-700/90 dark:text-${statusColor}-400/80`}
          >
            {label} {isForecasting ? 'Gap' : 'Surplus'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`font-mono text-[11px] font-black tracking-tight text-${statusColor}-700 dark:text-${statusColor}-300`}
          >
            {marginValue < 0 ? '-' : ''}₱{formatCurrency(Math.abs(marginValue))}
          </span>
          <Icon size={10} strokeWidth={3} className={`text-${statusColor}-500/60`} />
        </div>
      </div>
    </div>
  );
};

export default LiquidityGapIndicator;
