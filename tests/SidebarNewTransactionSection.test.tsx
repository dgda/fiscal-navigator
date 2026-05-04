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

const createTransactions = vi.fn();
const replaceTransactions = vi.fn();
const requestReconcile = vi.fn();
const onCommitSuccess = vi.fn();
const checkIsTransfer = vi.fn(() => false);
const checkIsIncome = vi.fn(() => false);

let mockTreasury: {
  data: TreasuryData;
  createTransactions: typeof createTransactions;
  replaceTransactions: typeof replaceTransactions;
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
    createTransactions,
    replaceTransactions,
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
  createTransactions.mockClear();
  replaceTransactions.mockClear();
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
  test('given a non-recurring expense with sufficient projected balance, when submitted, then createTransactions is called with the new batch (no full-DB replace)', () => {
    render(<SidebarNewTransactionSection {...baseProps} onCommitSuccess={onCommitSuccess} />);
    fillCommonFields();
    submit();
    expect(requestReconcile).not.toHaveBeenCalled();
    expect(createTransactions).toHaveBeenCalledTimes(1);
    expect(replaceTransactions).not.toHaveBeenCalled();
    const batch = createTransactions.mock.calls[0][0] as Transaction[];
    expect(batch).toHaveLength(1);
    expect(batch[0]).toMatchObject({
      name: 'Rent',
      amount: 5000,
      typeId: 't4',
      accountId: 'a1',
      cycleKey: '2026-01-02-A',
      isRecurring: false,
    });
  });

  test('given an expense exceeding projected balance, when submitted, then requestReconcile is called and append is deferred; on success replaceTransactions is called', () => {
    render(<SidebarNewTransactionSection {...baseProps} onCommitSuccess={onCommitSuccess} />);
    fillCommonFields();
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '200000' } });
    submit();
    expect(requestReconcile).toHaveBeenCalledTimes(1);
    expect(createTransactions).not.toHaveBeenCalled();
    expect(replaceTransactions).not.toHaveBeenCalled();

    const onSuccess = requestReconcile.mock.calls[0][2];
    const reconciledTxs = [{ id: 'pre-existing', name: 'adjusted' } as unknown as Transaction];
    onSuccess({}, reconciledTxs);
    expect(replaceTransactions).toHaveBeenCalledTimes(1);
    const replaced = replaceTransactions.mock.calls[0][0] as Transaction[];
    expect(replaced[0]).toEqual({ id: 'pre-existing', name: 'adjusted' });
    expect(replaced[1]).toMatchObject({ name: 'Rent', amount: 200000 });
  });

  test('given an income tx that would push projected negative, when submitted, then createTransactions proceeds without reconciliation (income skips guard)', () => {
    checkIsIncome.mockReturnValue(true);
    render(<SidebarNewTransactionSection {...baseProps} onCommitSuccess={onCommitSuccess} />);
    fillCommonFields();
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '200000' } });
    submit();
    expect(requestReconcile).not.toHaveBeenCalled();
    expect(createTransactions).toHaveBeenCalledTimes(1);
  });

  test('given a fee amount > 0, when submitted, then the batch passed to createTransactions includes a paired Fee transaction with the Expense type', () => {
    render(<SidebarNewTransactionSection {...baseProps} onCommitSuccess={onCommitSuccess} />);
    fillCommonFields();
    fireEvent.change(screen.getByPlaceholderText('Fee'), { target: { value: '50' } });
    submit();
    const batch = createTransactions.mock.calls[0][0] as Transaction[];
    expect(batch).toHaveLength(2);
    expect(batch[1]).toMatchObject({
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
});
