// @vitest-environment jsdom
import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import TransactionEditModal from '../src/components/roadmap/TransactionEditModal';
import type { Transaction, TreasuryData } from '../src/types';

const commitUpdate = vi.fn();
const updateSeries = vi.fn();
const breakSeriesLink = vi.fn();
const onClose = vi.fn();
const checkIsTransferMock = vi.fn(() => false);

let mockTreasury: {
  data: TreasuryData;
  commitUpdate: typeof commitUpdate;
  updateSeries: typeof updateSeries;
  breakSeriesLink: typeof breakSeriesLink;
  getFullTypeName: (id: string) => string;
  checkIsTransfer: typeof checkIsTransferMock;
  renderTypeOptions: () => React.ReactNode;
};

vi.mock('../src/context/TreasuryContext', () => ({
  useTreasury: () => mockTreasury,
}));

vi.mock('../src/hooks/useRoadmap', () => ({
  FilterMode: { ALL: 'all', YEAR: 'year', MONTH: 'month' },
  useRoadmap: () => ({
    roadmap: [],
    bufferDays: 0,
    masterCycles: [],
    groupedCycleOptions: {
      'January 2026': [
        { date: '2026-01-02', key: '2026-01-02-A', absoluteSequence: 'A', display: 'Cycle A', dateLabel: '01/02' },
      ],
    },
  }),
}));

const tx = (p: Partial<Transaction>): Transaction => ({
  id: p.id ?? 'tx-1',
  name: p.name ?? 'Rent',
  amount: p.amount ?? 1000,
  typeId: p.typeId ?? 't4',
  accountId: p.accountId ?? 'a1',
  date: p.date ?? '2026-01-02T00:00:00.000Z',
  cycleKey: p.cycleKey ?? '2026-01-02-A',
  isPlanned: p.isPlanned ?? true,
  isPaid: p.isPaid ?? false,
  isRecurring: p.isRecurring ?? false,
  history: p.history ?? [],
  created_at: p.created_at ?? '2026-01-01T00:00:00Z',
  updated_at: p.updated_at ?? '2026-01-01T00:00:00Z',
  ...p,
});

const setupTreasury = (transactions: Transaction[]) => {
  mockTreasury = {
    data: {
      accounts: [
        { id: 'a1', name: 'Bank', color: '#000', startingBalance: 0 },
        { id: 'a2', name: 'Wallet', color: '#111', startingBalance: 0 },
      ],
      types: [
        { id: 't1', name: 'Income', parent_type: null },
        { id: 't4', name: 'Housing', parent_type: 't2' },
      ],
      transactions,
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
    commitUpdate,
    updateSeries,
    breakSeriesLink,
    getFullTypeName: (id) => (id === 't4' ? 'Expense - Housing' : id),
    checkIsTransfer: checkIsTransferMock,
    renderTypeOptions: () => <option value="t4">Housing</option>,
  };
};

beforeEach(() => {
  commitUpdate.mockClear();
  updateSeries.mockClear();
  breakSeriesLink.mockClear();
  onClose.mockClear();
  checkIsTransferMock.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TransactionEditModal', () => {
  test('given transactionId is null, then nothing is rendered (no commit pathway)', () => {
    setupTreasury([tx({ id: 'tx-1' })]);
    const { container } = render(
      <TransactionEditModal transactionId={null} onClose={onClose} />,
    );
    expect(container.textContent).toBe('');
  });

  test('given a non-recurring transaction is edited, when Save is clicked, then commitUpdate is called with the updated tx', () => {
    setupTreasury([tx({ id: 'tx-1', amount: 1000 })]);
    render(<TransactionEditModal transactionId="tx-1" onClose={onClose} />);
    const amountInput = screen.getByDisplayValue('1000');
    fireEvent.change(amountInput, { target: { value: '2500' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(commitUpdate).toHaveBeenCalledWith(
      'tx-1',
      expect.objectContaining({ amount: 2500 }),
      'Manual Update',
    );
    expect(updateSeries).not.toHaveBeenCalled();
  });

  test('given a recurring transaction in single mode (default), when Save is clicked, then commitUpdate (not updateSeries) is called', () => {
    setupTreasury([tx({ id: 'tx-1', recurringGroupId: 'g1' })]);
    render(<TransactionEditModal transactionId="tx-1" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(commitUpdate).toHaveBeenCalled();
    expect(updateSeries).not.toHaveBeenCalled();
  });

  test('given a recurring transaction switched to series mode, when Save is clicked, then updateSeries is called with the recurringGroupId', () => {
    setupTreasury([tx({ id: 'tx-1', recurringGroupId: 'g1' })]);
    render(<TransactionEditModal transactionId="tx-1" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /all future/i }));
    fireEvent.click(screen.getByRole('button', { name: /update series/i }));
    expect(updateSeries).toHaveBeenCalledWith(
      'g1',
      expect.objectContaining({ id: 'tx-1' }),
      'Manual Series Update',
    );
    expect(commitUpdate).not.toHaveBeenCalled();
  });

  test('given a recurring transaction, when Detach is clicked, then breakSeriesLink is called with the tx id', () => {
    setupTreasury([tx({ id: 'tx-1', recurringGroupId: 'g1' })]);
    render(<TransactionEditModal transactionId="tx-1" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /detach/i }));
    expect(breakSeriesLink).toHaveBeenCalledWith('tx-1');
  });

  test('given a non-recurring transaction, then no Detach button is rendered (recurrence panel hidden)', () => {
    setupTreasury([tx({ id: 'tx-1' })]);
    render(<TransactionEditModal transactionId="tx-1" onClose={onClose} />);
    expect(screen.queryByRole('button', { name: /detach/i })).toBeNull();
  });

  test('given Save closes the modal, then onClose is invoked after the close animation', () => {
    vi.useFakeTimers();
    try {
      setupTreasury([tx({ id: 'tx-1' })]);
      render(<TransactionEditModal transactionId="tx-1" onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
      vi.advanceTimersByTime(400);
      expect(onClose).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
