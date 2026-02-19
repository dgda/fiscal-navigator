import React from 'react';
import { MonthData } from '../types';
import ValueRow from './ValueRow';
import { Target } from 'lucide-react';

interface GrandEquationProps {
  monthData: MonthData;
}

const GrandEquation: React.FC<GrandEquationProps> = (props) => {
  const { monthData } = props;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-black/[0.03] bg-white p-5 shadow-sm dark:border-white/5 dark:bg-white/[0.02]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={12} className="text-blue-600" />
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-800 dark:text-white">
            Liquidity Resolution
          </span>
        </div>
        <span className="font-mono text-[7px] font-bold uppercase text-slate-500 dark:text-slate-400">
          Method: Recursive Balance Summation
        </span>
      </div>

      <div className="relative grid grid-cols-2 gap-8">
        <div className="absolute bottom-0 left-1/2 top-0 w-[1px] -translate-x-1/2 bg-slate-100 dark:bg-white/10" />

        {/* Reality Track */}
        <div className="space-y-3">
          <p className="text-[8px] font-black uppercase tracking-tighter text-slate-500 dark:text-slate-400">
            Simulation (Actuals)
          </p>
          <ValueRow label="Start" value={monthData.start} math="Initial" />
          <ValueRow
            label="Δ Surplus"
            value={monthData.totals.actualSurplus}
            math="Σ(In-Out)"
            color="text-emerald-600 dark:text-emerald-500"
          />
          <div className="border-t border-slate-100 pt-2 dark:border-white/10">
            <p className="text-[7px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
              Reality Check
            </p>
            <p className="text-lg font-black tabular-nums text-slate-900 dark:text-white">
              ₱{monthData.endActual.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Forecast Track */}
        <div className="space-y-3">
          <p className="text-[8px] font-black uppercase tracking-tighter text-blue-600 dark:text-blue-500/80">
            Forecast (Projections)
          </p>
          <ValueRow label="Start" value={monthData.start} math="Initial" />
          <ValueRow
            label="Δ Margin"
            value={monthData.totals.projectedMargin}
            math="Σ(Proj-Est)"
            color="text-blue-600 dark:text-blue-400"
          />
          <div className="border-t border-slate-100 pt-2 dark:border-white/10">
            <p className="text-[7px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
              Projected Final
            </p>
            <p className="text-lg font-black tabular-nums text-blue-700 dark:text-blue-400">
              ₱{monthData.endProjected.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrandEquation;
