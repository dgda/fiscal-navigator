import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTreasury } from '../../context/TreasuryContext';
import { UseRoadmapProps, useRoadmap } from '../../hooks/useRoadmap';
import { CalendarDays, Activity, X, Compass, BarChart3, AlertTriangle } from 'lucide-react';
import { format, isBefore, parseISO, startOfDay, subDays } from 'date-fns';
import { Transaction } from '../../types';
import { CycleHeaders, CycleStatus } from '../../types/roadmap';
import { CycleHeader } from './CycleHeader/CycleHeader';
import TransactionList from './TransactionList/TransactionList';

interface RoadmapSpreadsheetProps {
  filter: UseRoadmapProps;
  onEdit: (id: string) => void;
  highlightId: string | null;
  onHighlightComplete: () => void;
}

export const RoadmapSpreadsheet: React.FC<RoadmapSpreadsheetProps> = ({
  filter,
  onEdit,
  highlightId,
  onHighlightComplete,
}) => {
  const { sync, deleteSeries, data } = useTreasury();
  const { roadmap, groupedCycleOptions } = useRoadmap(filter);
  const [activeMonthSummary, setActiveMonthSummary] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Transaction | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cycleScrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const monthRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (activeMonthSummary) {
      const timer = requestAnimationFrame(() => setIsOpening(true));
      return () => cancelAnimationFrame(timer);
    } else {
      setIsOpening(false);
    }
  }, [activeMonthSummary]);

  const handleClose = () => {
    setIsOpening(false);
    setIsClosing(true);
    setTimeout(() => {
      setActiveMonthSummary(null);
      setIsClosing(false);
    }, 500);
  };

  const executeDelete = (mode: 'one' | 'series') => {
    if (!deleteCandidate) return;
    if (mode === 'one') {
      sync({
        ...data,
        transactions: data.transactions.filter((t: Transaction) => t.id !== deleteCandidate.id),
      });
    } else if (deleteCandidate.recurringGroupId) {
      deleteSeries(deleteCandidate.recurringGroupId);
    }
    setDeleteCandidate(null);
  };

  const getCycleStatus = (date: string, nextCycleDate: string | undefined): CycleStatus => {
    // Use startOfDay for absolute calendar date comparison
    const today = startOfDay(new Date());
    const cycleStart = startOfDay(parseISO(date));

    // 1. FUTURE: If today hasn't even reached the start of this cycle yet
    if (isBefore(today, cycleStart)) {
      return CycleStatus.FUTURE;
    }

    // 2. PAST: A cycle is past if today has reached or passed the NEXT cycle's start
    if (nextCycleDate) {
      const nextStart = startOfDay(parseISO(nextCycleDate));
      // If today is NOT before the next start, it means today is >= nextStart
      if (!isBefore(today, nextStart)) {
        return CycleStatus.PAST;
      }
    }

    // 3. CURRENT: Today is >= cycleStart AND (no next cycle OR today < nextStart)
    return CycleStatus.CURRENT;
  };

  useEffect(() => {
    const currentMonthLabel = format(new Date(), 'MMMM yyyy');
    if (monthRefs.current[currentMonthLabel]) {
      setTimeout(
        () =>
          monthRefs.current[currentMonthLabel]?.scrollIntoView({
            behavior: 'smooth',
            inline: 'start',
            block: 'nearest',
          }),
        800,
      );
    }
  }, [groupedCycleOptions]);

  useEffect(() => {
    if (highlightId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`tx-row-${highlightId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      const clearTimer = setTimeout(() => onHighlightComplete(), 4000);
      return () => {
        clearTimeout(timer);
        clearTimeout(clearTimer);
      };
    }
  }, [highlightId, onHighlightComplete]);

  const timelineData = useMemo(() => {
    const years: Record<string, string[]> = {};
    Object.keys(groupedCycleOptions).forEach((l) => {
      const y = l.split(' ')[1];
      if (!years[y]) years[y] = [];
      years[y].push(l);
    });
    return years;
  }, [groupedCycleOptions]);

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#F5F5F7] dark:bg-[#000000]">
      {/* HORIZONTAL SCROLL CONTAINER: Set to h-full to capture viewport height */}
      <div
        ref={scrollContainerRef}
        className="no-scrollbar flex h-full flex-1 overflow-x-auto scroll-smooth"
      >
        {Object.entries(groupedCycleOptions).map(([monthLabel, cycleMeta]) => (
          <div
            key={monthLabel}
            ref={(el) => {
              monthRefs.current[monthLabel] = el;
            }}
            className="flex h-full flex-col border-r border-black/[0.04] dark:border-white/5"
          >
            {/* PINNED MONTH HEADER: shrink-0 prevents it from scrolling away */}
            <div className="sticky top-0 z-[40] flex shrink-0 items-center justify-between border-b border-black/[0.04] bg-[#F5F5F7]/80 px-5 py-3 backdrop-blur-xl dark:border-white/5 dark:bg-[#141416]/80">
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-slate-300">
                  <CalendarDays size={12} />
                </div>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                  {monthLabel}
                </h2>
              </div>
              <button
                onClick={() => setActiveMonthSummary(monthLabel)}
                className="group flex items-center gap-1.5 rounded-full border border-black/5 bg-white px-3 py-1 text-[9px] font-bold text-slate-500 shadow-sm transition-all hover:border-blue-500/30 hover:text-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
              >
                <Activity size={10} /> <span>AUDIT</span>
              </button>
            </div>

            {/* CYCLES WRAPPER: min-h-0 allows the flex-1 to strictly enforce the height */}
            <div className="flex h-full min-h-0 flex-1 overflow-visible">
              {cycleMeta.map((meta, index, arr) => {
                const cycleData = roadmap.find((r) => r.key === meta.key);
                if (!cycleData) return null;
                // 1. Find the index of THIS cycle in the GLOBAL roadmap array
                const globalIndex = roadmap.findIndex((r) => r.key === meta.key);

                // 2. Look ahead in the GLOBAL array, not the local monthly 'arr'
                const nextCycleData = roadmap[globalIndex + 1];
                const nextCycleDate = nextCycleData?.date;

                const cycleStatus = getCycleStatus(cycleData.date, nextCycleDate);

                return (
                  <div
                    key={cycleData.key}
                    className={`relative flex h-full w-[432px] flex-col overflow-visible bg-[#F5F5F7] hover:z-50 dark:border-white/5 dark:bg-[#0A0A0B] ${cycleStatus === CycleStatus.FUTURE && 'opacity-50 brightness-50 dark:opacity-50 dark:brightness-50'} ${cycleStatus === CycleStatus.PAST && 'brightness-95 dark:brightness-75'} border-r`}
                  >
                    <CycleHeader cycleData={cycleData} cycleStatus={cycleStatus} />

                    <TransactionList
                      ref={(el) => {
                        cycleScrollRefs.current[cycleData.key] = el;
                      }}
                      cycleData={cycleData}
                      onEdit={onEdit}
                      highlightId={highlightId}
                      setDeleteCandidate={setDeleteCandidate}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* TIMELINE SIDEBAR */}
      <div className="z-40 flex h-full w-[72px] shrink-0 flex-col items-center border-l border-black/5 bg-[#FBFBFD]/80 backdrop-blur-2xl dark:border-white/5 dark:bg-[#141416]/80">
        <div className="flex h-[60px] w-full shrink-0 items-center justify-center border-b border-black/5 dark:border-white/5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-400 shadow-inner hover:bg-blue-50 hover:text-blue-500 dark:bg-white/5 dark:text-slate-500 dark:hover:bg-blue-500/20 dark:hover:text-blue-400">
            <Compass size={18} strokeWidth={2.5} />
          </div>
        </div>
        <div className="no-scrollbar w-full flex-1 overflow-y-auto py-8">
          <div className="flex flex-col items-center gap-10">
            {Object.entries(timelineData).map(([year, months]) => (
              <div key={year} className="group/year relative flex flex-col items-center gap-3">
                <div className="relative flex w-6 items-center justify-center overflow-hidden rounded-full border border-black/5 bg-white py-4 shadow-sm dark:border-white/5 dark:bg-[#1C1C1E]">
                  <span className="rotate-180 text-[10px] font-black tracking-[0.3em] text-slate-300 transition-colors [writing-mode:vertical-rl] group-hover/year:text-slate-800 dark:text-slate-600 dark:group-hover/year:text-slate-200">
                    {year}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {months.map((label) => (
                    <button
                      key={label}
                      onClick={() =>
                        monthRefs.current[label]?.scrollIntoView({
                          behavior: 'smooth',
                          inline: 'start',
                        })
                      }
                      className="group relative flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:bg-white hover:shadow-md hover:ring-1 hover:ring-black/5 dark:hover:bg-[#2D2D2D]"
                    >
                      <span className="text-[9px] font-bold uppercase text-slate-400 group-hover:scale-110 group-hover:text-blue-600 dark:text-slate-500 dark:group-hover:text-blue-400">
                        {label.substring(0, 3)}
                      </span>
                      <div className="absolute -right-1 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-blue-500 opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {deleteCandidate && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center bg-black/30 p-4 backdrop-blur-md"
          onClick={() => setDeleteCandidate(null)}
        >
          <div
            className="animate-in zoom-in-95 w-[280px] overflow-hidden rounded-[24px] bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:bg-[#1C1C1E]/95 dark:ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center p-6 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-500/20">
                <AlertTriangle size={18} />
              </div>
              <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">
                Confirm Deletion
              </h3>
              <p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                Are you sure you want to remove this transaction?
              </p>
            </div>
            <div className="flex flex-col border-t border-black/5 dark:border-white/5">
              <button
                onClick={() => executeDelete('one')}
                className="py-3.5 text-[11px] font-bold text-blue-600 transition-colors hover:bg-black/[0.02] dark:text-blue-400 dark:hover:bg-white/5"
              >
                Delete Occurrence
              </button>
              {deleteCandidate.recurringGroupId && (
                <button
                  onClick={() => executeDelete('series')}
                  className="border-t border-black/5 py-3.5 text-[11px] font-bold text-red-600 transition-colors hover:bg-black/[0.02] dark:border-white/5 dark:text-red-500 dark:hover:bg-white/5"
                >
                  Delete Series
                </button>
              )}
              <button
                onClick={() => setDeleteCandidate(null)}
                className="border-t border-black/5 py-3.5 text-[11px] font-bold text-slate-400 transition-colors hover:bg-black/[0.02] dark:border-white/5 dark:hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT PANEL */}
      {activeMonthSummary && (
        <div
          className={`fixed inset-0 z-[10000] flex justify-end bg-black/20 backdrop-blur-[4px] transition-all duration-500 ${isOpening && !isClosing ? 'opacity-100' : 'opacity-0'}`}
          onClick={handleClose}
        >
          <div
            className={`m-4 w-[480px] overflow-hidden rounded-[32px] border border-white/60 bg-[#F5F5F7]/95 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.25)] backdrop-blur-3xl transition-all duration-500 dark:border-white/10 dark:bg-[#161618]/95 ${isOpening && !isClosing ? 'translate-x-0 scale-100 opacity-100' : 'translate-x-full scale-95 opacity-0'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/[0.04] px-8 py-5 dark:border-white/5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <h2 className="text-[15px] font-black leading-none tracking-tight text-slate-900 dark:text-white">
                    {activeMonthSummary}
                  </h2>
                  <p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Monthly Intelligence Audit
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="group flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-slate-500 transition-all hover:rotate-90 hover:bg-black/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
            <div className="no-scrollbar h-[calc(100%-82px)] overflow-y-auto px-8 py-6">
              <div className="relative mb-8 overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-black">
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-200/10 blur-[60px] dark:bg-blue-900/10" />
                <div className="relative z-10 flex items-center justify-between border-b border-black/[0.03] p-6 dark:border-white/[0.03]">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400/80">
                      Net Projected Surplus
                    </span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-light text-slate-400">₱</span>
                      <p className="text-3xl font-black tabular-nums tracking-tighter text-slate-900 dark:text-white">
                        {groupedCycleOptions[activeMonthSummary]
                          .reduce(
                            (acc, c) =>
                              acc + (roadmap.find((r) => r.key === c.key)?.headers?.MARGIN || 0),
                            0,
                          )
                          .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 ring-1 ring-emerald-500/20">
                    <div className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" />
                    <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Stable
                    </span>
                  </div>
                </div>
                <div className="relative z-10 grid grid-cols-4 divide-x divide-black/[0.03] bg-slate-50/50 dark:divide-white/[0.03] dark:bg-white/[0.02]">
                  {[
                    { label: 'Inflow', val: 'INFLOW', color: 'text-emerald-600' },
                    { label: 'Actual', val: 'CLEARED', color: 'text-rose-600' },
                    { label: 'Planned', val: 'PLANNED', color: 'text-blue-600' },
                    { label: 'Surplus', val: 'SURPLUS', color: 'text-slate-500' },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col items-center py-4">
                      <span className="mb-1 text-[7px] font-black uppercase tracking-widest text-slate-400">
                        {item.label}
                      </span>
                      <p className={`font-mono text-[10px] font-black tabular-nums ${item.color}`}>
                        ₱
                        {groupedCycleOptions[activeMonthSummary]
                          .reduce(
                            (acc, c) =>
                              acc +
                              ((roadmap.find((r) => r.key === c.key)?.headers?.[
                                item.val as keyof CycleHeaders
                              ] || 0) as number),
                            0,
                          )
                          .toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                            minimumFractionDigits: 2,
                          })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Cycle Analytics
                  </h3>
                  <div className="ml-4 h-[0.5px] flex-1 bg-gradient-to-r from-black/[0.08] to-transparent dark:from-white/10" />
                </div>
                <div className="space-y-3">
                  {groupedCycleOptions[activeMonthSummary].map((c) => {
                    const cycle = roadmap.find((r) => r.key === c.key);
                    const headers = cycle?.headers;
                    const surplus = headers?.SURPLUS || 0;
                    return (
                      <div
                        key={c.key}
                        className="group overflow-hidden rounded-2xl border border-black/[0.03] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/5 dark:bg-[#1C1C1E]/50"
                      >
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-500 dark:bg-white/5 dark:text-slate-500 dark:group-hover:bg-blue-500/10">
                              <Activity size={16} />
                            </div>
                            <div>
                              <p className="text-[12px] font-black tracking-tight text-slate-900 dark:text-white">
                                {cycle?.display}
                              </p>
                              <p className="text-[9px] font-bold text-slate-400">
                                {cycle?.dateLabel}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`font-mono text-[12px] font-black tabular-nums ${surplus >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
                            >
                              {surplus >= 0 ? '+' : ''}₱
                              {surplus.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center border-t border-black/[0.02] bg-slate-50/50 px-5 py-2.5 dark:border-white/5 dark:bg-white/[0.02]">
                          {[
                            { l: 'IN', v: headers?.INFLOW, c: 'text-emerald-600' },
                            { l: 'OUT', v: headers?.CLEARED, c: 'text-rose-600' },
                            { l: 'EST', v: headers?.PLANNED, c: 'text-blue-600' },
                            { l: 'SUR', v: headers?.SURPLUS, c: 'text-slate-500' },
                            { l: 'MAR', v: headers?.MARGIN, c: 'text-slate-500' },
                          ].map((m) => (
                            <div key={m.l} className="flex flex-1 items-baseline gap-1.5">
                              <span className="text-[6px] font-black text-slate-400/80">{m.l}</span>
                              <span
                                className={`font-mono text-[8px] font-bold tabular-nums ${m.c}`}
                              >
                                ₱
                                {Math.abs(m.v || 0).toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
