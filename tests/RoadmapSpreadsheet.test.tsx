// @vitest-environment jsdom
import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import RoadmapSpreadsheet from '../src/components/roadmap/RoadmapSpreadsheet';
import { FilterMode } from '../src/hooks/useRoadmap';
import type { Transaction, TreasuryData } from '../src/types';

const deleteTransaction = vi.fn();
const deleteSeries = vi.fn();
const toggleExecution = vi.fn();
let mockTreasury: {
  deleteTransaction: typeof deleteTransaction;
  deleteSeries: typeof deleteSeries;
  toggleExecution: typeof toggleExecution;
  data: TreasuryData;
  getFullTypeName: (id: string) => string;
  checkIsIncome: (id: string) => boolean;
  checkIsTransfer: (id: string) => boolean;
  computedAccounts: TreasuryData['accounts'];
};

vi.mock('../src/context/TreasuryContext', () => ({
  useTreasury: () => mockTreasury,
}));

const seedTx = (p: Partial<Transaction>): Transaction => ({
  id: p.id ?? 'tx-1',
  name: p.name ?? 'Rent',
  amount: p.amount ?? 1000,
  typeId: p.typeId ?? 't4',
  accountId: p.accountId ?? 'a1',
  date: p.date ?? '2026-01-02',
  cycleKey: p.cycleKey ?? '2026-01-02-A',
  isPlanned: p.isPlanned ?? true,
  isPaid: p.isPaid ?? false,
  isRecurring: p.isRecurring ?? false,
  history: p.history ?? [],
  created_at: p.created_at ?? '2026-01-01T00:00:00Z',
  updated_at: p.updated_at ?? '2026-01-01T00:00:00Z',
  ...p,
});

vi.mock('../src/hooks/useRoadmap', async () => {
  const actual = await vi.importActual<typeof import('../src/hooks/useRoadmap')>(
    '../src/hooks/useRoadmap',
  );
  return {
    ...actual,
    useRoadmap: () => ({
      roadmap: [
        {
          date: '2026-01-02',
          key: '2026-01-02-A',
          absoluteSequence: 'A' as const,
          display: 'Cycle A',
          dateLabel: '01/02',
          txs: mockTreasury.data.transactions,
          headers: {
            INFLOW: 0,
            ACTUAL_INFLOW: 0,
            PLANNED: 0,
            CLEARED: 0,
            MARGIN: 0,
            SURPLUS: 0,
            NET_ACTUAL: 0,
            NET_PROJECTED: 0,
            REALITY_CHECK: 0,
            IS_FORECASTING: false,
            CYCLE_BURN_RATE: 0,
            LIQUIDITY_RUNWAY: 0,
            PROJECTED_LIQUIDITY_RUNWAY: 0,
            PROJECTED_CHECK: 0,
            IS_PROJECTED_FORECASTING: false,
            UNPAID_IN_CYCLE: 0,
            PREV_ACTUAL: 0,
            PREV_PROJECTED: 0,
            CYCLE_STATUS: 'current' as const,
          },
        },
      ],
      bufferDays: 30,
      groupedCycleOptions: {
        'January 2026': [
          {
            date: '2026-01-02',
            key: '2026-01-02-A',
            absoluteSequence: 'A' as const,
            display: 'Cycle A',
            dateLabel: '01/02',
          },
        ],
      },
      masterCycles: [],
    }),
  };
});

const setupTreasury = (transactions: Transaction[]) => {
  const accounts = [{ id: 'a1', name: 'Bank', color: '#000', startingBalance: 0, balance: 0 }];
  mockTreasury = {
    deleteTransaction,
    deleteSeries,
    toggleExecution,
    data: {
      accounts,
      types: [
        { id: 't1', name: 'Income', parent_type: null },
        { id: 't4', name: 'Housing', parent_type: 't2' },
      ],
      transactions,
      baseSalary: 0,
      preferences: { theme: 'light', useSystemDefault: true, currency: 'PHP' },
      payoutConfig: {
        archetype: 'bi-weekly',
        fixedIntervalDays: 14,
        anchorDate: '2026-01-02',
        semiMonthlyDays: [15, 30],
        monthlyDay: 1,
      },
    version: 0,
    },
    getFullTypeName: (id) => (id === 't4' ? 'Housing' : id),
    checkIsIncome: () => false,
    checkIsTransfer: () => false,
    computedAccounts: accounts,
  };
};

const openDeleteModalFor = (txId: string) => {
  const row = document.getElementById(`tx-row-${txId}`);
  if (!row) throw new Error(`row tx-row-${txId} not in DOM`);
  const buttons = within(row).getAllByRole('button');
  // trash is the last button on the row
  fireEvent.click(buttons[buttons.length - 1]);
};

beforeEach(() => {
  deleteTransaction.mockClear();
  deleteSeries.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('RoadmapSpreadsheet', () => {
  test('given a single (non-recurring) tx delete is confirmed, then deleteTransaction is called with that tx id', () => {
    setupTreasury([seedTx({ id: 'tx-1' }), seedTx({ id: 'tx-2' })]);
    render(
      <RoadmapSpreadsheet
        filter={{ mode: FilterMode.MONTH, year: 2026, month: 0 }}
        onEdit={vi.fn()}
        highlightId={null}
        onHighlightComplete={vi.fn()}
      />,
    );
    openDeleteModalFor('tx-1');
    fireEvent.click(screen.getByRole('button', { name: /delete occurrence/i }));
    expect(deleteTransaction).toHaveBeenCalledWith('tx-1');
    expect(deleteSeries).not.toHaveBeenCalled();
  });

  test('given a recurring tx delete is confirmed via "Delete Series", then deleteSeries is called with the recurringGroupId', () => {
    setupTreasury([seedTx({ id: 'tx-1', recurringGroupId: 'g1' })]);
    render(
      <RoadmapSpreadsheet
        filter={{ mode: FilterMode.MONTH, year: 2026, month: 0 }}
        onEdit={vi.fn()}
        highlightId={null}
        onHighlightComplete={vi.fn()}
      />,
    );
    openDeleteModalFor('tx-1');
    fireEvent.click(screen.getByRole('button', { name: /delete series/i }));
    expect(deleteSeries).toHaveBeenCalledWith('g1');
    expect(deleteTransaction).not.toHaveBeenCalled();
  });

  test('given a recurring tx delete is confirmed via "Delete Occurrence", then deleteTransaction is called (single mode preferred over series)', () => {
    setupTreasury([
      seedTx({ id: 'tx-1', recurringGroupId: 'g1' }),
      seedTx({ id: 'tx-2', recurringGroupId: 'g1' }),
    ]);
    render(
      <RoadmapSpreadsheet
        filter={{ mode: FilterMode.MONTH, year: 2026, month: 0 }}
        onEdit={vi.fn()}
        highlightId={null}
        onHighlightComplete={vi.fn()}
      />,
    );
    openDeleteModalFor('tx-1');
    fireEvent.click(screen.getByRole('button', { name: /delete occurrence/i }));
    expect(deleteTransaction).toHaveBeenCalledWith('tx-1');
    expect(deleteSeries).not.toHaveBeenCalled();
  });

  test('given a delete is cancelled, then no db calls happen', () => {
    setupTreasury([seedTx({ id: 'tx-1' })]);
    render(
      <RoadmapSpreadsheet
        filter={{ mode: FilterMode.MONTH, year: 2026, month: 0 }}
        onEdit={vi.fn()}
        highlightId={null}
        onHighlightComplete={vi.fn()}
      />,
    );
    openDeleteModalFor('tx-1');
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(deleteTransaction).not.toHaveBeenCalled();
    expect(deleteSeries).not.toHaveBeenCalled();
  });
});
