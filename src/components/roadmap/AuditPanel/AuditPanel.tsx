import React, { useMemo } from 'react';
import { GroupedRoadmapTransactions, RoadmapCycle } from '../../../types/roadmap';
import CycleLedgerProofs from './CycleLedgerProofs/CycleLedgerProofs';
import PerformanceDeltas from './PerformanceDeltas/PerformanceDeltas';
import GrandEquation from './GrandEquation/GrandEquation';
import AuditPanelHeader from './AuditPanelHeader';

interface AuditPanelProps {
  activeMonthSummary: string | null;
  isOpening: boolean;
  isClosing: boolean;
  handleClose: () => void;
  groupedCycleOptions: GroupedRoadmapTransactions;
  roadmap: RoadmapCycle[];
}

const AuditPanel: React.FC<AuditPanelProps> = (props) => {
  const { activeMonthSummary, isOpening, isClosing, handleClose, groupedCycleOptions, roadmap } =
    props;

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
        <AuditPanelHeader handleClose={handleClose} activeMonthSummary={activeMonthSummary} />

        <div className="no-scrollbar h-[calc(100%-60px)] space-y-5 overflow-y-auto p-5">
          <GrandEquation monthData={monthData} />

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
