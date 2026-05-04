import { LucideProps } from 'lucide-react';
import React from 'react';
import { useTreasury } from '../../../../context/TreasuryContext';

export interface CycleMetricPillsProps {
  label: string;
  value: number;
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>
  >;
  colorClass: string;
  valueColorClass: string;
  tooltipContent?: React.ReactNode;
}

const CycleMetricPill: React.FC<CycleMetricPillsProps> = (props) => {
  const { label, value, icon: Icon, colorClass, valueColorClass, tooltipContent } = props;
  const { currencySymbol } = useTreasury();

  return (
    <div
      className={`group relative flex min-w-0 flex-1 flex-col justify-center rounded-xl border px-2 py-1.5 ${colorClass} transition-all duration-300`}
    >
      {tooltipContent && (
        <div className="pointer-events-none absolute -top-2 left-1/2 z-[10000] w-max -translate-x-1/2 -translate-y-full scale-95 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
          <div className="rounded-2xl border border-black/5 bg-white/90 p-2.5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#2C2C2E]/90">
            <div className="mb-1.5 border-b border-black/5 pb-1 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:border-white/5">
              {label} Breakdown
            </div>
            <div className="flex min-w-[120px] flex-col gap-1.5">{tooltipContent}</div>
          </div>
          <div className="mx-auto h-2 w-2 -translate-y-1 rotate-45 border-b border-r border-black/5 bg-white/90 dark:border-white/10 dark:bg-[#2C2C2E]/90" />
        </div>
      )}
      <div className="flex items-center gap-1 opacity-70">
        <Icon size={9} className="shrink-0" />
        <span className="truncate text-[6.5px] font-black uppercase tracking-tight">{label}</span>
      </div>
      <span
        className={`truncate font-mono text-[9.5px] font-black tabular-nums tracking-tighter ${valueColorClass}`}
      >
        <span className="mr-px font-sans text-[8px] opacity-50">{currencySymbol}</span>
        {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
};

export default React.memo(CycleMetricPill);
