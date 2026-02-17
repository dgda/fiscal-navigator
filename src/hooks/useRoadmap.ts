import { useMemo } from 'react';
import {
  format,
  addDays,
  parseISO,
  setDate,
  addMonths,
  startOfMonth,
  differenceInDays,
} from 'date-fns';
import { useTreasury } from '../context/TreasuryContext';
import { TOTAL_CYCLES, DEFAULT_ANCHOR_DATE, DEFAULT_FIXED_INTERVAL } from '../constants';

export const useRoadmap = (filterMode: string, filterYear: number, filterMonth: number) => {
  const { data, totalLiquidity } = useTreasury();
  const payoutConfig = data?.payoutConfig || {
    archetype: 'bi-weekly',
    fixedIntervalDays: DEFAULT_FIXED_INTERVAL,
    anchorDate: DEFAULT_ANCHOR_DATE,
    semiMonthlyDays: [15, 30],
    monthlyDay: 1,
  };

  const masterCycles = useMemo(() => {
    const options = [];
    const { archetype, anchorDate, fixedIntervalDays, semiMonthlyDays, monthlyDay } = payoutConfig;

    if (archetype === 'bi-weekly') {
      let curr = parseISO(anchorDate || DEFAULT_ANCHOR_DATE);
      for (let i = 0; i < TOTAL_CYCLES; i++) {
        const absoluteSequence = i % 2 === 0 ? 'A' : 'B';
        options.push({
          date: format(curr, 'yyyy-MM-dd'),
          key: `${format(curr, 'yyyy-MM-dd')}-${absoluteSequence}`,
          absoluteSequence,
        });
        curr = addDays(curr, fixedIntervalDays || DEFAULT_FIXED_INTERVAL);
      }
    } else if (archetype === 'semi-monthly') {
      let startMonth = startOfMonth(new Date());
      for (let i = 0; i < 12; i++) {
        const currMonth = addMonths(startMonth, i);
        (semiMonthlyDays || [15, 30]).forEach((day, idx) => {
          const date = setDate(currMonth, day);
          const sequence = idx === 0 ? 'A' : 'B';
          options.push({
            date: format(date, 'yyyy-MM-dd'),
            key: `${format(date, 'yyyy-MM-dd')}-${sequence}`,
            absoluteSequence: sequence,
          });
        });
      }
    } else if (archetype === 'monthly') {
      let startMonth = startOfMonth(new Date());
      for (let i = 0; i < 12; i++) {
        const currMonth = addMonths(startMonth, i);
        const date = setDate(currMonth, monthlyDay || 1);
        options.push({
          date: format(date, 'yyyy-MM-dd'),
          key: `${format(date, 'yyyy-MM-dd')}-A`,
          absoluteSequence: 'A',
        });
      }
    }

    return options;
  }, [payoutConfig]);

  const groupedCycleOptions = useMemo(() => {
    const filtered = masterCycles.filter((c) => {
      const d = parseISO(c.date);
      if (filterMode === 'all') return true;
      if (filterMode === 'year') return d.getFullYear() === filterYear;
      if (filterMode === 'month')
        return d.getFullYear() === filterYear && d.getMonth() === filterMonth;
      return true;
    });
    const groups: Record<string, any[]> = {};

    filtered.forEach((c) => {
      const dateObj = parseISO(c.date);
      const monthLabel = format(dateObj, 'MMMM yyyy');
      if (!groups[monthLabel]) groups[monthLabel] = [];
      const cycleIndexInMonth = groups[monthLabel].length;
      const relativeLabel = String.fromCharCode(65 + cycleIndexInMonth);
      groups[monthLabel].push({
        ...c,
        display: `Cycle ${relativeLabel}`,
        dateLabel: format(dateObj, 'MM/dd'),
      });
    });

    return groups;
  }, [filterMode, filterYear, filterMonth, masterCycles]);

  const roadmapData = useMemo(() => {
    const isOfRoot = (typeId: string, rootName: string): boolean => {
      const t = data.types.find((x) => x.id === typeId);
      if (!t) return false;
      return t.name === rootName ? true : t.parent_type ? isOfRoot(t.parent_type, rootName) : false;
    };
    const flatOptions = Object.values(groupedCycleOptions).flat();
    const roadmapCycleKeys = flatOptions.map((o) => o.key);

    const paidInRoadmap = data.transactions
      .filter((t) => t.isPaid && roadmapCycleKeys.includes(t.cycleKey))
      .reduce((sum, t) => {
        const isInc = isOfRoot(t.typeId, 'Income');
        const isExp = isOfRoot(t.typeId, 'Expense');
        if (isInc) return sum + t.amount;
        if (isExp) return sum - t.amount;
        return sum;
      }, 0);

    const baseBalance = totalLiquidity - paidInRoadmap;
    let cumActualSaved = baseBalance;
    let cumEstSaved = baseBalance;
    let cumEstimatedExpenses = 0;

    // Generate the roadmap array with cycle-specific Reality Checks
    const roadmap = flatOptions.map((opt, index) => {
      const cycleTxs = data.transactions.filter((t) => t.cycleKey === opt.key);
      const incTxs = cycleTxs.filter((t) => isOfRoot(t.typeId, 'Income'));
      const expTxs = cycleTxs.filter((t) => isOfRoot(t.typeId, 'Expense'));

      const projectedIncome =
        incTxs.length > 0
          ? incTxs.reduce((s, t) => s + t.amount, 0)
          : cycleTxs.length === 0
            ? data.baseSalary
            : 0;
      const estimatedExpenses = expTxs.reduce((s, t) => s + t.amount, 0);
      const actualIncome = incTxs.filter((t) => t.isPaid).reduce((s, t) => s + t.amount, 0);
      const actualExpenses = expTxs.filter((t) => t.isPaid).reduce((s, t) => s + t.amount, 0);

      const netFlowProjected = projectedIncome - estimatedExpenses;
      const netFlowActual = actualIncome - actualExpenses;

      cumEstimatedExpenses += estimatedExpenses;
      cumActualSaved += netFlowActual;
      cumEstSaved += netFlowProjected;

      const averageCumEstimatedExpensesSoFar = cumEstimatedExpenses / (index + 1);
      const averageCumActualSavedSoFar = cumActualSaved / (index + 1);
      // Net burn rate
      // const burnRateSoFar = averageCumEstimatedExpensesSoFar - averageCumActualSavedSoFar;

      // Gross burn rate
      const burnRateSoFar = averageCumEstimatedExpensesSoFar;
      const liquidityRunway = cumActualSaved / burnRateSoFar;
      const remainingPlannedInThisCycle = estimatedExpenses - actualExpenses;
      const realityCheck = cumActualSaved - remainingPlannedInThisCycle;
      const isForecasting = realityCheck < 0;

      const prevProjected = cumEstSaved - netFlowProjected;
      const projectedCheck = prevProjected - estimatedExpenses;
      const isProjectedForecasting = projectedCheck < 0;
      const projectedLiquidityRunway = cumEstSaved / burnRateSoFar;

      return {
        ...opt,
        txs: cycleTxs,
        headers: {
          INFLOW: projectedIncome,
          PLANNED: estimatedExpenses,
          CLEARED: actualExpenses,
          MARGIN: netFlowProjected,
          SURPLUS: netFlowActual,
          'NET ACTUAL': cumActualSaved,
          'NET PROJECTED': cumEstSaved,
          REALITY_CHECK: realityCheck,
          IS_FORECASTING: isForecasting,
          CYCLE_BURN_RATE: burnRateSoFar,
          LIQUIDITY_RUNWAY: liquidityRunway,
          PROJECTED_LIQUIDITY_RUNWAY: projectedLiquidityRunway,
          PROJECTED_CHECK: projectedCheck,
          IS_PROJECTED_FORECASTING: isProjectedForecasting,
        },
      };
    });

    // --- RULE FOUR: DAYS OF BUFFER CALCULATION ---
    let remainingRealCash = totalLiquidity;
    let bDays = 0;
    const now = new Date();

    const futureCycles = roadmap.filter((c) => {
      const d = parseISO(c.date);
      return d >= now || format(d, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
    });

    for (let i = 0; i < futureCycles.length; i++) {
      const cycle = futureCycles[i];
      const unpaidPlanned = Math.max(0, cycle.headers.PLANNED - cycle.headers.CLEARED);

      // Calculate actual days in THIS specific cycle
      const currentD = parseISO(cycle.date);
      const nextD = futureCycles[i + 1]
        ? parseISO(futureCycles[i + 1].date)
        : addDays(currentD, payoutConfig.fixedIntervalDays || 15); // Fallback to config

      const daysInCycle = Math.max(0, differenceInDays(nextD, currentD));

      if (remainingRealCash >= unpaidPlanned) {
        remainingRealCash -= unpaidPlanned;
        bDays += daysInCycle;
      } else {
        // Calculate the partial month/cycle coverage
        const ratio = unpaidPlanned > 0 ? remainingRealCash / unpaidPlanned : 1;
        bDays += Math.floor(ratio * daysInCycle);
        break;
      }
    }

    return { roadmap, bufferDays: bDays };
  }, [data, groupedCycleOptions, totalLiquidity]);

  return {
    roadmap: roadmapData.roadmap,
    bufferDays: roadmapData.bufferDays,
    groupedCycleOptions,
    masterCycles,
  };
};
