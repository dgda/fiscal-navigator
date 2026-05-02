import React, { useMemo } from 'react';
import { X, TrendingUp, Briefcase, BarChart4, Layers, Receipt } from 'lucide-react';
import { useTreasury } from '../../../context/TreasuryContext';
import { RoadmapCycle } from '../../../types/roadmap';
import { parse, subMonths, parseISO, isSameMonth, format } from 'date-fns';

interface AuditPanelProps {
  activeMonthSummary: string | null; // e.g., "March 2026"
  isOpening: boolean;
  isClosing: boolean;
  handleClose: () => void;
  roadmap: RoadmapCycle[];
}

/**
 * --- PURE DATA ENGINE ---
 * Hoisted to prevent React Compiler closure traps.
 * Computes Month-over-Month (MoM) variance and Period-over-Period (PoP) breakdown.
 */
const generateExecutiveReport = (
  activeMonthLabel: string,
  roadmap: RoadmapCycle[],
  checkIsIncome: (id: string) => boolean,
) => {
  // 1. Establish Temporal Bounds
  const targetDate = parse(activeMonthLabel, 'MMMM yyyy', new Date());
  const prevDate = subMonths(targetDate, 1);

  const report = {
    curr: { inc: 0, exp: 0 },
    prev: { inc: 0, exp: 0 },
    periods: [] as { label: string; date: Date; inc: 0; exp: 0 }[],
  };

  // 2. Classify Cycles by Month
  const currCycles: RoadmapCycle[] = [];
  const prevCycles: RoadmapCycle[] = [];

  roadmap.forEach((cycle) => {
    if (!cycle.txs.length) return;
    const cycleDate = parseISO(cycle.txs[0].date);

    if (isSameMonth(cycleDate, targetDate)) currCycles.push(cycle);
    else if (isSameMonth(cycleDate, prevDate)) prevCycles.push(cycle);
  });

  // 3. Process Previous Month Baseline
  prevCycles.forEach((cycle) => {
    cycle.txs.forEach((tx) => {
      const val = Math.abs(tx.amount);
      if (checkIsIncome(tx.typeId)) {
        report.prev.inc += val;
      } else {
        report.prev.exp += val;
      }
    });
  });

  // 4. Process Current Month & Chronological Periods
  // Sort ascending so Period 1 comes before Period 2
  const sortedCurrCycles = [...currCycles].sort(
    (a, b) => parseISO(a.txs[0].date).getTime() - parseISO(b.txs[0].date).getTime(),
  );

  sortedCurrCycles.forEach((cycle, index) => {
    const cycleDate = parseISO(cycle.txs[0].date);
    const period = {
      label: `Period ${index + 1}`,
      date: cycleDate,
      inc: 0,
      exp: 0,
    };

    cycle.txs.forEach((tx) => {
      const val = Math.abs(tx.amount);
      if (checkIsIncome(tx.typeId)) {
        report.curr.inc += val;
        period.inc += val;
      } else {
        report.curr.exp += val;
        period.exp += val;
      }
    });

    // @ts-expect-error number somehow not comparable to 0
    report.periods.push(period);
  });

  // 5. Variance Math
  const calcVariance = (curr: number, prev: number) => {
    if (prev === 0) return { pct: 0, abs: curr, isUp: curr > 0 };
    const diff = curr - prev;
    return { pct: (diff / prev) * 100, abs: Math.abs(diff), isUp: diff > 0 };
  };

  return {
    totals: {
      income: report.curr.inc,
      expense: report.curr.exp,
      netMargin: report.curr.inc - report.curr.exp,
      marginPct:
        report.curr.inc > 0 ? ((report.curr.inc - report.curr.exp) / report.curr.inc) * 100 : 0,
    },
    variance: {
      income: calcVariance(report.curr.inc, report.prev.inc),
      expense: calcVariance(report.curr.exp, report.prev.exp),
    },
    periods: report.periods,
  };
};

const AuditPanel: React.FC<AuditPanelProps> = ({
  activeMonthSummary,
  isOpening,
  isClosing,
  handleClose,
  roadmap,
}) => {
  const { checkIsIncome } = useTreasury();

  // Memoize the report generation to run only when the active month changes
  const report = useMemo(() => {
    if (!activeMonthSummary) return null;
    return generateExecutiveReport(activeMonthSummary, roadmap, checkIsIncome);
  }, [activeMonthSummary, roadmap, checkIsIncome]);

  if (!activeMonthSummary || !report) return null;

  return (
    <div
      className={`fixed inset-y-0 right-0 z-[100] w-full max-w-md border-l border-black/5 bg-[#F5F5F7] shadow-2xl transition-transform duration-500 ease-in-out dark:border-white/10 dark:bg-[#1E1E1F] ${
        isOpening && !isClosing ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-black/5 bg-white px-6 py-5 dark:border-white/5 dark:bg-[#2C2C2E]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md dark:bg-white dark:text-black">
            <BarChart4 size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">
              {activeMonthSummary}
            </h2>
            <p className="text-[10px] font-bold tracking-widest text-slate-400">
              EXECUTIVE SUMMARY
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
        >
          <X size={16} />
        </button>
      </div>

      <div className="no-scrollbar h-full space-y-6 overflow-y-auto p-6 pb-32">
        {/* SECTION 1: MONTHLY KPI BOARD */}
        <section className="grid grid-cols-2 gap-4">
          <KpiCard title="Gross Inflow" value={report.totals.income} color="emerald" />
          <KpiCard title="Operating Outflow" value={report.totals.expense} color="rose" />
          <div className="col-span-2 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 dark:border-blue-400/10 dark:bg-blue-400/5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  Net Position
                </p>
                <p className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  PHP{' '}
                  {report.totals.netMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Retained Margin
                </p>
                <p className="text-lg font-black text-blue-600 dark:text-blue-400">
                  {report.totals.marginPct.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: EXPENSE VARIANCE ANALYSIS (The Hero Metric) */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-slate-400" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Variance Analysis (MoM)
            </h3>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#2C2C2E]">
            <p className="text-[11px] font-bold text-slate-400">Expense Growth</p>
            <div className="mt-2 flex items-baseline gap-3">
              <span
                className={`text-3xl font-black tracking-tighter ${report.variance.expense.isUp ? 'text-rose-500' : 'text-emerald-500'}`}
              >
                {report.variance.expense.isUp ? '+' : '-'}
                {Math.abs(report.variance.expense.pct).toFixed(1)}%
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                vs prev month
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Absolute Difference
              </span>
              <span
                className={`font-mono text-sm font-bold ${report.variance.expense.isUp ? 'text-rose-500' : 'text-emerald-500'}`}
              >
                {report.variance.expense.isUp ? '▲' : '▼'} PHP{' '}
                {report.variance.expense.abs.toLocaleString()}
              </span>
            </div>
          </div>
        </section>

        {/* SECTION 3: PERIOD RECONCILIATION */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Layers size={14} className="text-slate-400" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Ledger Periods
            </h3>
          </div>

          <div className="space-y-3">
            {report.periods.length === 0 ? (
              <div className="rounded-xl border border-dashed border-black/10 p-6 text-center dark:border-white/10">
                <p className="text-xs font-bold text-slate-400">
                  No active cycles recorded for this month.
                </p>
              </div>
            ) : (
              report.periods.map((period, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-3 rounded-xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#2C2C2E]"
                >
                  <div className="flex items-center justify-between border-b border-black/5 pb-2 dark:border-white/5">
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                      {period.label}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">
                      {format(period.date, 'MMM dd, yyyy')}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        Inflow
                      </p>
                      <p className="font-mono text-sm font-bold text-emerald-500">
                        PHP {period.inc.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        Outflow
                      </p>
                      <p className="font-mono text-sm font-bold text-rose-500">
                        PHP {period.exp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const KpiCard = ({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: 'emerald' | 'rose';
}) => {
  const isEmerald = color === 'emerald';
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#2C2C2E]">
      <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 dark:bg-white/5">
        {isEmerald ? (
          <Briefcase size={12} className="text-emerald-500" />
        ) : (
          <Receipt size={12} className="text-rose-500" />
        )}
      </div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
      <p
        className={`mt-1 text-lg font-black tracking-tight ${isEmerald ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
      >
        PHP {value.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 })}
      </p>
    </div>
  );
};

export default AuditPanel;
