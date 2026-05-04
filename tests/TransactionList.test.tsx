// @vitest-environment jsdom
import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react';
import TransactionList from '../src/components/roadmap/TransactionList/TransactionList';
import type { Transaction, TreasuryData } from '../src/types';
import type { RoadmapCycle } from '../src/types/roadmap';

const sync = vi.fn();
const toggleExecution = vi.fn();
const setDeleteCandidate = vi.fn();
const onEdit = vi.fn();

let mockTreasury: {
  toggleExecution: typeof toggleExecution;
  sync: typeof sync;
  data: TreasuryData;
  getFullTypeName: (id: string) => string;
  checkIsIncome: (id: string) => boolean;
  checkIsTransfer: (id: string) => boolean;
  computedAccounts: TreasuryData['accounts'];
};

vi.mock('../src/context/TreasuryContext', () => ({
  useTreasury: () => mockTreasury,
}));

const tx = (p: Partial<Transaction>): Transaction => ({
  id: p.id ?? 'tx',
  name: p.name ?? 'Item',
  amount: p.amount ?? 0,
  typeId: p.typeId ?? 't4',
  accountId: p.accountId ?? 'a1',
  date: p.date ?? '2026-01-02',
  cycleKey: p.cycleKey ?? '2026-01-02-A',
  isPlanned: p.isPlanned ?? false,
  isPaid: p.isPaid ?? false,
  isRecurring: p.isRecurring ?? false,
  history: p.history ?? [],
  created_at: p.created_at ?? '2026-01-01T00:00:00Z',
  updated_at: p.updated_at ?? '2026-01-01T00:00:00Z',
  ...p,
});

const cycleData = (txs: Transaction[]): RoadmapCycle => ({
  date: '2026-01-02',
  key: '2026-01-02-A',
  absoluteSequence: 'A',
  display: 'Cycle A',
  dateLabel: '01/02',
  txs,
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
    CYCLE_STATUS: 'current',
  },
});

const setup = (transactions: Transaction[]) => {
  const accounts = [{ id: 'a1', name: 'Bank', color: '#000', startingBalance: 0, balance: 0 }];
  mockTreasury = {
    toggleExecution,
    sync,
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
    },
    getFullTypeName: (id) => (id === 't4' ? 'Housing' : id),
    checkIsIncome: () => false,
    checkIsTransfer: () => false,
    computedAccounts: accounts,
  };
};

beforeEach(() => {
  sync.mockClear();
  toggleExecution.mockClear();
  setDeleteCandidate.mockClear();
  onEdit.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const renderList = (transactions: Transaction[]) => {
  setup(transactions);
  return render(
    <TransactionList
      ref={undefined}
      cycleData={cycleData(transactions)}
      onEdit={onEdit}
      highlightId={null}
      setDeleteCandidate={setDeleteCandidate}
    />,
  );
};

describe('TransactionList', () => {
  test('given a row’s toggle button is clicked, then the context toggleExecution is called with that tx id', () => {
    renderList([tx({ id: 'tx-a' }), tx({ id: 'tx-b' })]);
    const row = document.getElementById('tx-row-tx-a')!;
    const buttons = within(row).getAllByRole('button');
    // [0] drag handle, [1] toggle, [last] trash
    fireEvent.click(buttons[1]);
    expect(toggleExecution).toHaveBeenCalledWith('tx-a');
  });

  test('given a row’s trash button is clicked, then setDeleteCandidate is called with the full tx', () => {
    const t1 = tx({ id: 'tx-a', name: 'A' });
    renderList([t1]);
    const row = document.getElementById('tx-row-tx-a')!;
    const buttons = within(row).getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);
    expect(setDeleteCandidate).toHaveBeenCalledWith(t1);
  });

  test('given the search input is filled, when debounce elapses, then non-matching transactions are filtered out of the rendered list', () => {
    renderList([tx({ id: 'tx-a', name: 'Rent' }), tx({ id: 'tx-b', name: 'Groceries' })]);
    const search = screen.getByPlaceholderText(/search cycle transactions/i);
    fireEvent.change(search, { target: { value: 'rent' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(document.getElementById('tx-row-tx-a')).not.toBeNull();
    expect(document.getElementById('tx-row-tx-b')).toBeNull();
  });

  test('given a search yields zero matches, then the empty-state message is shown and no rows render', () => {
    renderList([tx({ id: 'tx-a', name: 'Rent' })]);
    const search = screen.getByPlaceholderText(/search cycle transactions/i);
    fireEvent.change(search, { target: { value: 'zzzzz' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText(/no matching transactions/i)).toBeTruthy();
    expect(document.getElementById('tx-row-tx-a')).toBeNull();
  });

  test('given the clear-search button is clicked, then the input is emptied and all rows are rendered again', () => {
    renderList([tx({ id: 'tx-a', name: 'Rent' }), tx({ id: 'tx-b', name: 'Groceries' })]);
    const search = screen.getByPlaceholderText(/search cycle transactions/i);
    fireEvent.change(search, { target: { value: 'rent' } });
    act(() => vi.advanceTimersByTime(300));
    expect(document.getElementById('tx-row-tx-b')).toBeNull();
    // clear (X) button is now visible
    const clearButton = within(search.parentElement!).getAllByRole('button')[0];
    fireEvent.click(clearButton);
    expect(document.getElementById('tx-row-tx-a')).not.toBeNull();
    expect(document.getElementById('tx-row-tx-b')).not.toBeNull();
  });

  // Drag-and-drop reorder calls sync(data, [...otherTxs, ...arrayMove(cycleTxs, oldIdx, newIdx)]).
  // Faithfully simulating @dnd-kit pointer events under jsdom is brittle, so we don't
  // exercise the real drag here. The reorder logic is straightforward; coverage of sync
  // itself is in tests/TreasuryContext.test.tsx.
  test.skip('given a real drag-end event, then sync is called with the reordered transactions array (not exercised — see comment above)', () => {});
});
