// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { FilterMode, useRoadmap } from '../src/hooks/useRoadmap';
import type { TreasuryData, Transaction } from '../src/types';

let mockTreasury = makeTreasury();

vi.mock('../src/context/TreasuryContext', () => ({
  useTreasury: () => mockTreasury,
}));

function makeTreasury(overrides?: Partial<{ data: TreasuryData; totalLiquidity: number }>) {
  const data: TreasuryData = {
    accounts: [{ id: 'a1', name: 'Bank', color: '#000', startingBalance: 0 }],
    types: [
      { id: 't1', name: 'Income', parent_type: null },
      { id: 't2', name: 'Expense', parent_type: null },
      { id: 't3', name: 'Salary', parent_type: 't1' },
      { id: 't4', name: 'Housing', parent_type: 't2' },
      { id: 't7', name: 'Transfer', parent_type: null },
    ],
    transactions: [],
    baseSalary: 70000,
    preferences: { theme: 'light', useSystemDefault: true, currency: 'PHP' },
    payoutConfig: {
      archetype: 'bi-weekly',
      fixedIntervalDays: 14,
      anchorDate: '2026-01-02',
      semiMonthlyDays: [15, 30],
      monthlyDay: 1,
    },
  version: 0,
  };
  return {
    data: overrides?.data ?? data,
    totalLiquidity: overrides?.totalLiquidity ?? 100000,
  };
}

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: partial.id ?? 'tx',
    name: partial.name ?? 'tx',
    amount: partial.amount ?? 0,
    typeId: partial.typeId ?? 't4',
    accountId: partial.accountId ?? 'a1',
    date: partial.date ?? '2026-01-02',
    cycleKey: partial.cycleKey ?? '2026-01-02-A',
    isPlanned: partial.isPlanned ?? true,
    isPaid: partial.isPaid ?? false,
    isRecurring: partial.isRecurring ?? false,
    history: partial.history ?? [],
    created_at: partial.created_at ?? '2026-01-01T00:00:00Z',
    updated_at: partial.updated_at ?? '2026-01-01T00:00:00Z',
    ...partial,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
  mockTreasury = makeTreasury();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useRoadmap masterCycles — bi-weekly archetype', () => {
  test('given bi-weekly archetype, then generates 52 cycles spaced fixedIntervalDays apart starting at anchorDate', () => {
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.ALL, year: 2026, month: 0 }),
    );
    expect(result.current.masterCycles).toHaveLength(52);
    expect(result.current.masterCycles[0].date).toBe('2026-01-02');
    expect(result.current.masterCycles[1].date).toBe('2026-01-16');
    expect(result.current.masterCycles[2].date).toBe('2026-01-30');
  });

  test('given bi-weekly archetype, then absoluteSequence alternates A/B starting with A', () => {
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.ALL, year: 2026, month: 0 }),
    );
    expect(result.current.masterCycles[0].absoluteSequence).toBe('A');
    expect(result.current.masterCycles[1].absoluteSequence).toBe('B');
    expect(result.current.masterCycles[2].absoluteSequence).toBe('A');
  });

  test('given bi-weekly archetype, then key is date + sequence (e.g., 2026-01-02-A)', () => {
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.ALL, year: 2026, month: 0 }),
    );
    expect(result.current.masterCycles[0].key).toBe('2026-01-02-A');
    expect(result.current.masterCycles[1].key).toBe('2026-01-16-B');
  });

  test('given anchorDate is empty, then falls back to DEFAULT_ANCHOR_DATE (2026-02-06)', () => {
    mockTreasury = makeTreasury({
      data: {
        ...makeTreasury().data,
        payoutConfig: {
          archetype: 'bi-weekly',
          fixedIntervalDays: 14,
          anchorDate: '',
          semiMonthlyDays: [15, 30],
          monthlyDay: 1,
        },
      version: 0,
      },
    });
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.ALL, year: 2026, month: 0 }),
    );
    expect(result.current.masterCycles[0].date).toBe('2026-02-06');
  });
});

describe('useRoadmap masterCycles — semi-monthly archetype', () => {
  test('given semi-monthly archetype with default semiMonthlyDays, then generates 24 cycles (2 per month for 12 months)', () => {
    mockTreasury = makeTreasury({
      data: {
        ...makeTreasury().data,
        payoutConfig: {
          archetype: 'semi-monthly',
          fixedIntervalDays: 14,
          anchorDate: '2026-01-02',
          semiMonthlyDays: [15, 30],
          monthlyDay: 1,
        },
      version: 0,
      },
    });
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.ALL, year: 2026, month: 0 }),
    );
    expect(result.current.masterCycles).toHaveLength(24);
  });

  test('given semi-monthly archetype, then first cycle of each month falls on the first semiMonthlyDay', () => {
    mockTreasury = makeTreasury({
      data: {
        ...makeTreasury().data,
        payoutConfig: {
          archetype: 'semi-monthly',
          fixedIntervalDays: 14,
          anchorDate: '2026-01-02',
          semiMonthlyDays: [15, 30],
          monthlyDay: 1,
        },
      version: 0,
      },
    });
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.ALL, year: 2026, month: 0 }),
    );
    expect(result.current.masterCycles[0].date).toBe('2026-01-15');
    expect(result.current.masterCycles[2].date).toBe('2026-02-15');
  });
});

describe('useRoadmap masterCycles — monthly archetype', () => {
  test('given monthly archetype with monthlyDay=1, then generates 12 cycles, all on the 1st', () => {
    mockTreasury = makeTreasury({
      data: {
        ...makeTreasury().data,
        payoutConfig: {
          archetype: 'monthly',
          fixedIntervalDays: 14,
          anchorDate: '2026-01-02',
          semiMonthlyDays: [15, 30],
          monthlyDay: 1,
        },
      version: 0,
      },
    });
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.ALL, year: 2026, month: 0 }),
    );
    expect(result.current.masterCycles).toHaveLength(12);
    expect(result.current.masterCycles[0].date).toBe('2026-01-01');
    expect(result.current.masterCycles[1].date).toBe('2026-02-01');
  });
});

describe('useRoadmap groupedCycleOptions filtering', () => {
  test('given mode=ALL, then includes every master cycle', () => {
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.ALL, year: 2026, month: 0 }),
    );
    const flat = Object.values(result.current.groupedCycleOptions).flat();
    expect(flat).toHaveLength(52);
  });

  test('given mode=YEAR, then only cycles in the requested year are included', () => {
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.YEAR, year: 2026, month: 0 }),
    );
    const flat = Object.values(result.current.groupedCycleOptions).flat();
    expect(flat.every((c) => c.date.startsWith('2026'))).toBe(true);
  });

  test('given mode=MONTH, then only cycles in the requested year+month are included', () => {
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.MONTH, year: 2026, month: 0 }),
    );
    const flat = Object.values(result.current.groupedCycleOptions).flat();
    expect(flat.every((c) => c.date.startsWith('2026-01'))).toBe(true);
  });

  test('given grouped options, then each cycle has a relative display label (Cycle A, Cycle B)', () => {
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.MONTH, year: 2026, month: 0 }),
    );
    const flat = Object.values(result.current.groupedCycleOptions).flat();
    expect(flat[0].display).toBe('Cycle A');
    expect(flat[1].display).toBe('Cycle B');
  });

  test('given grouped options, then dateLabel is MM/dd-formatted', () => {
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.MONTH, year: 2026, month: 0 }),
    );
    const flat = Object.values(result.current.groupedCycleOptions).flat();
    expect(flat[0].dateLabel).toMatch(/^\d{2}\/\d{2}$/);
  });
});

describe('useRoadmap roadmap headers — projected and actual flows', () => {
  test('given a cycle with no transactions, then INFLOW falls back to baseSalary', () => {
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.MONTH, year: 2026, month: 0 }),
    );
    const cycleA = result.current.roadmap[0];
    expect(cycleA.headers.INFLOW).toBe(70000);
    expect(cycleA.headers.ACTUAL_INFLOW).toBe(0);
  });

  test('given an income transaction in a cycle, then it overrides baseSalary fallback in INFLOW', () => {
    mockTreasury = makeTreasury({
      data: {
        ...makeTreasury().data,
        transactions: [
          tx({
            id: 'inc',
            typeId: 't3',
            amount: 50000,
            cycleKey: '2026-01-02-A',
            isPaid: false,
          }),
        ],
      },
    });
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.MONTH, year: 2026, month: 0 }),
    );
    const cycleA = result.current.roadmap[0];
    expect(cycleA.headers.INFLOW).toBe(50000);
  });

  test('given a paid expense, then CLEARED reflects it but PLANNED includes it as well', () => {
    mockTreasury = makeTreasury({
      data: {
        ...makeTreasury().data,
        transactions: [
          tx({
            id: 'rent',
            typeId: 't4',
            amount: 20000,
            cycleKey: '2026-01-02-A',
            isPaid: true,
          }),
        ],
      },
    });
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.MONTH, year: 2026, month: 0 }),
    );
    const cycleA = result.current.roadmap[0];
    expect(cycleA.headers.PLANNED).toBe(20000);
    expect(cycleA.headers.CLEARED).toBe(20000);
  });

  test('given an unpaid expense, then PLANNED includes it but CLEARED is 0 and UNPAID_IN_CYCLE matches', () => {
    mockTreasury = makeTreasury({
      data: {
        ...makeTreasury().data,
        transactions: [
          tx({ id: 'rent', typeId: 't4', amount: 15000, cycleKey: '2026-01-02-A', isPaid: false }),
        ],
      },
    });
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.MONTH, year: 2026, month: 0 }),
    );
    const cycleA = result.current.roadmap[0];
    expect(cycleA.headers.PLANNED).toBe(15000);
    expect(cycleA.headers.CLEARED).toBe(0);
    expect(cycleA.headers.UNPAID_IN_CYCLE).toBe(15000);
  });

  test('given mixed flow, then MARGIN equals projected inflow minus planned, and SURPLUS equals actuals', () => {
    mockTreasury = makeTreasury({
      data: {
        ...makeTreasury().data,
        transactions: [
          tx({ id: 'inc', typeId: 't3', amount: 60000, cycleKey: '2026-01-02-A', isPaid: true }),
          tx({ id: 'rent', typeId: 't4', amount: 20000, cycleKey: '2026-01-02-A', isPaid: true }),
          tx({
            id: 'food',
            typeId: 't4',
            amount: 5000,
            cycleKey: '2026-01-02-A',
            isPaid: false,
          }),
        ],
      },
    });
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.MONTH, year: 2026, month: 0 }),
    );
    const cycleA = result.current.roadmap[0];
    expect(cycleA.headers.MARGIN).toBe(60000 - 25000);
    expect(cycleA.headers.SURPLUS).toBe(60000 - 20000);
  });

  test('given a CYCLE_STATUS field, then the most recent cycle relative to system time is CURRENT', () => {
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.MONTH, year: 2026, month: 0 }),
    );
    const statuses = result.current.roadmap.map((c) => c.headers.CYCLE_STATUS);
    expect(statuses).toContain('current');
  });
});

describe('useRoadmap bufferDays', () => {
  test('given totalLiquidity covers all unpaid cycles in a year, then bufferDays sums spans across remaining cycles', () => {
    mockTreasury = makeTreasury({ totalLiquidity: 1_000_000 });
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.ALL, year: 2026, month: 0 }),
    );
    expect(result.current.bufferDays).toBeGreaterThan(0);
  });

  test('given totalLiquidity is zero and the first future cycle has unpaid expenses, then bufferDays is 0', () => {
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    mockTreasury = makeTreasury({
      data: {
        ...makeTreasury().data,
        transactions: [
          tx({ id: 'rent', typeId: 't4', amount: 5000, cycleKey: '2026-01-02-A', isPaid: false }),
        ],
      },
      totalLiquidity: 0,
    });
    const { result } = renderHook(() =>
      useRoadmap({ mode: FilterMode.ALL, year: 2026, month: 0 }),
    );
    expect(result.current.bufferDays).toBe(0);
  });
});
