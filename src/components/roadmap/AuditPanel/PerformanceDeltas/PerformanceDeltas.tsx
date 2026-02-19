import React from 'react';
import { MonthData } from '../types';
import DeltaModule from './DeltaModule';

interface PerformanceDeltasProps {
  monthData: MonthData;
}

const PerformanceDeltas: React.FC<PerformanceDeltasProps> = (props) => {
  const { monthData } = props;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Burn Rate Efficiency
        </h3>
        <span className="font-mono text-[7px] font-bold text-slate-400 dark:text-slate-500">
          Variance = Proj - Actual
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <DeltaModule
          title="Inflow Performance"
          actual={monthData.totals.actualInflow}
          projected={monthData.totals.projInflow}
          formula="Projected Base Salary + Cycle Income"
        />
        <DeltaModule
          title="Expense Discipline"
          actual={monthData.totals.actualOutflow}
          projected={monthData.totals.plannedOutflow}
          formula="Σ Planned vs Σ Cleared Transactions"
          isExpense
        />
      </div>
    </div>
  );
};

export default PerformanceDeltas;
