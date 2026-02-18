import React, { JSX, useEffect, useMemo, useRef, useState } from 'react';
import { useTreasury } from '../../../../../context/TreasuryContext';
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  isAfter,
  isBefore,
  lastDayOfMonth,
  parseISO,
  setDate,
  startOfDay,
} from 'date-fns';
import { Transaction } from '../../../../../types';
import { FilterMode, useRoadmap } from '../../../../../hooks/useRoadmap';
import {
  Plus,
  Tag,
  Calendar,
  Hash,
  CreditCard,
  ArrowLeft,
  ChevronDown,
  Target,
  ShieldCheck,
  Repeat,
} from 'lucide-react';

interface SidebarNewTransactionSectionProps {
  inputBaseClass: string;
  inputGroupClass: string;
  filterMode: FilterMode;
  filterYear: number;
  filterMonth: number;
  onCommitSuccess: (id: string) => void;
  selectChevron: JSX.Element;
}

enum RecurrenceUnit {
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
}

const SidebarNewTransactionSection: React.FC<SidebarNewTransactionSectionProps> = (props) => {
  const {
    inputBaseClass,
    inputGroupClass,
    filterMode,
    filterYear,
    filterMonth,
    onCommitSuccess,
    selectChevron,
  } = props;
  const { data, sync, checkIsTransfer, computedAccounts, renderTypeOptions } = useTreasury();
  const { groupedCycleOptions, masterCycles } = useRoadmap({
    mode: filterMode,
    year: filterYear,
    month: filterMonth,
  });

  const transactionNameInputRef = useRef<HTMLInputElement>(null);

  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [isPlanned, setIsPlanned] = useState(false);
  const [isPaid, setIsPaid] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [untilDate, setUntilDate] = useState(format(addMonths(new Date(), 12), 'yyyy-MM-dd'));

  // NEW RECURRENCE STATE
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>(RecurrenceUnit.MONTHS);
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);

  const defaultCycleKey = useMemo(() => {
    const today = new Date();
    return [...masterCycles].reverse().find((c) => !isAfter(parseISO(c.date), today))?.key || '';
  }, [masterCycles]);

  useEffect(() => {
    if (!isPlanned) setIsPaid(true);
  }, [isPlanned]);

  const handleCommit = (e: React.SubmitEvent<HTMLFormElement>) => {
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
      onCommitSuccess(primaryId);
      (e.target as HTMLFormElement).reset();
      setSelectedTypeId('');
      setIsPlanned(false);
      setIsPaid(true);
      setIsRecurring(false);
      setRecurrenceInterval(1);
      setRecurrenceUnit(RecurrenceUnit.MONTHS);
      transactionNameInputRef?.current?.focus();
    } catch (err) {
      console.error('Commit Failed', err);
    }
  };

  return (
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
            ref={transactionNameInputRef}
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
            <select name="accountId" className={`${inputBaseClass} appearance-none pl-8`} required>
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
                    onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value)))}
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
  );
};

export default SidebarNewTransactionSection;
