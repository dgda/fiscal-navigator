import React, { useMemo } from 'react';
import { Activity, X, ArrowUpRight, Calculator, Target, Info } from 'lucide-react';
import {
  CycleStatus,
  CycleHeaders,
  GroupedRoadmapTransactions,
  RoadmapCycle,
} from '../../../types/roadmap';
import CycleLedgerProofs from './CycleLedgerProofs/CycleLedgerProofs';
import PerformanceDeltas from './PerformanceDeltas/PerformanceDeltas';

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

          <PerformanceDeltas monthData={monthData} />

          <CycleLedgerProofs monthData={monthData} />
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

export default AuditPanel;
