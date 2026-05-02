// @vitest-environment jsdom
import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// dnd-kit reads ResizeObserver at import time, so stub it before the component is loaded.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import SortableTransactionRow from '../src/components/roadmap/TransactionList/SortableTransactionRow';
import type { Account, Transaction } from '../src/types';

const tx = (p: Partial<Transaction>): Transaction => ({
  id: p.id ?? 'tx1',
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

const accounts: Account[] = [
  { id: 'a1', name: 'Bank', color: '#000', startingBalance: 0, balance: 1000 },
  { id: 'a2', name: 'Wallet', color: '#111', startingBalance: 0, balance: 500 },
];

const renderRow = (
  transaction: Transaction,
  callbacks: {
    onEdit?: (id: string) => void;
    toggleExecution?: (id: string) => void;
    onDeleteRequest?: React.Dispatch<React.SetStateAction<Transaction | null>>;
    isHighlighted?: boolean;
  } = {},
) => {
  return render(
    <DndContext>
      <SortableContext items={[transaction.id]}>
        <SortableTransactionRow
          tx={transaction}
          onEdit={callbacks.onEdit ?? vi.fn()}
          toggleExecution={callbacks.toggleExecution ?? vi.fn()}
          getFullTypeName={(id) => (id === 't4' ? 'Expense - Housing' : 't')}
          checkIsIncome={(id) => id === 't1'}
          checkIsTransfer={(id) => id === 'tr'}
          isHighlighted={callbacks.isHighlighted ?? false}
          onDeleteRequest={callbacks.onDeleteRequest ?? vi.fn()}
          computedAccounts={accounts}
        />
      </SortableContext>
    </DndContext>,
  );
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SortableTransactionRow', () => {
  test('given the toggle button is clicked, then toggleExecution is called with the transaction id', () => {
    const toggleExecution = vi.fn();
    renderRow(tx({ id: 'tx-abc', isPaid: false }), { toggleExecution });
    const buttons = screen.getAllByRole('button');
    // toggle button is the second (after the drag handle)
    fireEvent.click(buttons[1]);
    expect(toggleExecution).toHaveBeenCalledWith('tx-abc');
  });

  test('given the trash button is clicked, then onDeleteRequest is called with the full transaction object', () => {
    const onDeleteRequest = vi.fn();
    const t = tx({ id: 'tx-xyz' });
    renderRow(t, { onDeleteRequest });
    const buttons = screen.getAllByRole('button');
    // trash is the last button
    fireEvent.click(buttons[buttons.length - 1]);
    expect(onDeleteRequest).toHaveBeenCalledWith(t);
  });

  test('given the row body (name) is clicked, then onEdit is called with the id', () => {
    const onEdit = vi.fn();
    renderRow(tx({ id: 'tx-1', name: 'Rent' }), { onEdit });
    fireEvent.click(screen.getByText('Rent'));
    expect(onEdit).toHaveBeenCalledWith('tx-1');
  });

  test('given the trash button is clicked, then onEdit is NOT also triggered (event propagation stopped)', () => {
    const onEdit = vi.fn();
    const onDeleteRequest = vi.fn();
    renderRow(tx({ id: 'tx-1' }), { onEdit, onDeleteRequest });
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);
    expect(onDeleteRequest).toHaveBeenCalled();
    expect(onEdit).not.toHaveBeenCalled();
  });

  test('given a paid transaction, then the row shows the destination account name for transfers', () => {
    renderRow(
      tx({
        id: 'tr1',
        typeId: 'tr',
        accountId: 'a1',
        toAccountId: 'a2',
        isPaid: true,
      }),
    );
    expect(screen.getByText(/Bank.*Wallet/)).toBeTruthy();
  });
});
