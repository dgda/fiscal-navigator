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
import {
  CycleHeaders,
  CycleStatus,
  GroupedRoadmapTransactions,
  LabeledRoadmapTransaction,
  RoadmapCycle,
  RoadmapData,
  RoadmapTransaction,
} from '../types/roadmap';
import { getCycleStatus } from '../helpers/cycleHelpers';

export interface IUseRoadmap {
  roadmap: RoadmapCycle[];
  bufferDays: number;
  groupedCycleOptions: GroupedRoadmapTransactions;
  masterCycles: RoadmapTransaction[];
}
export enum FilterMode {
  ALL = 'all',
  YEAR = 'year',
  MONTH = 'month',
}

export interface UseRoadmapProps {
  mode: FilterMode;
  year: number;
  month: number;
}

export const useRoadmap = (props: UseRoadmapProps): IUseRoadmap => {
  const { mode, year, month } = props;
  const { data, totalLiquidity } = useTreasury();
  const payoutConfig = data?.payoutConfig || {
    archetype: 'bi-weekly',
    fixedIntervalDays: DEFAULT_FIXED_INTERVAL,
    anchorDate: DEFAULT_ANCHOR_DATE,
    semiMonthlyDays: [15, 30],
    monthlyDay: 1,
  };

  const masterCycles: RoadmapTransaction[] = useMemo(() => {
    const roadmapTransactions: RoadmapTransaction[] = [];
    const { archetype, anchorDate, fixedIntervalDays, semiMonthlyDays, monthlyDay } = payoutConfig;

    if (archetype === 'bi-weekly') {
      let curr = parseISO(anchorDate || DEFAULT_ANCHOR_DATE);
      for (let i = 0; i < TOTAL_CYCLES; i++) {
        const absoluteSequence = i % 2 === 0 ? 'A' : 'B';
        const roadmapTransaction: RoadmapTransaction = {
          date: format(curr, 'yyyy-MM-dd'),
          key: `${format(curr, 'yyyy-MM-dd')}-${absoluteSequence}`,
          absoluteSequence,
        };
        roadmapTransactions.push(roadmapTransaction);
        curr = addDays(curr, fixedIntervalDays || DEFAULT_FIXED_INTERVAL);
      }
    } else if (archetype === 'semi-monthly') {
      let startMonth = startOfMonth(new Date());
      for (let i = 0; i < 12; i++) {
        const currMonth = addMonths(startMonth, i);
        (semiMonthlyDays || [15, 30]).forEach((day, idx) => {
          const date = setDate(currMonth, day);
          const sequence = idx === 0 ? 'A' : 'B';
          const roadmapTransaction: RoadmapTransaction = {
            date: format(date, 'yyyy-MM-dd'),
            key: `${format(date, 'yyyy-MM-dd')}-${sequence}`,
            absoluteSequence: sequence,
          };
          roadmapTransactions.push(roadmapTransaction);
        });
      }
    } else if (archetype === 'monthly') {
      let startMonth = startOfMonth(new Date());
      for (let i = 0; i < 12; i++) {
        const currMonth = addMonths(startMonth, i);
        const date = setDate(currMonth, monthlyDay || 1);
        const roadmapTransaction: RoadmapTransaction = {
          date: format(date, 'yyyy-MM-dd'),
          key: `${format(date, 'yyyy-MM-dd')}-A`,
          absoluteSequence: 'A',
        };
        roadmapTransactions.push(roadmapTransaction);
      }
    }

    return roadmapTransactions;
  }, [payoutConfig]);

  const groupedCycleOptions: GroupedRoadmapTransactions = useMemo(() => {
    const filtered = masterCycles.filter((c) => {
      const d = parseISO(c.date);
      if (mode === 'all') return true;
      if (mode === 'year') return d.getFullYear() === year;
      if (mode === 'month') return d.getFullYear() === year && d.getMonth() === month;
      return true;
    });
    const groups: GroupedRoadmapTransactions = {};

    filtered.forEach((c) => {
      const dateObj = parseISO(c.date);
      const monthLabel = format(dateObj, 'MMMM yyyy');
      if (!groups[monthLabel]) groups[monthLabel] = [];
      const cycleIndexInMonth = groups[monthLabel].length;
      const relativeLabel = String.fromCharCode(65 + cycleIndexInMonth);
      const labeledRoadmapTransaction: LabeledRoadmapTransaction = {
        ...c,
        display: `Cycle ${relativeLabel}`,
        dateLabel: format(dateObj, 'MM/dd'),
      };
      groups[monthLabel].push(labeledRoadmapTransaction);
    });

    return groups;
  }, [mode, year, month, masterCycles]);

  const roadmapData: RoadmapData = useMemo(() => {
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
    const roadmap: RoadmapCycle[] = flatOptions.map((opt, index, arr) => {
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
      const unpaidInCycle = estimatedExpenses - actualExpenses;
      const prevActual = cumActualSaved - netFlowActual;

      const nextCycleDate = arr[index + 1]?.date;
      const cycleStatus: CycleStatus = getCycleStatus(opt.date, nextCycleDate);

      const cycleHeaders: CycleHeaders = {
        INFLOW: projectedIncome,
        PLANNED: estimatedExpenses,
        CLEARED: actualExpenses,
        MARGIN: netFlowProjected,
        SURPLUS: netFlowActual,
        NET_ACTUAL: cumActualSaved,
        NET_PROJECTED: cumEstSaved,
        REALITY_CHECK: realityCheck,
        IS_FORECASTING: isForecasting,
        CYCLE_BURN_RATE: burnRateSoFar,
        LIQUIDITY_RUNWAY: liquidityRunway,
        PROJECTED_LIQUIDITY_RUNWAY: projectedLiquidityRunway,
        PROJECTED_CHECK: projectedCheck,
        IS_PROJECTED_FORECASTING: isProjectedForecasting,
        UNPAID_IN_CYCLE: unpaidInCycle,
        PREV_ACTUAL: prevActual,
        PREV_PROJECTED: prevProjected,
        CYCLE_STATUS: cycleStatus,
      };

      return {
        ...opt,
        txs: cycleTxs,
        headers: cycleHeaders,
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
      const unpaidPlanned = Math.max(0, cycle.headers.UNPAID_IN_CYCLE);

      const currentD = parseISO(cycle.date);
      const nextD = futureCycles[i + 1]
        ? parseISO(futureCycles[i + 1].date)
        : addDays(currentD, payoutConfig.fixedIntervalDays || 15);

      // FIX: For the first cycle, count from 'now', not from the cycle start date
      const startPoint = i === 0 ? now : currentD;
      const daysInPeriod = Math.max(0, differenceInDays(nextD, startPoint));

      if (remainingRealCash >= unpaidPlanned) {
        remainingRealCash -= unpaidPlanned;
        bDays += daysInPeriod;
      } else {
        const ratio = unpaidPlanned > 0 ? remainingRealCash / unpaidPlanned : 1;
        bDays += Math.floor(ratio * daysInPeriod);
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
