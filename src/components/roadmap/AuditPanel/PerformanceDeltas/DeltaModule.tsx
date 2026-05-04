import React from 'react';
import { useTreasury } from '../../../../context/TreasuryContext';

interface DeltaModuleProps {
  title: string;
  actual: number;
  projected: number;
  formula: string;
  isExpense?: boolean;
}

const DeltaModule: React.FC<DeltaModuleProps> = (props) => {
  const { title, actual, projected, formula, isExpense } = props;
  const { currencySymbol } = useTreasury();
  const diff = projected - actual;
  const isUnder = diff > 0;

  return (
    <div className="rounded-2xl border border-black/[0.03] bg-white/40 p-4 dark:border-white/5 dark:bg-white/[0.01]">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
            {title}
          </p>
          <p className="mt-0.5 font-mono text-[6px] font-bold text-slate-500 dark:text-slate-400">
            {formula}
          </p>
        </div>
        <div
          className={`rounded-md px-1.5 py-0.5 text-[8px] font-black ${isUnder ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-500' : 'bg-rose-500/10 text-rose-700 dark:text-rose-500'}`}
        >
          {isUnder ? 'UNDER' : 'OVER'} {currencySymbol}
          {Math.abs(diff).toLocaleString()}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="flex-1">
          <p className="mb-1 text-[6px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
            Reality
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/50 dark:bg-white/5">
            <div
              className={`h-full ${isExpense ? 'bg-rose-500 dark:bg-rose-600' : 'bg-emerald-500 dark:bg-emerald-600'}`}
              style={{ width: `${Math.min((actual / (projected || 1)) * 100, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] font-black tabular-nums text-slate-900 dark:text-white">
            <span className="mr-0.5 font-light opacity-40">{currencySymbol}</span>
            {actual.toLocaleString()}
          </p>
        </div>
        <div className="flex-1 border-l border-slate-200 pl-4 dark:border-white/10">
          <p className="mb-1 text-[6px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
            Target
          </p>
          <p className="mt-1 text-[10px] font-black tabular-nums text-slate-500 dark:text-slate-400">
            <span className="mr-0.5 font-light opacity-40">{currencySymbol}</span>
            {projected.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeltaModule;
