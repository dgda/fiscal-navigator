import React from 'react';
import { MonthData } from '../types';
import CycleMath from './CycleMath';
import { CycleStatus } from '../../../../types/roadmap';

interface CycleLedgerProofsProps {
  monthData: MonthData;
}

const CycleLedgerProofs: React.FC<CycleLedgerProofsProps> = (props) => {
  const { monthData } = props;

  return (
    <div className="space-y-3">
      <h3 className="px-1 text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        Cycle Ledger Proofs
      </h3>
      <div className="space-y-2">
        {monthData.cycles.map((cycle) => (
          <div
            key={cycle.key}
            className="rounded-2xl border border-black/[0.04] bg-white/60 p-4 shadow-sm dark:border-white/5 dark:bg-white/[0.02]"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`h-1.5 w-1.5 rounded-full ${cycle.headers.CYCLE_STATUS === CycleStatus.CURRENT ? 'animate-pulse bg-blue-800' : 'bg-slate-300 dark:bg-slate-600'}`}
                />
                <span className="text-[11px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  {cycle.display}
                </span>
              </div>
              <span className="font-mono text-[8px] font-bold text-slate-500 dark:text-slate-400">
                {cycle.dateLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <CycleMath
                label="Actual Surplus"
                val1={cycle.headers.INFLOW}
                val2={cycle.headers.CLEARED}
                result={cycle.headers.SURPLUS}
                sign="−"
                color="emerald"
              />
              <CycleMath
                label="Projected Margin"
                val1={cycle.headers.INFLOW}
                val2={cycle.headers.PLANNED}
                result={cycle.headers.MARGIN}
                sign="−"
                color="blue"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CycleLedgerProofs;
