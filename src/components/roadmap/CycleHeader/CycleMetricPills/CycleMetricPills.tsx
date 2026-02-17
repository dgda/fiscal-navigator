import React from 'react';
import { CycleMetricPill } from './CycleMetricPill';
import { ArrowUpRight, ArrowDownRight, Wallet, Target, PieChart } from 'lucide-react';
import { CycleHeaders } from '../../../../types/roadmap';

export interface CycleMetricPillsProps {
  cycleHeaders: CycleHeaders;
}

export const CycleMetricPills: React.FC<CycleMetricPillsProps> = (props) => {
  const { cycleHeaders } = props;
  const { INFLOW, PLANNED, CLEARED, MARGIN, SURPLUS } = cycleHeaders;
  return (
    <div className="no-scrollbar flex items-center gap-1.5 overflow-visible pb-1">
      <CycleMetricPill
        label="Inflow"
        value={INFLOW}
        icon={ArrowUpRight}
        colorClass="bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        valueColorClass="text-emerald-700 dark:text-emerald-400"
        tooltipContent={
          <span className="text-[8.5px] font-medium leading-relaxed text-slate-500">
            Total projected salary and cash windfalls for this cycle.
          </span>
        }
      />
      <CycleMetricPill
        label="Cleared"
        value={CLEARED}
        icon={ArrowDownRight}
        colorClass="bg-rose-50/50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-500/10 text-rose-700 dark:text-rose-400"
        valueColorClass="text-rose-700 dark:text-rose-400"
        tooltipContent={
          <span className="text-[8.5px] font-medium leading-relaxed text-slate-500">
            Total volume of transactions marked as Paid or Executed.
          </span>
        }
      />
      <CycleMetricPill
        label="Surplus"
        value={SURPLUS}
        icon={Wallet}
        colorClass="bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-500/10 text-blue-700 dark:text-blue-400"
        valueColorClass="text-blue-700 dark:text-blue-400"
        tooltipContent={
          <div className="flex min-w-[110px] flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[9px] text-slate-500">Paid In</span>
              <span className="font-mono text-[9px] font-bold text-emerald-600">
                ₱{INFLOW.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[9px] text-slate-500">Paid Out</span>
              <span className="font-mono text-[9px] font-bold text-rose-600">
                ₱{CLEARED.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        }
      />
      <CycleMetricPill
        label="Planned"
        value={PLANNED}
        icon={Target}
        colorClass="bg-slate-50 border-slate-100 dark:bg-white/5 dark:border-white/5 text-slate-500"
        valueColorClass="text-slate-600 dark:text-slate-400"
        tooltipContent={
          <span className="text-[8.5px] font-medium leading-relaxed text-slate-500">
            Cumulative target of all operating and accrued expenses.
          </span>
        }
      />
      <CycleMetricPill
        label="Projected"
        value={MARGIN}
        icon={PieChart}
        colorClass="bg-slate-50 border-slate-100 dark:bg-white/5 dark:border-white/5 text-slate-500"
        valueColorClass="text-slate-600 dark:text-slate-400"
        tooltipContent={
          <div className="flex min-w-[110px] flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[9px] text-slate-500">Target In</span>
              <span className="font-mono text-[9px] font-bold text-emerald-600">
                ₱{INFLOW.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[9px] text-slate-500">Target Out</span>
              <span className="font-mono text-[9px] font-bold text-rose-600">
                ₱{PLANNED.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        }
      />
    </div>
  );
};
