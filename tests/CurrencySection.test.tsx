// @vitest-environment jsdom
import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import CurrencySection from '../src/components/panels/SettingsPanel/CurrencySection/CurrencySection';
import type { TreasuryData } from '../src/types';

const updatePreferences = vi.fn();
let mockTreasury: {
  data: TreasuryData;
  updatePreferences: typeof updatePreferences;
  currencyCode: string;
  currencySymbol: string;
};

vi.mock('../src/context/TreasuryContext', () => ({
  useTreasury: () => mockTreasury,
}));

const seed = (currency: string): TreasuryData => ({
  accounts: [],
  types: [],
  transactions: [],
  baseSalary: 0,
  preferences: { theme: 'light', useSystemDefault: true, currency },
  payoutConfig: {
    archetype: 'bi-weekly',
    fixedIntervalDays: 14,
    anchorDate: '2026-02-06',
    semiMonthlyDays: [15, 30],
    monthlyDay: 1,
  },
});

beforeEach(() => {
  updatePreferences.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CurrencySection', () => {
  test('given the dropdown is rendered, then PHP appears as the first option', () => {
    mockTreasury = {
      data: seed('PHP'),
      updatePreferences,
      currencyCode: 'PHP',
      currencySymbol: '₱',
    };
    render(<CurrencySection sectionClass="" headerClass="" />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.options[0].value).toBe('PHP');
  });

  test('given the dropdown is rendered, then non-PHP options appear sorted alphabetically by code', () => {
    mockTreasury = {
      data: seed('PHP'),
      updatePreferences,
      currencyCode: 'PHP',
      currencySymbol: '₱',
    };
    render(<CurrencySection sectionClass="" headerClass="" />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const codes = Array.from(select.options).slice(1).map((o) => o.value);
    const sorted = [...codes].sort();
    expect(codes).toEqual(sorted);
  });

  test('given a different currency is chosen, then updatePreferences is called with that currency code', () => {
    mockTreasury = {
      data: seed('PHP'),
      updatePreferences,
      currencyCode: 'PHP',
      currencySymbol: '₱',
    };
    render(<CurrencySection sectionClass="" headerClass="" />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'USD' } });
    expect(updatePreferences).toHaveBeenCalledWith({ currency: 'USD' });
  });

  test('given the same currency is re-selected, then updatePreferences is NOT called again', () => {
    mockTreasury = {
      data: seed('USD'),
      updatePreferences,
      currencyCode: 'USD',
      currencySymbol: '$',
    };
    render(<CurrencySection sectionClass="" headerClass="" />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'USD' } });
    expect(updatePreferences).not.toHaveBeenCalled();
  });

  test('given currencyCode = USD, then the preview block uses the $ symbol', () => {
    mockTreasury = {
      data: seed('USD'),
      updatePreferences,
      currencyCode: 'USD',
      currencySymbol: '$',
    };
    const { container } = render(<CurrencySection sectionClass="" headerClass="" />);
    const preview = within(container).getByText(/Sample:/i).parentElement!;
    expect(preview.textContent).toContain('$');
  });

  test('given currencyCode = PHP, then the dropdown is initialized to PHP', () => {
    mockTreasury = {
      data: seed('PHP'),
      updatePreferences,
      currencyCode: 'PHP',
      currencySymbol: '₱',
    };
    render(<CurrencySection sectionClass="" headerClass="" />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('PHP');
  });
});
