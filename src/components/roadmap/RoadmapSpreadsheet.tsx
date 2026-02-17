import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTreasury } from '../../context/TreasuryContext';
import { UseRoadmapProps, useRoadmap } from '../../hooks/useRoadmap';
import {
  CheckCircle2,
  Circle,
  Trash2,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  GripVertical,
  CalendarDays,
  Activity,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Compass,
  ShieldCheck,
  BarChart3,
  Fingerprint,
  Repeat,
  AlertTriangle,
  Target,
  Wallet,
  PieChart,
  Clock,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Account, Transaction } from '../../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CycleHeaders } from '../../types/roadmap';
import { CycleMetricPill } from './CycleHeaders/CycleMetricPills/CycleMetricPill';
import { CycleMetricPills } from './CycleHeaders/CycleMetricPills/CycleMetricPills';
import LiquidityGapIndicator from './CycleHeaders/LiquidityGap/LiquidityGap';
import BalanceCard from './CycleHeaders/BalanceCard/BalanceCard';

interface RoadmapSpreadsheetProps {
  filter: UseRoadmapProps;
  onEdit: (id: string) => void;
  highlightId: string | null;
  onHighlightComplete: () => void;
}

interface SortableTransactionRowProps {
  tx: Transaction;
  onEdit: (id: string) => void;
  toggleExecution: (id: string) => void;
  getFullTypeName: (typeId: string) => string;
  checkIsIncome: (typeId: string) => boolean;
  checkIsTransfer: (typeId: string) => boolean;
  isHighlighted: boolean;
  onDeleteRequest: React.Dispatch<React.SetStateAction<Transaction | null>>;
  computedAccounts: Account[];
}

const SortableTransactionRow = (props: SortableTransactionRowProps) => {
  const {
    tx,
    onEdit,
    toggleExecution,
    getFullTypeName,
    checkIsIncome,
    checkIsTransfer,
    isHighlighted,
    onDeleteRequest,
    computedAccounts,
  } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tx.id,
  });

  const isIncome = checkIsIncome(tx.typeId);
  const isTransfer = checkIsTransfer(tx.typeId);
  const account = computedAccounts?.find((acc: Account) => tx.accountId === acc.id);

  const getAccentBg = () => {
    if (isIncome) return tx.isPaid ? 'bg-emerald-500' : 'bg-emerald-500/20';
    if (isTransfer) return tx.isPaid ? 'bg-violet-500' : 'bg-violet-500/20';
    return tx.isPaid ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600';
  };

  const getIconColor = () => {
    if (!tx.isPaid) return 'text-slate-300/80 dark:text-slate-600';
    if (isIncome) return 'text-emerald-500';
    if (isTransfer) return 'text-violet-500';
    return 'text-rose-500';
  };

  const getTextColor = () => {
    if (!tx.isPaid) return 'text-slate-500/80 dark:text-slate-400/80';
    if (isIncome) return 'text-emerald-700 dark:text-emerald-400';
    if (isTransfer) return 'text-violet-700 dark:text-violet-400';
    return 'text-rose-700 dark:text-rose-400';
  };

  const getMetadataColor = () =>
    tx.isPaid ? 'text-slate-400 dark:text-slate-400' : 'text-slate-400/60';

  const getCurrencyColor = () => {
    if (!tx.isPaid) return 'text-slate-400/80 dark:text-slate-500/80';
    if (isIncome) return 'text-emerald-600 dark:text-emerald-400';
    if (isTransfer) return 'text-violet-600 dark:text-violet-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const baseClasses =
    'bg-white dark:bg-[#1C1C1E] ' +
    'border-y border-r border-y-slate-100 border-r-slate-100 dark:border-y-white/5 dark:border-r-white/5 ' +
    'shadow-sm transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ' +
    'hover:-translate-y-[1px] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] ' +
    'dark:hover:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.5)]';

  return (
    <div
      ref={setNodeRef}
      id={`tx-row-${tx.id}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`group relative flex items-center justify-between overflow-hidden rounded-[12px] px-3 py-2 ${baseClasses} w-full max-w-[400px] shrink-0 ${
        isDragging ? 'z-50 scale-[1.02] shadow-2xl ring-1 ring-black/5' : ''
      } ${isHighlighted ? 'z-10 border-blue-500 shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)] ring-1 ring-blue-500/50' : ''}`}
    >
      <div
        className={`absolute bottom-0 left-0 top-0 w-[3px] transition-all duration-300 ${getAccentBg()}`}
      />
      <div className="flex min-w-0 flex-1 items-center gap-3 pl-0.5">
        <div className="flex shrink-0 items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-slate-300/60 transition-all hover:text-slate-400 dark:text-white/5 dark:hover:text-slate-600"
          >
            <GripVertical size={14} />
          </button>
          <button
            onClick={() => toggleExecution(tx.id)}
            className="shrink-0 transition-transform active:scale-90"
          >
            {tx.isPaid ? (
              <CheckCircle2 className={getIconColor()} size={18} />
            ) : (
              <Circle className="text-slate-300 dark:text-slate-600" size={18} />
            )}
          </button>
        </div>
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onEdit(tx.id)}>
          <div className="flex flex-col">
            <p
              className={`truncate text-[11px] ${tx.isPaid ? 'font-semibold' : 'font-medium'} ${getTextColor()}`}
            >
              {tx.name}
            </p>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span
                  className={`truncate text-[8px] font-normal uppercase tracking-[0.08em] ${getMetadataColor()}`}
                >
                  {getFullTypeName(tx.typeId)}
                </span>
                {tx.recurringGroupId && (
                  <Repeat
                    size={9}
                    className={`transition-all ${tx.isPaid ? 'text-blue-400/60' : 'text-blue-400/20'}`}
                  />
                )}
              </div>
              <span
                className={`shrink-0 font-mono text-[8px] font-normal tracking-tighter ${getMetadataColor()}`}
              >
                {account?.name || 'Unassigned Account'}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="ml-3 flex shrink-0 items-center gap-3">
        <span
          className={`font-mono text-[11px] font-black tabular-nums tracking-tight ${getCurrencyColor()}`}
        >
          <span className="mr-px text-[9px] font-medium opacity-40">₱</span>
          {tx.amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRequest(tx);
          }}
          className="text-slate-300/60 transition-all hover:!text-red-500 dark:text-white/5"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export const RoadmapSpreadsheet: React.FC<RoadmapSpreadsheetProps> = ({
  filter,
  onEdit,
  highlightId,
  onHighlightComplete,
}) => {
  const {
    toggleExecution,
    sync,
    deleteSeries,
    data,
    getFullTypeName,
    checkIsIncome,
    checkIsTransfer,
    computedAccounts,
  } = useTreasury();
  const { roadmap, groupedCycleOptions } = useRoadmap(filter);
  const [activeMonthSummary, setActiveMonthSummary] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Transaction | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cycleScrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const monthRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
              {cycleMeta.map((meta) => {
                const cycleData = roadmap.find((r) => r.key === meta.key);
                if (!cycleData) return null;

                const processedTxs = [...cycleData.txs].sort((a: Transaction, b: Transaction) => {
                  if (a.isPlanned !== b.isPlanned) return a.isPlanned ? -1 : 1;
                  const dateA = new Date(a.date).getTime();
                  const dateB = new Date(b.date).getTime();
                  if (dateA !== dateB) return dateA - dateB;
                  return cycleData.txs.indexOf(a) - cycleData.txs.indexOf(b);
                });

                const {
                  INFLOW,
                  PLANNED,
                  CLEARED,
                  MARGIN,
                  SURPLUS,
                  NET_ACTUAL,
                  NET_PROJECTED,
                  IS_FORECASTING,
                  REALITY_CHECK,
                  LIQUIDITY_RUNWAY,
                  PROJECTED_LIQUIDITY_RUNWAY,
                  PROJECTED_CHECK,
                  IS_PROJECTED_FORECASTING,
                } = cycleData.headers;
                const unpaidInCycle = PLANNED - CLEARED;
                const prevActual = NET_ACTUAL - SURPLUS;
                const prevProjected = NET_PROJECTED - MARGIN;
                const firstAccruedId = processedTxs.find((t: Transaction) => t.isPlanned)?.id;
                const firstOperatingId = processedTxs.find((t: Transaction) => !t.isPlanned)?.id;
                const showAccruedSeparator = processedTxs.some((t: Transaction) => t.isPlanned);
                const showOperatingSeparator = processedTxs.some((t: Transaction) => !t.isPlanned);

                return (
                  <div
                    key={cycleData.key}
                    className="flex h-full w-[432px] flex-col overflow-visible border-r border-black/[0.04] bg-[#F5F5F7] dark:border-white/5 dark:bg-[#0A0A0B]"
                  >
                    {/* PINNED CYCLE STATS: relative z-[10] hover:z-[50] and shrink-0 to fix it */}
                    <div className="group/cycle relative z-[10] shrink-0 border-b border-black/[0.04] bg-[#F5F5F7]/95 px-4 py-4 backdrop-blur-xl transition-all hover:z-[50] dark:border-white/5 dark:bg-[#0A0A0B]/95">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-[13px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
                          {cycleData.display}
                        </h3>
                        <div className="flex items-center gap-1 self-center rounded-full border border-black/[0.05] bg-white/50 p-0.5 py-[0.0625rem] pl-1 shadow-[0_1px_2px_rgba(0,0,0,0.02)] backdrop-blur-md transition-all dark:border-white/[0.06] dark:bg-zinc-900/30">
                          {/* ACTUAL METRIC SECTION */}
                          <div
                            className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 transition-colors duration-500 ${
                              LIQUIDITY_RUNWAY < 0
                                ? 'bg-rose-500/10 dark:bg-rose-500/20'
                                : 'bg-transparent'
                            }`}
                          >
                            <div
                              className={`h-1 w-1 rounded-full ${
                                LIQUIDITY_RUNWAY < 0 ? 'bg-rose-500' : 'bg-emerald-500/80'
                              }`}
                            />
                            <span className="text-[7px] font-bold uppercase tracking-tight text-slate-400 dark:text-zinc-500">
                              Act
                            </span>
                            <span
                              className={`text-[9px] font-bold tabular-nums ${
                                LIQUIDITY_RUNWAY < 0
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-slate-700 dark:text-zinc-200'
                              }`}
                            >
                              {LIQUIDITY_RUNWAY.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                              <span
                                className={`ml-0.5 text-[7px] font-medium ${
                                  LIQUIDITY_RUNWAY < 0
                                    ? 'text-rose-600/40'
                                    : 'text-slate-400/50 dark:text-zinc-600'
                                }`}
                              >
                                cyc
                              </span>
                            </span>
                          </div>

                          {/* HAIRLINE DIVIDER (Hidden if either adjacent section is highlighted to prevent visual clutter) */}
                          <div
                            className={`h-2 w-[0.5px] bg-black/5 dark:bg-white/10 ${
                              LIQUIDITY_RUNWAY < 0 || PROJECTED_LIQUIDITY_RUNWAY < 0
                                ? 'opacity-0'
                                : 'opacity-100'
                            }`}
                          />

                          {/* PROJECTED METRIC SECTION */}
                          <div
                            className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 transition-colors duration-500 ${
                              PROJECTED_LIQUIDITY_RUNWAY < 0
                                ? 'bg-rose-500/10 dark:bg-rose-500/20'
                                : 'bg-transparent'
                            }`}
                          >
                            <div
                              className={`h-1 w-1 rounded-full ${
                                PROJECTED_LIQUIDITY_RUNWAY < 0 ? 'bg-rose-500' : 'bg-blue-500/80'
                              }`}
                            />
                            <span className="text-[7px] font-bold uppercase tracking-tight text-slate-400 dark:text-zinc-500">
                              Prj
                            </span>
                            <span
                              className={`text-[9px] font-bold tabular-nums ${
                                PROJECTED_LIQUIDITY_RUNWAY < 0
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-slate-700 dark:text-zinc-200'
                              }`}
                            >
                              {PROJECTED_LIQUIDITY_RUNWAY.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                              <span
                                className={`ml-0.5 text-[7px] font-medium ${
                                  PROJECTED_LIQUIDITY_RUNWAY < 0
                                    ? 'text-rose-600/40'
                                    : 'text-slate-400/50 dark:text-zinc-600'
                                }`}
                              >
                                cyc
                              </span>
                            </span>
                          </div>

                          {/* DATE TAG (Right-aligned End-cap) */}
                          <div className="ml-0.5 flex h-4 items-center rounded-full bg-slate-900/[0.04] px-2 dark:bg-white/[0.06]">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                              {cycleData.dateLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-2.5 grid grid-cols-2 gap-2">
                        <BalanceCard
                          variant="blue"
                          label="Net Actual"
                          value={NET_ACTUAL}
                          prevValue={prevActual}
                          prevLabel="Opening Balance"
                          flowValue={SURPLUS}
                          flowLabel="Cycle Net Flow"
                        />

                        <BalanceCard
                          variant="teal"
                          label="Net Projected"
                          value={NET_PROJECTED}
                          prevValue={prevProjected}
                          prevLabel="Opening Target"
                          flowValue={MARGIN}
                          flowLabel="Planned Margin"
                        />
                      </div>

                      {/* ACTUAL STATUS */}
                      <LiquidityGapIndicator
                        label="Actual Liquidity"
                        isForecasting={IS_FORECASTING}
                        currentLiquidity={NET_ACTUAL}
                        currentLiquidityLabel="Current Liquidity"
                        comparisonValue={unpaidInCycle}
                        comparisonLabel="Unpaid Planned Bills"
                        marginValue={REALITY_CHECK}
                        marginLabel="Survival Margin"
                      />

                      {/* PROJECTED STATUS */}
                      <LiquidityGapIndicator
                        isProjected
                        label="Projected Liquidity"
                        isForecasting={IS_PROJECTED_FORECASTING}
                        currentLiquidity={Number(prevProjected)}
                        currentLiquidityLabel="Projected Current Liquidity"
                        comparisonValue={PLANNED}
                        comparisonLabel="Planned Bills"
                        marginValue={PROJECTED_CHECK}
                        marginLabel="Projected Survival Margin"
                      />
                      <CycleMetricPills cycleHeaders={cycleData.headers} />
                    </div>

                    {/* ONLY SCROLLABLE SECTION: Transaction list gets flex-1 and overflow-y-auto */}
                    <div
                      ref={(el) => {
                        cycleScrollRefs.current[cycleData.key] = el;
                      }}
                      className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4"
                    >
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => {
                          const { active, over } = e;
                          if (over && active.id !== over.id) {
                            const cycleTxs = data.transactions.filter(
                              (t: Transaction) => t.cycleKey === cycleData.key,
                            );
                            const otherTxs = data.transactions.filter(
                              (t: Transaction) => t.cycleKey !== cycleData.key,
                            );
                            const oldIdx = cycleTxs.findIndex(
                              (t: Transaction) => t.id === active.id,
                            );
                            const newIdx = cycleTxs.findIndex((t: Transaction) => t.id === over.id);
                            sync({
                              ...data,
                              transactions: [...otherTxs, ...arrayMove(cycleTxs, oldIdx, newIdx)],
                            });
                          }
                        }}
                      >
                        <SortableContext
                          items={processedTxs.map((t: Transaction) => t.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {processedTxs.map((tx: Transaction, index: number) => {
                            const currentDate = format(parseISO(tx.date), 'yyyy-MM-dd');
                            const prevDate =
                              index > 0
                                ? format(parseISO(processedTxs[index - 1].date), 'yyyy-MM-dd')
                                : null;
                            const isAccruedHeader =
                              showAccruedSeparator && tx.id === firstAccruedId;
                            const isOperatingHeader =
                              showOperatingSeparator && tx.id === firstOperatingId;
                            const sectionHasHeader =
                              (tx.isPlanned && showAccruedSeparator) ||
                              (!tx.isPlanned && showOperatingSeparator);
                            const showDateSeparator =
                              currentDate !== prevDate || isAccruedHeader || isOperatingHeader;
                            const nextTx =
                              index < processedTxs.length - 1 ? processedTxs[index + 1] : null;
                            const isLastOfGroup =
                              !nextTx ||
                              format(parseISO(nextTx.date), 'yyyy-MM-dd') !== currentDate ||
                              nextTx.id === firstOperatingId;
                            return (
                              <React.Fragment key={tx.id}>
                                {(isAccruedHeader || isOperatingHeader) && (
                                  <div className="sticky top-0 z-[60] -mx-4 bg-[#F5F5F7] pb-[5px] pt-2.5 dark:bg-[#0A0A0B]">
                                    <div className="relative flex items-center justify-center">
                                      <div className="absolute h-[0.5px] w-full bg-gradient-to-r from-transparent via-black/[0.4] to-transparent dark:via-white/[0.4]" />
                                      <div className="relative flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-1 shadow-sm dark:border-white/10 dark:bg-[#1C1C1E]">
                                        <span className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-500">
                                          {isAccruedHeader
                                            ? 'Accrued Expenses'
                                            : 'Operating Expenses'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {showDateSeparator && (
                                  <div
                                    className={`sticky z-[50] -mx-4 bg-[#F5F5F7] px-5 dark:bg-[#0A0A0B] ${sectionHasHeader ? `top-[34px] pb-2.5 ${!(isAccruedHeader || isOperatingHeader) && 'pt-2.5'}` : 'top-0 pb-2.5 pt-2.5'}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="shrink-0 font-mono text-[7px] font-semibold uppercase tracking-[0.0em] text-slate-400 dark:text-slate-500">
                                        {format(parseISO(tx.date), 'EEEE, MMM dd')}
                                      </span>
                                      <div className="h-[0.5px] flex-1 bg-gradient-to-r from-black/[0.2] to-transparent dark:from-white/[0.2]" />
                                    </div>
                                  </div>
                                )}
                                <div className={isLastOfGroup ? 'mb-0' : 'mb-1.5'}>
                                  <SortableTransactionRow
                                    tx={tx}
                                    onEdit={onEdit}
                                    toggleExecution={toggleExecution}
                                    getFullTypeName={getFullTypeName}
                                    checkIsIncome={checkIsIncome}
                                    checkIsTransfer={checkIsTransfer}
                                    isHighlighted={tx.id === highlightId}
                                    onDeleteRequest={setDeleteCandidate}
                                    computedAccounts={computedAccounts}
                                  />
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </SortableContext>
                      </DndContext>
                    </div>
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
