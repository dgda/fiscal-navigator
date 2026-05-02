// @vitest-environment jsdom
import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SidebarNewTransactionSection from '../src/components/layout/Sidebar/SidebarRoadmapView/SidebarNewTransactionSection/SidebarNewTransactionSection';
import { FilterMode } from '../src/hooks/useRoadmap';
import type { Transaction, TreasuryData } from '../src/types';

vi.mock('uuid', () => {
  let n = 0;
  return { v4: () => `uuid-${++n}` };
});

const sync = vi.fn();
const requestReconcile = vi.fn();
const onCommitSuccess = vi.fn();
const checkIsTransfer = vi.fn(() => false);
const checkIsIncome = vi.fn(() => false);

let mockTreasury: {
  data: TreasuryData;
  sync: typeof sync;
  checkIsTransfer: typeof checkIsTransfer;
  checkIsIncome: typeof checkIsIncome;
  computedAccounts: TreasuryData['accounts'];
  renderTypeOptions: () => React.ReactNode;
  requestReconcile: typeof requestReconcile;
};

vi.mock('../src/context/TreasuryContext', () => ({
  useTreasury: () => mockTreasury,
}));

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
          txs: [],
          headers: {
            INFLOW: 0,
            ACTUAL_INFLOW: 0,
            PLANNED: 0,
            CLEARED: 0,
            MARGIN: 0,
            SURPLUS: 0,
            NET_ACTUAL: 0,
            NET_PROJECTED: 100000,
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
      masterCycles: [
        { date: '2026-01-02', key: '2026-01-02-A', absoluteSequence: 'A' as const },
      ],
    }),
  };
});

const setup = (overrides: { transactions?: Transaction[] } = {}) => {
  const accounts = [
    { id: 'a1', name: 'Bank', color: '#000', startingBalance: 0, balance: 0 },
    { id: 'a2', name: 'Wallet', color: '#111', startingBalance: 0, balance: 0 },
  ];
  mockTreasury = {
    data: {
      accounts,
      types: [
        { id: 't1', name: 'Income', parent_type: null },
        { id: 't2', name: 'Expense', parent_type: null },
        { id: 't4', name: 'Housing', parent_type: 't2' },
      ],
      transactions: overrides.transactions ?? [],
      baseSalary: 0,
      preferences: { theme: 'light', useSystemDefault: true },
      payoutConfig: {
        archetype: 'bi-weekly',
        fixedIntervalDays: 14,
        anchorDate: '2026-01-02',
        semiMonthlyDays: [15, 30],
        monthlyDay: 1,
      },
    },
    sync,
    checkIsTransfer,
    checkIsIncome,
    computedAccounts: accounts,
    renderTypeOptions: () => <option value="t4">Housing</option>,
    requestReconcile,
  };
};

const fillCommonFields = () => {
  fireEvent.change(screen.getByPlaceholderText('Transaction Name'), {
    target: { value: 'Rent' },
  });
  const dateInput = document.querySelector('input[name="transactionDate"]') as HTMLInputElement;
  fireEvent.change(dateInput, { target: { value: '2026-01-02' } });
  fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '5000' } });
  // typeId
  const typeSelect = document.querySelector('select[name="typeId"]') as HTMLSelectElement;
  fireEvent.change(typeSelect, { target: { value: 't4' } });
  // accountId
  const accountSelect = document.querySelector('select[name="accountId"]') as HTMLSelectElement;
  fireEvent.change(accountSelect, { target: { value: 'a1' } });
};

const submit = () => {
  const form = document.querySelector('form');
  if (!form) throw new Error('form not in DOM');
  fireEvent.submit(form);
};

beforeEach(() => {
  sync.mockClear();
  requestReconcile.mockClear();
  onCommitSuccess.mockClear();
  checkIsIncome.mockClear();
  checkIsTransfer.mockClear();
  checkIsIncome.mockReturnValue(false);
  checkIsTransfer.mockReturnValue(false);
  setup();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const baseProps = {
  inputBaseClass: '',
  inputGroupClass: '',
  filterMode: FilterMode.ALL,
  filterYear: 2026,
  filterMonth: 0,
  selectChevron: <span />,
};

describe('SidebarNewTransactionSection', () => {
  test('given a non-recurring expense with sufficient projected balance, when submitted, then sync is called with one new tx appended', () => {
    render(<SidebarNewTransactionSection {...baseProps} onCommitSuccess={onCommitSuccess} />);
    fillCommonFields();
    submit();
    expect(requestReconcile).not.toHaveBeenCalled();
    expect(sync).toHaveBeenCalledTimes(1);
    const synced = sync.mock.calls[0][0] as TreasuryData;
    expect(synced.transactions).toHaveLength(1);
    expect(synced.transactions[0]).toMatchObject({
      name: 'Rent',
      amount: 5000,
      typeId: 't4',
      accountId: 'a1',
      cycleKey: '2026-01-02-A',
      isRecurring: false,
    });
  });

  test('given an expense exceeding projected balance, when submitted, then requestReconcile is called and sync is deferred until reconciliation succeeds', () => {
    render(<SidebarNewTransactionSection {...baseProps} onCommitSuccess={onCommitSuccess} />);
    fillCommonFields();
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '200000' } });
    submit();
    expect(requestReconcile).toHaveBeenCalledTimes(1);
    expect(sync).not.toHaveBeenCalled();

    // simulate reconciliation success
    const onSuccess = requestReconcile.mock.calls[0][2];
    const reconciledTxs = [
      { id: 'pre-existing', name: 'adjusted' } as unknown as Transaction,
    ];
    onSuccess({}, reconciledTxs);
    expect(sync).toHaveBeenCalledTimes(1);
    const synced = sync.mock.calls[0][0] as TreasuryData;
    expect(synced.transactions[0]).toEqual({ id: 'pre-existing', name: 'adjusted' });
    expect(synced.transactions[1]).toMatchObject({ name: 'Rent', amount: 200000 });
  });

  test('given an income tx that would push projected negative, when submitted, then sync proceeds without reconciliation (income skips guard)', () => {
    checkIsIncome.mockReturnValue(true);
    render(<SidebarNewTransactionSection {...baseProps} onCommitSuccess={onCommitSuccess} />);
    fillCommonFields();
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '200000' } });
    submit();
    expect(requestReconcile).not.toHaveBeenCalled();
    expect(sync).toHaveBeenCalledTimes(1);
  });

  test('given a fee amount > 0, when submitted, then sync includes a paired Fee transaction with the Expense type', () => {
    render(<SidebarNewTransactionSection {...baseProps} onCommitSuccess={onCommitSuccess} />);
    fillCommonFields();
    fireEvent.change(screen.getByPlaceholderText('Fee'), { target: { value: '50' } });
    submit();
    const synced = sync.mock.calls[0][0] as TreasuryData;
    expect(synced.transactions).toHaveLength(2);
    expect(synced.transactions[1]).toMatchObject({
      name: 'Fee: Rent',
      amount: 50,
      typeId: 't2',
    });
  });

  test('given a successful commit, then onCommitSuccess is called with the primary transaction id', () => {
    render(<SidebarNewTransactionSection {...baseProps} onCommitSuccess={onCommitSuccess} />);
    fillCommonFields();
    submit();
    expect(onCommitSuccess).toHaveBeenCalledTimes(1);
    const id = onCommitSuccess.mock.calls[0][0];
    expect(typeof id).toBe('string');
    expect(id.startsWith('uuid-')).toBe(true);
  });

  test('given pre-existing transactions in data, when submitted, then sync preserves them and appends the new tx after', () => {
    const existing: Transaction = {
      id: 'old',
      name: 'Old Tx',
      amount: 1,
      typeId: 't4',
      accountId: 'a1',
      date: '2025-12-01',
      cycleKey: '2025-12-01-A',
      isPlanned: true,
      isPaid: false,
      isRecurring: false,
      history: [],
      created_at: '2025-12-01T00:00:00Z',
      updated_at: '2025-12-01T00:00:00Z',
    };
    setup({ transactions: [existing] });
    render(<SidebarNewTransactionSection {...baseProps} onCommitSuccess={onCommitSuccess} />);
    fillCommonFields();
    submit();
    const synced = sync.mock.calls[0][0] as TreasuryData;
    expect(synced.transactions[0]).toEqual(existing);
    expect(synced.transactions[1].name).toBe('Rent');
  });
});
