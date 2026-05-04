// @vitest-environment jsdom
import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import DeleteConfirmationModal from '../src/components/panels/SettingsPanel/DeleteConfirmationModal/DeleteConfirmationModal';
import type { TreasuryData } from '../src/types';

const handleUpdate = vi.fn();
const setDeleteCandidate = vi.fn();
let mockTreasury: { data: TreasuryData };

vi.mock('../src/context/TreasuryContext', () => ({
  useTreasury: () => mockTreasury,
}));

const baseData: TreasuryData = {
  accounts: [
    { id: 'a1', name: 'Bank', color: '#000', startingBalance: 0 },
    { id: 'a2', name: 'Wallet', color: '#111', startingBalance: 0 },
  ],
  types: [
    { id: 't1', name: 'Income', parent_type: null },
    { id: 't2', name: 'Expense', parent_type: null },
  ],
  transactions: [],
  baseSalary: 0,
  preferences: { theme: 'light', useSystemDefault: true, currency: 'PHP' },
  payoutConfig: {
    archetype: 'bi-weekly',
    fixedIntervalDays: 14,
    anchorDate: '2026-01-02',
    semiMonthlyDays: [15, 30],
    monthlyDay: 1,
  },
};

beforeEach(() => {
  handleUpdate.mockClear();
  setDeleteCandidate.mockClear();
  mockTreasury = { data: baseData };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DeleteConfirmationModal', () => {
  test('given no deleteCandidate, then nothing is rendered', () => {
    render(
      <DeleteConfirmationModal
        deleteCandidate={null}
        setDeleteCandidate={setDeleteCandidate}
        handleUpdate={handleUpdate}
      />,
    );
    expect(screen.queryByText(/Confirm Deletion/i)).toBeNull();
  });

  test('given an account candidate, when delete is confirmed, then handleUpdate is called with that account filtered out', () => {
    render(
      <DeleteConfirmationModal
        deleteCandidate={{ type: 'account', item: baseData.accounts[0] }}
        setDeleteCandidate={setDeleteCandidate}
        handleUpdate={handleUpdate}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));
    const arg = handleUpdate.mock.calls[0][0] as TreasuryData;
    expect(arg.accounts.map((a) => a.id)).toEqual(['a2']);
    expect(arg.types).toEqual(baseData.types);
  });

  test('given an account candidate, when delete is confirmed, then setDeleteCandidate(null) is called to dismiss', () => {
    render(
      <DeleteConfirmationModal
        deleteCandidate={{ type: 'account', item: baseData.accounts[0] }}
        setDeleteCandidate={setDeleteCandidate}
        handleUpdate={handleUpdate}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));
    expect(setDeleteCandidate).toHaveBeenCalledWith(null);
  });

  test('given a taxonomy candidate, when delete is confirmed, then handleUpdate filters the type out and accounts are preserved', () => {
    render(
      <DeleteConfirmationModal
        deleteCandidate={{ type: 'taxonomy', item: baseData.types[1] }}
        setDeleteCandidate={setDeleteCandidate}
        handleUpdate={handleUpdate}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /delete category/i }));
    const arg = handleUpdate.mock.calls[0][0] as TreasuryData;
    expect(arg.types.map((t) => t.id)).toEqual(['t1']);
    expect(arg.accounts).toEqual(baseData.accounts);
  });

  test('given the cancel button is clicked, then setDeleteCandidate(null) is called and handleUpdate is NOT', () => {
    render(
      <DeleteConfirmationModal
        deleteCandidate={{ type: 'account', item: baseData.accounts[0] }}
        setDeleteCandidate={setDeleteCandidate}
        handleUpdate={handleUpdate}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(setDeleteCandidate).toHaveBeenCalledWith(null);
    expect(handleUpdate).not.toHaveBeenCalled();
  });

  test('given the backdrop is clicked, then setDeleteCandidate(null) is called and handleUpdate is NOT', () => {
    const { container } = render(
      <DeleteConfirmationModal
        deleteCandidate={{ type: 'account', item: baseData.accounts[0] }}
        setDeleteCandidate={setDeleteCandidate}
        handleUpdate={handleUpdate}
      />,
    );
    const backdrop = container.querySelector('.fixed.inset-0');
    fireEvent.click(backdrop!);
    expect(setDeleteCandidate).toHaveBeenCalledWith(null);
    expect(handleUpdate).not.toHaveBeenCalled();
  });
});
