import React, { useMemo } from 'react';
import { Activity, X, ArrowUpRight, Calculator, Target, Info } from 'lucide-react';
import {
  CycleStatus,
  CycleHeaders,
  GroupedRoadmapTransactions,
  RoadmapCycle,
} from '../../../types/roadmap';

interface AuditPanelProps {
  activeMonthSummary: string | null;
  isOpening: boolean;
  isClosing: boolean;
  handleClose: () => void;
  groupedCycleOptions: GroupedRoadmapTransactions;
  roadmap: RoadmapCycle[];
}

const AuditPanel: React.FC<AuditPanelProps> = ({
  activeMonthSummary,
  isOpening,
  isClosing,
  handleClose,
  groupedCycleOptions,
  roadmap,
}) => {
  const monthData = useMemo(() => {
    if (!activeMonthSummary || !groupedCycleOptions[activeMonthSummary]) return null;

    const cycleKeys = new Set(groupedCycleOptions[activeMonthSummary].map((c) => c.key));
    const cycles = roadmap.filter((r) => cycleKeys.has(r.key));
    const sortedCycles = [...cycles].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const firstCycle = sortedCycles[0];
    const lastCycle = sortedCycles[sortedCycles.length - 1];

    const totals = cycles.reduce(
      (acc, c) => ({
        projInflow: acc.projInflow + (c.headers.INFLOW || 0),
        actualInflow: acc.actualInflow + (c.headers.ACTUAL_INFLOW || 0),
        actualOutflow: acc.actualOutflow + (c.headers.CLEARED || 0),
        plannedOutflow: acc.plannedOutflow + (c.headers.PLANNED || 0),
        actualSurplus: acc.actualSurplus + (c.headers.SURPLUS || 0),
        projectedMargin: acc.projectedMargin + (c.headers.MARGIN || 0),
      }),
      {
        projInflow: 0,
        actualInflow: 0,
        actualOutflow: 0,
        plannedOutflow: 0,
        actualSurplus: 0,
        projectedMargin: 0,
      },
    );

    return {
      cycles: sortedCycles,
      totals,
      start: firstCycle?.headers.PREV_PROJECTED || 0,
      endActual: lastCycle?.headers.NET_ACTUAL || 0,
      endProjected: lastCycle?.headers.NET_PROJECTED || 0,
    };
  }, [activeMonthSummary, groupedCycleOptions, roadmap]);

  if (!activeMonthSummary || !monthData) return null;
  const isOpen = isOpening && !isClosing;

  return (
    <div
      className={`fixed inset-0 z-[10000] flex justify-end bg-black/20 backdrop-blur-sm transition-all duration-700 ease-in-out ${
        isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      onClick={handleClose}
    >
      <div
        className={`m-3 w-[460px] overflow-hidden rounded-[32px] border border-white/40 bg-[#F5F5F7]/95 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.25)] backdrop-blur-[40px] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] dark:border-white/10 dark:bg-[#121214]/95 ${
          isOpen ? 'translate-x-0 scale-100' : 'translate-x-[110%] scale-[0.96]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- HEADER --- */}
        <div className="flex items-center justify-between border-b border-black/[0.05] px-6 py-4 dark:border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-black">
              <Calculator size={14} />
            </div>
            <div>
              <h2 className="text-[12px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
                {activeMonthSummary}
              </h2>
              <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Ledger Intelligence Audit
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X size={16} />
          </button>
        </div>

        <div className="no-scrollbar h-[calc(100%-60px)] space-y-5 overflow-y-auto p-5">
          {/* --- THE GRAND EQUATION --- */}
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

          {/* --- PERFORMANCE DELTAS --- */}
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

          {/* --- PER-CYCLE MATH PROOF --- */}
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
                        className={`h-1.5 w-1.5 rounded-full ${cycle.headers.CYCLE_STATUS === CycleStatus.CURRENT ? 'animate-pulse bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
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
        </div>
      </div>
    </div>
  );
};

const ValueRow: React.FC<{ label: string; value: number; math: string; color?: string }> = ({
  label,
  value,
  math,
  color = 'text-slate-900 dark:text-white',
}) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="text-[7px] font-extrabold uppercase leading-none text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-mono text-[6px] font-bold uppercase leading-none text-slate-400 dark:text-slate-500">
        {math}
      </p>
    </div>
    <p className={`text-[11px] font-black tabular-nums ${color}`}>
      <span className="mr-0.5 font-light opacity-50">₱</span>
      {value.toLocaleString()}
    </p>
  </div>
);

const DeltaModule: React.FC<{
  title: string;
  actual: number;
  projected: number;
  formula: string;
  isExpense?: boolean;
}> = ({ title, actual, projected, formula, isExpense }) => {
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
          {isUnder ? 'UNDER' : 'OVER'} ₱{Math.abs(diff).toLocaleString()}
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
            <span className="mr-0.5 font-light opacity-40">₱</span>
            {actual.toLocaleString()}
          </p>
        </div>
        <div className="flex-1 border-l border-slate-200 pl-4 dark:border-white/10">
          <p className="mb-1 text-[6px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
            Target
          </p>
          <p className="mt-1 text-[10px] font-black tabular-nums text-slate-500 dark:text-slate-400">
            <span className="mr-0.5 font-light opacity-40">₱</span>
            {projected.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

const CycleMath: React.FC<{
  label: string;
  val1: number;
  val2: number;
  result: number;
  sign: string;
  color: string;
}> = ({ label, val1, val2, result, sign, color }) => (
  <div>
    <p className="mb-1.5 text-[7px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
      {label}
    </p>
    <div className="flex items-center gap-1 font-mono text-[9px] font-bold text-slate-600 dark:text-slate-400">
      <span>₱{(val1 / 1000).toFixed(1)}k</span>
      <span className="font-black text-slate-400 dark:text-slate-500">{sign}</span>
      <span>{(val2 / 1000).toFixed(1)}k</span>
    </div>
    <p
      className={`mt-0.5 text-[11px] font-black tabular-nums text-${color}-600 dark:text-${color}-500`}
    >
      <span className="mr-0.5 text-[9px] font-bold opacity-70">=</span>
      <span className="mr-0.5 text-[9px] font-light opacity-50">₱</span>
      {result.toLocaleString()}
    </p>
  </div>
);

export default AuditPanel;
