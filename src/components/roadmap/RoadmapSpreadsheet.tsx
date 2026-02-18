import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTreasury } from '../../context/TreasuryContext';
import { UseRoadmapProps, useRoadmap } from '../../hooks/useRoadmap';
import { CalendarDays, Activity, X, Compass, BarChart3, AlertTriangle } from 'lucide-react';
import { format, isBefore, parseISO, startOfDay, subDays } from 'date-fns';
import { Transaction } from '../../types';
import { CycleHeaders, CycleStatus } from '../../types/roadmap';
import CycleHeader from './CycleHeader/CycleHeader';
import TransactionList from './TransactionList/TransactionList';
import DeleteModal from './DeleteModal/DeleteModal';
import AuditPanel from './AuditPanel/AuditPanel';

interface RoadmapSpreadsheetProps {
  filter: UseRoadmapProps;
  onEdit: (id: string) => void;
  highlightId: string | null;
  onHighlightComplete: () => void;
}

const RoadmapSpreadsheet: React.FC<RoadmapSpreadsheetProps> = ({
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

      <DeleteModal
        deleteCandidate={deleteCandidate}
        setDeleteCandidate={setDeleteCandidate}
        executeDelete={executeDelete}
      />

      <AuditPanel
        activeMonthSummary={activeMonthSummary}
        isOpening={isOpening}
        isClosing={isClosing}
        handleClose={handleClose}
        groupedCycleOptions={groupedCycleOptions}
        roadmap={roadmap}
      />
    </div>
  );
};

export default RoadmapSpreadsheet;
