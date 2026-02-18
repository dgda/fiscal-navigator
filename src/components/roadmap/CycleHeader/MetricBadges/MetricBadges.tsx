import React from 'react';
import { CycleStatus } from '../../../../types/roadmap';

interface MetricBadgeProps {
  label: string;
  value: number;
  isProjected?: boolean;
  cycleStatus: CycleStatus;
}

const MetricBadge: React.FC<MetricBadgeProps> = (props) => {
  const { label, value, isProjected, cycleStatus } = props;
  const isNegative = value < 0;
  const isFuture = cycleStatus === CycleStatus.FUTURE;

  const dotColor = isNegative
    ? 'bg-rose-500'
    : isProjected
      ? 'bg-blue-500/80'
      : 'bg-emerald-500/80';

  const bgColor = isNegative ? 'bg-rose-500/10 dark:bg-rose-500/20' : 'bg-transparent';

  const textColor = isNegative
    ? 'text-rose-600 dark:text-rose-400'
    : 'text-slate-700 dark:text-zinc-200';

  const unitColor = isNegative ? 'text-rose-600/40' : 'text-slate-400/50 dark:text-zinc-600';

  return (
    <div
      className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 transition-colors duration-500 ${bgColor}`}
    >
      <div className={`h-1 w-1 rounded-full ${dotColor}`} />
      <span className="text-[7px] font-bold uppercase tracking-tight text-slate-400 dark:text-zinc-500">
        {label}
      </span>
      <span className={`text-[9px] font-bold tabular-nums ${textColor}`}>
        {!isFuture || (isFuture && isProjected)
          ? value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : 'X.XX'}
        <span className={`ml-0.5 text-[7px] font-medium ${unitColor}`}>cyc</span>
      </span>
    </div>
  );
};

interface MetricBadgesProps {
  liquidityRunway: number;
  projectedLiquidityRunway: number;
  className?: string;
  cycleStatus: CycleStatus;
}

const MetricBadges: React.FC<MetricBadgesProps> = (props) => {
  const { liquidityRunway, projectedLiquidityRunway, className = '', cycleStatus } = props;

  // Logic: Divider is visible only if neither metric is in a "warning" state
  const showDivider = liquidityRunway >= 0 && projectedLiquidityRunway >= 0;

  return (
    <div
      className={`flex items-center gap-1 rounded-full border border-black/[0.05] bg-white/50 p-0.5 py-[0.0625rem] pl-1 shadow-[0_1px_2px_rgba(0,0,0,0.02)] backdrop-blur-md transition-all dark:border-white/[0.06] dark:bg-zinc-900/30 ${className}`}
    >
      <MetricBadge label="Act" value={liquidityRunway} cycleStatus={cycleStatus} />

      <div
        className={`h-2 w-[0.5px] bg-black/5 transition-opacity duration-500 dark:bg-white/10 ${
          showDivider ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <MetricBadge
        label="Prj"
        value={projectedLiquidityRunway}
        isProjected
        cycleStatus={cycleStatus}
      />
    </div>
  );
};

export default MetricBadges;
