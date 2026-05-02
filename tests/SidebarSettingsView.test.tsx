// @vitest-environment jsdom
import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SidebarSettingsView from '../src/components/layout/Sidebar/SidebarSettingsView/SidebarSettingsView';
import type { TreasuryData } from '../src/types';

const updateBaseSalary = vi.fn();
const setActiveView = vi.fn();
let mockTreasury: { data: TreasuryData; updateBaseSalary: typeof updateBaseSalary };

vi.mock('../src/context/TreasuryContext', () => ({
  useTreasury: () => mockTreasury,
}));

const seed = (baseSalary: number): TreasuryData => ({
  accounts: [],
  types: [],
  transactions: [],
  baseSalary,
  preferences: { theme: 'light', useSystemDefault: true },
  payoutConfig: {
    archetype: 'bi-weekly',
    fixedIntervalDays: 14,
    anchorDate: '2026-02-06',
    semiMonthlyDays: [15, 30],
    monthlyDay: 1,
  },
});

beforeEach(() => {
  updateBaseSalary.mockClear();
  setActiveView.mockClear();
  mockTreasury = { data: seed(70000), updateBaseSalary };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SidebarSettingsView', () => {
  test('given the salary input is blurred with a new value, then updateBaseSalary is called with that value as a number', () => {
    render(
      <SidebarSettingsView
        setActiveView={setActiveView}
        inputGroupClass=""
        inputBaseClass=""
      />,
    );
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '90000' } });
    fireEvent.blur(input, { target: { value: '90000' } });
    expect(updateBaseSalary).toHaveBeenCalledWith(90000);
  });

  test('given an empty string is blurred, then updateBaseSalary is called with 0 (Number("") === 0)', () => {
    render(
      <SidebarSettingsView
        setActiveView={setActiveView}
        inputGroupClass=""
        inputBaseClass=""
      />,
    );
    const input = screen.getByRole('spinbutton');
    fireEvent.blur(input, { target: { value: '' } });
    expect(updateBaseSalary).toHaveBeenCalledWith(0);
  });

  test('given the "Return to Roadmap" button is clicked, then setActiveView is called with "roadmap"', () => {
    render(
      <SidebarSettingsView
        setActiveView={setActiveView}
        inputGroupClass=""
        inputBaseClass=""
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /return to roadmap/i }));
    expect(setActiveView).toHaveBeenCalledWith('roadmap');
  });
});
