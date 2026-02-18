import React, { useState, useMemo, useEffect } from 'react';
import { useTreasury } from '../../context/TreasuryContext';
import { FilterMode, useRoadmap } from '../../hooks/useRoadmap';
import {
  parseISO,
  isAfter,
  format,
  addMonths,
  setDate,
  lastDayOfMonth,
  isBefore,
  startOfDay,
  addDays,
  addWeeks,
} from 'date-fns';
import {
  ArrowLeft,
  Target,
  Repeat,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ChevronDown,
  Plus,
  Calendar,
  CreditCard,
  Hash,
  Tag,
} from 'lucide-react';
import { Transaction } from '../../types';

interface SidebarProps {
  filterMode: FilterMode;
  setFilterMode: (mode: FilterMode) => void;
  filterYear: number;
  setFilterYear: (year: number) => void;
  filterMonth: number;
  setFilterMonth: (month: number) => void;
  activeView: 'roadmap' | 'settings';
  setActiveView: (view: 'roadmap' | 'settings') => void;
  onCommitSuccess: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

enum RecurrenceUnit {
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
}

const Sidebar: React.FC<SidebarProps> = (props) => {
  const { data, sync, checkIsTransfer, computedAccounts, renderTypeOptions } = useTreasury();
  const { groupedCycleOptions, masterCycles } = useRoadmap({
    mode: props.filterMode,
    year: props.filterYear,
    month: props.filterMonth,
  });
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [isPlanned, setIsPlanned] = useState(false);
  const [isPaid, setIsPaid] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [untilDate, setUntilDate] = useState(format(addMonths(new Date(), 12), 'yyyy-MM-dd'));

  // NEW RECURRENCE STATE
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>(RecurrenceUnit.MONTHS);
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);

  useEffect(() => {
    if (!isPlanned) setIsPaid(true);
  }, [isPlanned]);

  const defaultCycleKey = useMemo(() => {
    const today = new Date();
    return [...masterCycles].reverse().find((c) => !isAfter(parseISO(c.date), today))?.key || '';
  }, [masterCycles]);

  const handleCommit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const f = new FormData(e.currentTarget);
      const now = new Date().toISOString();
      const userDate = f.get('transactionDate') as string;
      const anchorDate = new Date(userDate);
      const dayOfMonth = anchorDate.getDate();
      const feeAmount = Number(f.get('feeAmount')) || 0;
      const baseCycleKey = f.get('cycleKey') as string;
      const primaryId = crypto.randomUUID();
      const recurringGroupId = isRecurring ? crypto.randomUUID() : undefined;

      const primaryTx: Transaction = {
        id: primaryId,
        name: f.get('name') as string,
        amount: Number(f.get('amount')),
        typeId: selectedTypeId,
        accountId: f.get('accountId') as string,
        toAccountId: (f.get('toAccountId') as string) || undefined,
        date: anchorDate.toISOString(),
        cycleKey: baseCycleKey,
        isPlanned,
        isPaid,
        isRecurring,
        recurringGroupId,
        history: [],
        created_at: now,
        updated_at: now,
      };

      let batch = [primaryTx];

      if (feeAmount > 0) {
        batch.push({
          ...primaryTx,
          id: crypto.randomUUID(),
          name: `Fee: ${primaryTx.name}`,
          amount: feeAmount,
          typeId: data.types.find((t) => t.name === 'Expense')?.id || selectedTypeId,
          history: [{ snapshot: {}, timestamp: now, label: `Linked Fee` }],
        });
      }

      if (isRecurring) {
        // Helper to calculate the next occurrence based on frequency unit
        const getNextOccurrence = (d: Date) => {
          if (recurrenceUnit === 'days') return addDays(d, recurrenceInterval);
          if (recurrenceUnit === 'weeks') return addWeeks(d, recurrenceInterval);

          // Monthly logic with day-of-month persistence (e.g., 31st becomes 30th/28th)
          const nextMonth = addMonths(d, recurrenceInterval);
          const lastDay = lastDayOfMonth(nextMonth).getDate();
          const targetDay = dayOfMonth > lastDay ? lastDay : dayOfMonth;
          return setDate(nextMonth, targetDay);
        };

        let currentPointer = getNextOccurrence(anchorDate);
        const endPointer = startOfDay(parseISO(untilDate));

        while (
          isBefore(currentPointer, endPointer) ||
          format(currentPointer, 'yyyy-MM-dd') === format(endPointer, 'yyyy-MM-dd')
        ) {
          const occurrenceDate = currentPointer;

          // SMART CYCLE DETERMINATION:
          // Finds the latest cycle such that cycleDate <= occurrenceDate
          const targetCycle = masterCycles
            .filter(
              (c) =>
                isBefore(parseISO(c.date), occurrenceDate) ||
                c.date === format(occurrenceDate, 'yyyy-MM-dd'),
            )
            .pop();

          if (targetCycle) {
            batch.push({
              ...primaryTx,
              id: crypto.randomUUID(),
              date: occurrenceDate.toISOString(),
              cycleKey: targetCycle.key,
              isPlanned: true,
              isPaid: false,
              history: [],
            });
          }
          currentPointer = getNextOccurrence(currentPointer);
        }
      }

      sync({ ...data, transactions: [...data.transactions, ...batch] });
      props.onCommitSuccess(primaryId);
      (e.target as HTMLFormElement).reset();
      setSelectedTypeId('');
      setIsPlanned(false);
      setIsPaid(true);
      setIsRecurring(false);
      setRecurrenceInterval(1);
      setRecurrenceUnit(RecurrenceUnit.MONTHS);
    } catch (err) {
      console.error('Commit Failed', err);
    }
  };

  const sidebarBase =
    'no-scrollbar flex h-full flex-col overflow-y-auto border-r border-black/5 bg-[#FBFBFD]/80 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] dark:border-white/5 dark:bg-[#141416]/90';

  const inputGroupClass =
    'group relative flex items-center rounded-[10px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/5 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 dark:bg-[#1C1C1E] dark:ring-white/10 dark:focus-within:ring-blue-500/30';

  const inputBaseClass =
    'w-full bg-transparent px-3 py-2.5 text-[11px] font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition-colors dark:text-[#E1E1E1] dark:placeholder:text-slate-600';

  const selectChevron = (
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
      <ChevronDown size={12} strokeWidth={3} />
    </div>
  );

  return (
    <div className="relative z-[500] flex h-full shrink-0">
      <aside
        className={`${sidebarBase} ${
          props.isOpen ? 'w-[320px] px-5 py-6 opacity-100' : 'w-0 overflow-hidden p-0 opacity-0'
        }`}
      >
        {props.activeView === 'roadmap' ? (
          <>
            <section className="mb-6 space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400/80 dark:text-slate-500">
                  Timeline
                </span>
              </div>

              <div className="flex rounded-[10px] bg-slate-200/50 p-1 dark:bg-white/5">
                {Object.values(FilterMode).map((m) => (
                  <button
                    key={m}
                    onClick={() => props.setFilterMode(m)}
                    className={`flex-1 rounded-[7px] py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all duration-200 ${
                      props.filterMode === m
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-[#2D2D2D] dark:text-white dark:shadow-black/20'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {props.filterMode !== 'all' && (
                <div className="animate-in slide-in-from-top-1 fade-in grid grid-cols-2 gap-2 duration-300">
                  {props.filterMode === 'month' && (
                    <div className={inputGroupClass}>
                      <div className="relative w-full">
                        <select
                          value={props.filterMonth}
                          onChange={(e) => props.setFilterMonth(Number(e.target.value))}
                          className={`${inputBaseClass} appearance-none`}
                        >
                          {[
                            'Jan',
                            'Feb',
                            'Mar',
                            'Apr',
                            'May',
                            'Jun',
                            'Jul',
                            'Aug',
                            'Sep',
                            'Oct',
                            'Nov',
                            'Dec',
                          ].map((m, i) => (
                            <option key={m} value={i}>
                              {m}
                            </option>
                          ))}
                        </select>
                        {selectChevron}
                      </div>
                    </div>
                  )}
                  <div
                    className={`${inputGroupClass} ${props.filterMode === 'year' ? 'col-span-2' : ''}`}
                  >
                    <input
                      type="number"
                      value={props.filterYear}
                      onChange={(e) => props.setFilterYear(Number(e.target.value))}
                      className={`${inputBaseClass} text-center font-bold`}
                    />
                  </div>
                </div>
              )}
            </section>

            <section className="flex-1 space-y-5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400/80 dark:text-slate-500">
                  Composer
                </span>
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400">
                  <Plus size={10} strokeWidth={3} />
                </div>
              </div>

              <form onSubmit={handleCommit} className="space-y-3">
                <div className={inputGroupClass}>
                  <div className="absolute left-3 text-slate-400 dark:text-slate-600">
                    <Tag size={12} />
                  </div>
                  <input
                    name="name"
                    placeholder="Transaction Name"
                    className={`${inputBaseClass} pl-8`}
                    autoComplete="off"
                    required
                  />
                </div>

                <div className={inputGroupClass}>
                  <div className="absolute left-3 text-slate-400 dark:text-slate-600">
                    <Calendar size={12} />
                  </div>
                  <input
                    name="transactionDate"
                    type="date"
                    defaultValue={format(new Date(), 'yyyy-MM-dd')}
                    className={`${inputBaseClass} pl-8 [color-scheme:light] dark:[color-scheme:dark]`}
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <div className={`${inputGroupClass} flex-1`}>
                    <div className="absolute left-3 text-slate-400 dark:text-slate-600">
                      <Hash size={12} />
                    </div>
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className={`${inputBaseClass} pl-8`}
                      required
                    />
                  </div>
                  <div
                    className={`${inputGroupClass} w-20 !bg-red-50/30 !ring-red-100 focus-within:!ring-red-200 dark:!bg-red-900/10 dark:!ring-red-900/20`}
                  >
                    <input
                      name="feeAmount"
                      type="number"
                      step="0.01"
                      placeholder="Fee"
                      className={`${inputBaseClass} text-center text-red-600 placeholder:text-red-300 dark:text-red-400 dark:placeholder:text-red-700`}
                    />
                  </div>
                </div>

                <div className={inputGroupClass}>
                  <div className="relative w-full">
                    <select
                      name="cycleKey"
                      defaultValue={defaultCycleKey}
                      className={`${inputBaseClass} appearance-none`}
                      required
                    >
                      {Object.entries(groupedCycleOptions).map(([m, c]) => (
                        <optgroup key={m} label={m} className="dark:bg-[#1A1A1A]">
                          {c.map((o) => (
                            <option key={o.key} value={o.key}>
                              {o.display} ({o.dateLabel})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {selectChevron}
                  </div>
                </div>

                <div className={inputGroupClass}>
                  <div className="relative w-full">
                    <select
                      name="typeId"
                      value={selectedTypeId}
                      onChange={(e) => setSelectedTypeId(e.target.value)}
                      className={`${inputBaseClass} appearance-none`}
                      required
                    >
                      <option value="">Classification</option>
                      {renderTypeOptions()}
                    </select>
                    {selectChevron}
                  </div>
                </div>

                <div className={inputGroupClass}>
                  <div className="absolute left-3 text-slate-400 dark:text-slate-600">
                    <CreditCard size={12} />
                  </div>
                  <div className="relative w-full">
                    <select
                      name="accountId"
                      className={`${inputBaseClass} appearance-none pl-8`}
                      required
                    >
                      <option value="">Source Account</option>
                      {computedAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    {selectChevron}
                  </div>
                </div>

                {checkIsTransfer(selectedTypeId) && (
                  <div className="animate-in fade-in slide-in-from-top-2 relative">
                    <div
                      className={`${inputGroupClass} !bg-blue-50/30 !ring-blue-100 dark:!bg-blue-900/10 dark:!ring-blue-900/20`}
                    >
                      <div className="absolute left-3 text-blue-400 dark:text-blue-500">
                        <ArrowLeft size={12} className="rotate-180" />
                      </div>
                      <div className="relative w-full">
                        <select
                          name="toAccountId"
                          className={`${inputBaseClass} appearance-none pl-8 text-blue-600 dark:text-blue-400`}
                          required
                        >
                          <option value="">Destination Account</option>
                          {computedAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 dark:text-blue-500">
                          <ChevronDown size={12} strokeWidth={3} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 overflow-hidden rounded-[12px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/5 dark:bg-[#1C1C1E] dark:ring-white/10">
                  <label className="group flex cursor-pointer items-center justify-between px-3.5 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${isPlanned ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-500'}`}
                      >
                        <Target size={12} strokeWidth={3} />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Plan Estimate
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={isPlanned}
                      onChange={(e) => setIsPlanned(e.target.checked)}
                    />
                  </label>
                  <div className="h-[1px] bg-slate-100 pl-12 dark:bg-white/5"></div>
                  <label className="group flex cursor-pointer items-center justify-between px-3.5 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${isPaid ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-500'}`}
                      >
                        <ShieldCheck size={12} strokeWidth={3} />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Mark Liquidated
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      checked={isPaid}
                      onChange={(e) => setIsPaid(e.target.checked)}
                    />
                  </label>
                  <div className="h-[1px] bg-slate-100 pl-12 dark:bg-white/5"></div>
                  <label className="group flex cursor-pointer items-center justify-between px-3.5 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${isRecurring ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-500'}`}
                      >
                        <Repeat size={12} strokeWidth={3} />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Recurring Series
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                    />
                  </label>

                  {isRecurring && (
                    <div className="animate-in slide-in-from-top-2 space-y-3 bg-purple-50/30 px-3.5 py-4 dark:bg-purple-900/10">
                      {/* NEW: RECURRENCE FREQUENCY CONTROLS */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600/70 dark:text-purple-400/70">
                          Frequency
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={recurrenceInterval}
                            onChange={(e) =>
                              setRecurrenceInterval(Math.max(1, Number(e.target.value)))
                            }
                            className="w-12 rounded bg-white/50 px-1 py-0.5 text-center text-[11px] font-bold text-purple-700 outline-none ring-1 ring-purple-200 dark:bg-black/40 dark:text-purple-300 dark:ring-purple-900/30"
                          />
                          <select
                            value={recurrenceUnit}
                            onChange={(e) => setRecurrenceUnit(e.target.value as RecurrenceUnit)}
                            className="bg-transparent text-[11px] font-bold text-purple-700 outline-none dark:text-purple-300"
                          >
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                            <option value="months">Months</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-purple-100/50 pt-1 dark:border-purple-800/30">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600/70 dark:text-purple-400/70">
                          Until
                        </span>
                        <input
                          type="date"
                          value={untilDate}
                          onChange={(e) => setUntilDate(e.target.value)}
                          className="flex-1 bg-transparent text-right text-[11px] font-bold text-slate-700 outline-none [color-scheme:light] dark:text-slate-200 dark:[color-scheme:dark]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button className="group relative mt-6 w-full overflow-hidden rounded-[12px] bg-slate-900 py-3.5 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:shadow-xl dark:bg-white dark:text-black">
                  <span className="relative z-10">Execute Commit</span>
                </button>
              </form>
            </section>
          </>
        ) : (
          <div className="space-y-6">
            <button
              onClick={() => props.setActiveView('roadmap')}
              className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-blue-600 transition-colors hover:text-blue-500 dark:text-blue-400"
            >
              <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />{' '}
              Return to Roadmap
            </button>
            <div className="rounded-[14px] border border-black/5 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#1C1C1E]">
              <p className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                <ShieldCheck size={12} /> Core Infrastructure
              </p>
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase text-slate-400">
                  Monthly Base Salary
                </label>
                <div className={inputGroupClass}>
                  <div className="absolute left-3 text-emerald-500">
                    <span className="font-mono text-[12px] font-bold">₱</span>
                  </div>
                  <input
                    type="number"
                    defaultValue={data.baseSalary}
                    onBlur={(e) => sync({ ...data, baseSalary: Number(e.target.value) })}
                    className={`${inputBaseClass} pl-8`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      <div
        className={`fixed top-[20%] z-[10000] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${props.isOpen ? 'left-[308px]' : 'left-0'}`}
      >
        <button
          onClick={props.onToggle}
          // className={`group relative flex h-14 w-6 items-center justify-center transition-all duration-500  ${
          className={`group relative flex h-14 w-6 items-center justify-center rounded-r-2xl bg-white/80 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.1)] ring-1 ring-black/5 backdrop-blur-xl transition-all duration-500 dark:bg-[#1C1C1E]/80 dark:ring-white/10`}
          //   props.isOpen
          //     ? 'bg-transparent opacity-40 hover:opacity-100'
          //     : 'rounded-r-2xl bg-white/80 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.1)] ring-1 ring-black/5 backdrop-blur-xl dark:bg-[#1C1C1E]/80 dark:ring-white/10'
          // }
          //  `}
        >
          <div
            className={`transition-all duration-500 ${props.isOpen ? 'rotate-180 text-slate-400' : 'rotate-0 text-blue-500'}`}
          >
            <ChevronRight size={14} strokeWidth={3} />
          </div>

          <div
            className={`pointer-events-none absolute left-10 z-[10001] -translate-x-2 whitespace-nowrap rounded-xl bg-slate-900/95 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-white opacity-0 shadow-2xl blur-sm transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-hover:blur-0 dark:bg-white dark:text-black`}
          >
            {props.isOpen ? 'Retract Inspector' : 'Expand Sidebar'}
          </div>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
