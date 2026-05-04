// @vitest-environment jsdom
import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import PayoutSection from '../src/components/panels/SettingsPanel/PayoutSection/PayoutSection';
import type { TreasuryData } from '../src/types';

const updatePayoutConfig = vi.fn();
let mockTreasury: { data: TreasuryData; updatePayoutConfig: typeof updatePayoutConfig };

vi.mock('../src/context/TreasuryContext', () => ({
  useTreasury: () => mockTreasury,
}));

const seed = (archetype: 'bi-weekly' | 'semi-monthly' | 'monthly'): TreasuryData => ({
  accounts: [],
  types: [],
  transactions: [],
  baseSalary: 0,
  preferences: { theme: 'light', useSystemDefault: true, currency: 'PHP' },
  payoutConfig: {
    archetype,
    fixedIntervalDays: 14,
    anchorDate: '2026-02-06',
    semiMonthlyDays: [15, 30],
    monthlyDay: 1,
  },
});

beforeEach(() => {
  updatePayoutConfig.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PayoutSection', () => {
  test('given archetype change, then updatePayoutConfig is called with the new archetype', () => {
    mockTreasury = { data: seed('bi-weekly'), updatePayoutConfig };
    render(<PayoutSection sectionClass="" headerClass="" />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'monthly' } });
    expect(updatePayoutConfig).toHaveBeenCalledWith({ archetype: 'monthly' });
  });

  test('given bi-weekly archetype and an anchor date change, then updatePayoutConfig is called with anchorDate', () => {
    mockTreasury = { data: seed('bi-weekly'), updatePayoutConfig };
    render(<PayoutSection sectionClass="" headerClass="" />);
    const dateInput = screen.getByDisplayValue('2026-02-06');
    fireEvent.change(dateInput, { target: { value: '2026-03-15' } });
    expect(updatePayoutConfig).toHaveBeenCalledWith({ anchorDate: '2026-03-15' });
  });

  test('given bi-weekly archetype and a fixed interval change, then updatePayoutConfig is called with fixedIntervalDays as a number', () => {
    mockTreasury = { data: seed('bi-weekly'), updatePayoutConfig };
    render(<PayoutSection sectionClass="" headerClass="" />);
    fireEvent.change(screen.getByDisplayValue('14'), { target: { value: '7' } });
    expect(updatePayoutConfig).toHaveBeenCalledWith({ fixedIntervalDays: 7 });
  });

  test('given semi-monthly archetype, then primary day input mutates only the first day in the tuple', () => {
    mockTreasury = { data: seed('semi-monthly'), updatePayoutConfig };
    render(<PayoutSection sectionClass="" headerClass="" />);
    fireEvent.change(screen.getByDisplayValue('15'), { target: { value: '10' } });
    expect(updatePayoutConfig).toHaveBeenCalledWith({ semiMonthlyDays: [10, 30] });
  });

  test('given semi-monthly archetype, then secondary day input mutates only the second day in the tuple', () => {
    mockTreasury = { data: seed('semi-monthly'), updatePayoutConfig };
    render(<PayoutSection sectionClass="" headerClass="" />);
    fireEvent.change(screen.getByDisplayValue('30'), { target: { value: '28' } });
    expect(updatePayoutConfig).toHaveBeenCalledWith({ semiMonthlyDays: [15, 28] });
  });

  test('given monthly archetype, then monthly day input updates monthlyDay as a number', () => {
    mockTreasury = { data: seed('monthly'), updatePayoutConfig };
    render(<PayoutSection sectionClass="" headerClass="" />);
    fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '15' } });
    expect(updatePayoutConfig).toHaveBeenCalledWith({ monthlyDay: 15 });
  });

  test('given bi-weekly archetype, then semi-monthly inputs are NOT rendered', () => {
    mockTreasury = { data: seed('bi-weekly'), updatePayoutConfig };
    render(<PayoutSection sectionClass="" headerClass="" />);
    expect(screen.queryByText(/Primary Day/i)).toBeNull();
    expect(screen.queryByText(/Secondary Day/i)).toBeNull();
  });

  test('given monthly archetype, then bi-weekly inputs are NOT rendered', () => {
    mockTreasury = { data: seed('monthly'), updatePayoutConfig };
    render(<PayoutSection sectionClass="" headerClass="" />);
    expect(screen.queryByText(/Anchor Date/i)).toBeNull();
    expect(screen.queryByText(/Cycle Days/i)).toBeNull();
  });
});
