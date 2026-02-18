import { Transaction } from '.';

/**
 * Sequence based on the cycle settings by the user
 */
export type AbsoluteSequence = 'A' | 'B';

/**
 * Financial metrics calculated for each specific cycle in the roadmap
 */
export interface CycleHeaders {
  INFLOW: number;
  PLANNED: number;
  CLEARED: number;
  MARGIN: number;
  SURPLUS: number;
  NET_ACTUAL: number;
  NET_PROJECTED: number;
  REALITY_CHECK: number;
  IS_FORECASTING: boolean;
  CYCLE_BURN_RATE: number;
  LIQUIDITY_RUNWAY: number;
  PROJECTED_LIQUIDITY_RUNWAY: number;
  PROJECTED_CHECK: number;
  IS_PROJECTED_FORECASTING: boolean;
  UNPAID_IN_CYCLE: number;
  PREV_ACTUAL: number;
  PREV_PROJECTED: number;
}

/**
 * Interface on how a transaction is shown in the roadmap component
 */
export interface RoadmapTransaction {
  /** ISO 8601 formatted string (YYYY-MM-DD) */
  date: string;
  /** Identifies if this is the primary (A) or secondary (B) cycle in a period */
  absoluteSequence: AbsoluteSequence;
  /** Unique identifier combining date and sequence */
  key: string;
}

export interface LabeledRoadmapTransaction extends RoadmapTransaction {
  display: string;
  dateLabel: string;
}

/**
 * The enriched roadmap item containing the original cycle data,
 * the filtered transactions, and the calculated financial headers.
 */
export interface RoadmapCycle extends LabeledRoadmapTransaction {
  txs: Transaction[];
  headers: CycleHeaders;
}

export interface GroupedRoadmapTransactions {
  [monthLabel: string]: LabeledRoadmapTransaction[];
}

/**
 * The final structure returned by the useMemo hook
 */
export interface RoadmapData {
  roadmap: RoadmapCycle[];
  bufferDays: number;
}

export enum CycleStatus {
  PAST = 'past',
  CURRENT = 'current',
  FUTURE = 'future',
}
