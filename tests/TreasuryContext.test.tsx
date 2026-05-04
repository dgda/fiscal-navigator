// @vitest-environment jsdom
import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { TreasuryProvider, useTreasury } from '../src/context/TreasuryContext';
import type { TreasuryData, Transaction } from '../src/types';

const baseData: TreasuryData = {
  accounts: [
    { id: 'a1', name: 'Bank', color: '#000', startingBalance: 1000 },
    { id: 'a2', name: 'Wallet', color: '#111', startingBalance: 500 },
  ],
  types: [
    { id: 't1', name: 'Income', parent_type: null },
    { id: 't2', name: 'Expense', parent_type: null },
    { id: 't3', name: 'Salary', parent_type: 't1' },
    { id: 't4', name: 'Housing', parent_type: 't2' },
    { id: 't5', name: 'Rent', parent_type: 't4' },
    { id: 't6', name: 'Transfer', parent_type: null },
  ],
  transactions: [],
  baseSalary: 70000,
  preferences: { theme: 'light', useSystemDefault: true, currency: 'PHP' },
  payoutConfig: {
    archetype: 'bi-weekly',
    fixedIntervalDays: 14,
    anchorDate: '2026-01-02',
    semiMonthlyDays: [15, 30],
    monthlyDay: 1,
  },
version: 0,
};

const tx = (p: Partial<Transaction>): Transaction => ({
  id: p.id ?? 'tx',
  name: p.name ?? 't',
  amount: p.amount ?? 0,
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

let fetchMock: ReturnType<typeof vi.fn>;
let postedBodies: unknown[];

interface CapturedRequest {
  url: string;
  method: string;
  body: unknown;
}

let capturedRequests: CapturedRequest[];

function mockFetchWith(seed: TreasuryData) {
  postedBodies = [];
  capturedRequests = [];
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method !== 'GET') {
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      capturedRequests.push({ url, method, body });
      if (method === 'POST' && url.endsWith('/api/update')) {
        postedBodies.push(body);
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    return new Response(JSON.stringify(seed), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TreasuryProvider>{children}</TreasuryProvider>
);

const renderTreasury = async (seed: TreasuryData = baseData) => {
  mockFetchWith(seed);
  const result = renderHook(() => useTreasury(), { wrapper });
  await waitFor(() => expect(result.result.current).not.toBeNull());
  return result;
};

beforeEach(() => {
  postedBodies = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('TreasuryContext initial fetch', () => {
  test('given GET /api/data returns seed data, then provider renders consumer with that data', async () => {
    const { result } = await renderTreasury();
    expect(result.current.data.baseSalary).toBe(70000);
    expect(result.current.data.accounts).toHaveLength(2);
  });

  test('given fetch is in flight, then renders the loading shell (consumer not mounted)', async () => {
    mockFetchWith(baseData);
    fetchMock.mockImplementationOnce(() => new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useTreasury(), { wrapper });
    expect(result.current).toBeNull();
  });
});

describe('TreasuryContext computed values', () => {
  test('given paid income transactions, then computedAccounts.balance includes the inflow', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      transactions: [tx({ id: 't', typeId: 't3', amount: 30000, accountId: 'a1', isPaid: true })],
    });
    expect(result.current.computedAccounts[0].balance).toBe(31000);
  });

  test('given paid expense transactions, then computedAccounts.balance subtracts the outflow', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      transactions: [tx({ id: 't', typeId: 't4', amount: 200, accountId: 'a1', isPaid: true })],
    });
    expect(result.current.computedAccounts[0].balance).toBe(800);
  });

  test('given an unpaid transaction, then it does NOT affect computedAccounts.balance', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      transactions: [tx({ id: 't', typeId: 't4', amount: 999, accountId: 'a1', isPaid: false })],
    });
    expect(result.current.computedAccounts[0].balance).toBe(1000);
  });

  test('given a transfer to another account, then the destination account.balance increases by amount', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      transactions: [
        tx({
          id: 'tr',
          typeId: 't6',
          amount: 100,
          accountId: 'a1',
          toAccountId: 'a2',
          isPaid: true,
        }),
      ],
    });
    const dest = result.current.computedAccounts.find((a) => a.id === 'a2');
    expect(dest?.balance).toBe(600);
  });

  test('given totalLiquidity, then it equals the sum of all computedAccount balances', async () => {
    const { result } = await renderTreasury();
    expect(result.current.totalLiquidity).toBe(1500);
  });
});

describe('TreasuryContext type-tree helpers', () => {
  test('given a typeId whose root is Income, then checkIsIncome returns true', async () => {
    const { result } = await renderTreasury();
    expect(result.current.checkIsIncome('t3')).toBe(true);
  });

  test('given a typeId whose root is Expense, then checkIsIncome returns false', async () => {
    const { result } = await renderTreasury();
    expect(result.current.checkIsIncome('t4')).toBe(false);
  });

  test('given a deeply-nested expense type (Rent → Housing → Expense), then checkIsIncome is false', async () => {
    const { result } = await renderTreasury();
    expect(result.current.checkIsIncome('t5')).toBe(false);
  });

  test('given the Transfer root type, then checkIsTransfer returns true', async () => {
    const { result } = await renderTreasury();
    expect(result.current.checkIsTransfer('t6')).toBe(true);
  });

  test('given a non-existent typeId, then checkIsIncome returns false instead of throwing', async () => {
    const { result } = await renderTreasury();
    expect(result.current.checkIsIncome('nonexistent')).toBe(false);
  });

  test('given a child type with a parent, then getFullTypeName returns "Parent - Child"', async () => {
    const { result } = await renderTreasury();
    expect(result.current.getFullTypeName('t3')).toBe('Income - Salary');
  });

  test('given a root-level type, then getFullTypeName returns just the name', async () => {
    const { result } = await renderTreasury();
    expect(result.current.getFullTypeName('t1')).toBe('Income');
  });
});

describe('TreasuryContext mutations — commitUpdate', () => {
  test('given commitUpdate, then it patches the named fields and appends a history entry', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      transactions: [tx({ id: 'a', name: 'old', amount: 10 })],
    });
    await act(async () => {
      result.current.commitUpdate('a', { amount: 99 }, 'edited');
    });
    const patched = result.current.data.transactions.find((t) => t.id === 'a');
    expect(patched?.amount).toBe(99);
    expect(patched?.history).toHaveLength(1);
    expect(patched?.history[0].label).toBe('edited');
  });

  test('given commitUpdate, then the history snapshot does NOT itself contain a history field (avoids unbounded nesting)', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      transactions: [tx({ id: 'a' })],
    });
    await act(async () => {
      result.current.commitUpdate('a', { amount: 1 }, 'first');
    });
    const tCur = result.current.data.transactions.find((t) => t.id === 'a');
    expect(tCur?.history[0].snapshot).not.toHaveProperty('history');
  });

  test('given commitUpdate, then a focused PATCH /api/transactions/:id is sent with { updates, msg }', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      transactions: [tx({ id: 'a', amount: 10 })],
    });
    await act(async () => {
      result.current.commitUpdate('a', { amount: 22 }, 'msg');
    });
    const req = capturedRequests.find((r) => r.url.endsWith('/api/transactions/a'));
    expect(req).toBeDefined();
    expect(req!.method).toBe('PATCH');
    expect(req!.body).toEqual({ updates: { amount: 22 }, msg: 'msg' });
  });
});

describe('TreasuryContext mutations — toggleExecution', () => {
  test('given an unpaid transaction, when toggleExecution, then isPaid becomes true and a "Marked Paid" history entry is added', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      transactions: [tx({ id: 'a', isPaid: false })],
    });
    await act(async () => {
      result.current.toggleExecution('a');
    });
    const t1 = result.current.data.transactions.find((t) => t.id === 'a');
    expect(t1?.isPaid).toBe(true);
    expect(t1?.history[0].label).toBe('Marked Paid');
  });

  test('given a paid transaction, when toggleExecution, then isPaid becomes false and history records "Marked Planned"', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      transactions: [tx({ id: 'a', isPaid: true })],
    });
    await act(async () => {
      result.current.toggleExecution('a');
    });
    const t1 = result.current.data.transactions.find((t) => t.id === 'a');
    expect(t1?.isPaid).toBe(false);
    expect(t1?.history[0].label).toBe('Marked Planned');
  });
});

describe('TreasuryContext mutations — updateSeries', () => {
  test('given updateSeries, then unpaid txs in the same recurringGroupId are patched and paid txs untouched', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      transactions: [
        tx({ id: 'a', recurringGroupId: 'g1', amount: 10, isPaid: false }),
        tx({ id: 'b', recurringGroupId: 'g1', amount: 10, isPaid: true }),
        tx({ id: 'c', recurringGroupId: 'g2', amount: 10, isPaid: false }),
      ],
    });
    await act(async () => {
      result.current.updateSeries('g1', { amount: 99 }, 'series edit');
    });
    const t = result.current.data.transactions;
    expect(t.find((x) => x.id === 'a')?.amount).toBe(99);
    expect(t.find((x) => x.id === 'b')?.amount).toBe(10);
    expect(t.find((x) => x.id === 'c')?.amount).toBe(10);
  });

  test('given updateSeries with id/date/cycleKey/created_at/history in updates, then those are stripped before applying', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      transactions: [
        tx({ id: 'a', recurringGroupId: 'g1', date: '2026-01-02', cycleKey: '2026-01-02-A' }),
      ],
    });
    await act(async () => {
      result.current.updateSeries(
        'g1',
        {
          id: 'NEW' as never,
          date: '1999-01-01',
          cycleKey: '1999-01-01-Z',
          amount: 5,
        },
        'msg',
      );
    });
    const t = result.current.data.transactions[0];
    expect(t.id).toBe('a');
    expect(t.date).toBe('2026-01-02');
    expect(t.cycleKey).toBe('2026-01-02-A');
    expect(t.amount).toBe(5);
  });
});

describe('TreasuryContext mutations — deleteSeries / breakSeriesLink', () => {
  test('given deleteSeries, then all txs sharing recurringGroupId are removed', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      transactions: [
        tx({ id: 'a', recurringGroupId: 'g1' }),
        tx({ id: 'b', recurringGroupId: 'g1' }),
        tx({ id: 'c', recurringGroupId: 'g2' }),
      ],
    });
    await act(async () => {
      result.current.deleteSeries('g1');
    });
    expect(result.current.data.transactions).toHaveLength(1);
    expect(result.current.data.transactions[0].id).toBe('c');
  });

  test('given breakSeriesLink, then the targeted tx loses its recurringGroupId, others in the group keep theirs', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      transactions: [
        tx({ id: 'a', recurringGroupId: 'g1' }),
        tx({ id: 'b', recurringGroupId: 'g1' }),
      ],
    });
    await act(async () => {
      result.current.breakSeriesLink('a');
    });
    const t = result.current.data.transactions;
    expect(t.find((x) => x.id === 'a')?.recurringGroupId).toBeUndefined();
    expect(t.find((x) => x.id === 'b')?.recurringGroupId).toBe('g1');
  });
});

describe('TreasuryContext mutations — updatePreferences / updatePayoutConfig', () => {
  test('given updatePreferences with partial fields, then existing preferences are merged (not replaced)', async () => {
    const { result } = await renderTreasury();
    await act(async () => {
      await result.current.updatePreferences({ theme: 'dark' });
    });
    expect(result.current.data.preferences).toEqual({ theme: 'dark', useSystemDefault: true, currency: 'PHP' });
  });

  test('given updatePayoutConfig with partial fields, then existing config is merged', async () => {
    const { result } = await renderTreasury();
    await act(async () => {
      await result.current.updatePayoutConfig({ archetype: 'monthly' });
    });
    expect(result.current.data.payoutConfig.archetype).toBe('monthly');
    expect(result.current.data.payoutConfig.fixedIntervalDays).toBe(14);
  });
});

describe('TreasuryContext currency', () => {
  test('given preferences.currency = PHP, then currencySymbol is ₱ and currencyCode is PHP', async () => {
    const { result } = await renderTreasury();
    expect(result.current.currencyCode).toBe('PHP');
    expect(result.current.currencySymbol).toBe('₱');
  });

  test('given preferences.currency = USD, then currencySymbol is $', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      preferences: { ...baseData.preferences, currency: 'USD' },
    });
    expect(result.current.currencyCode).toBe('USD');
    expect(result.current.currencySymbol).toBe('$');
  });

  test('given preferences.currency is missing on the wire, then defaults to PHP/₱ (no crash)', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      preferences: { theme: 'light', useSystemDefault: true } as never,
    });
    expect(result.current.currencyCode).toBe('PHP');
    expect(result.current.currencySymbol).toBe('₱');
  });

  test('given an unknown currency code, then symbol falls back to ₱', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      preferences: { ...baseData.preferences, currency: 'ZZZ' },
    });
    expect(result.current.currencyCode).toBe('ZZZ');
    expect(result.current.currencySymbol).toBe('₱');
  });

  test('given updatePreferences({ currency: "EUR" }), then currencySymbol becomes €', async () => {
    const { result } = await renderTreasury();
    await act(async () => {
      await result.current.updatePreferences({ currency: 'EUR' });
    });
    expect(result.current.currencySymbol).toBe('€');
  });
});

describe('TreasuryContext optimistic concurrency', () => {
  test('given the initial fetch returns X-Resource-Version, then mutations send that as If-Match', async () => {
    // Custom mock that returns version=42 on GET
    capturedRequests = [];
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method !== 'GET') {
        const body = init?.body ? JSON.parse(init.body as string) : undefined;
        capturedRequests.push({ url, method, body });
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'X-Resource-Version': '43' },
        });
      }
      return new Response(JSON.stringify(baseData), {
        status: 200,
        headers: { 'X-Resource-Version': '42' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = renderHook(() => useTreasury(), { wrapper });
    await waitFor(() => expect(result.result.current).not.toBeNull());

    await act(async () => {
      await result.result.current.updateBaseSalary(123);
    });

    const init = fetchMock.mock.calls.find(
      (c) => (c[1] as RequestInit | undefined)?.method === 'PATCH',
    )?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['If-Match']).toBe('42');
  });

  test('given a 409 conflict, then the client refetches and surfaces a conflict notification', async () => {
    let getCount = 0;
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'GET') {
        getCount += 1;
        return new Response(JSON.stringify({ ...baseData, baseSalary: getCount === 1 ? 70000 : 88888 }), {
          status: 200,
          headers: { 'X-Resource-Version': String(getCount) },
        });
      }
      return new Response(JSON.stringify({ error: 'version mismatch', currentVersion: 7 }), {
        status: 409,
        headers: { 'X-Resource-Version': '7' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = renderHook(() => useTreasury(), { wrapper });
    await waitFor(() => expect(result.result.current).not.toBeNull());

    await act(async () => {
      await result.result.current.updateBaseSalary(999);
    });

    expect(result.result.current.notification?.kind).toBe('conflict');
    expect(getCount).toBe(2); // initial + refetch on 409
    expect(result.result.current.data.baseSalary).toBe(88888); // refreshed value
  });

  test('given a successful response with X-Resource-Version, then subsequent mutations send the new version', async () => {
    capturedRequests = [];
    let serverVersion = 10;
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method !== 'GET') {
        const body = init?.body ? JSON.parse(init.body as string) : undefined;
        capturedRequests.push({ url, method, body });
        serverVersion += 1;
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'X-Resource-Version': String(serverVersion) },
        });
      }
      return new Response(JSON.stringify(baseData), {
        status: 200,
        headers: { 'X-Resource-Version': '10' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = renderHook(() => useTreasury(), { wrapper });
    await waitFor(() => expect(result.result.current).not.toBeNull());

    await act(async () => {
      await result.result.current.updateBaseSalary(1);
    });
    await act(async () => {
      await result.result.current.updateBaseSalary(2);
    });

    const mutations = fetchMock.mock.calls.filter(
      (c) => (c[1] as RequestInit | undefined)?.method === 'PATCH',
    );
    const firstHeaders = mutations[0][1] as RequestInit;
    const secondHeaders = mutations[1][1] as RequestInit;
    expect((firstHeaders.headers as Record<string, string>)['If-Match']).toBe('10');
    expect((secondHeaders.headers as Record<string, string>)['If-Match']).toBe('11');
  });

  test('given a network error, then an error notification is surfaced', async () => {
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'GET') {
        return new Response(JSON.stringify(baseData), {
          status: 200,
          headers: { 'X-Resource-Version': '0' },
        });
      }
      throw new Error('network down');
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = renderHook(() => useTreasury(), { wrapper });
    await waitFor(() => expect(result.result.current).not.toBeNull());

    await act(async () => {
      await result.result.current.updateBaseSalary(1);
    });

    expect(result.result.current.notification?.kind).toBe('error');
  });

  test('given dismissNotification is called, then notification clears', async () => {
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'GET') {
        return new Response(JSON.stringify(baseData), {
          status: 200,
          headers: { 'X-Resource-Version': '0' },
        });
      }
      throw new Error('boom');
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = renderHook(() => useTreasury(), { wrapper });
    await waitFor(() => expect(result.result.current).not.toBeNull());
    await act(async () => {
      await result.result.current.updateBaseSalary(1);
    });
    expect(result.result.current.notification).not.toBeNull();
    act(() => {
      result.result.current.dismissNotification();
    });
    expect(result.result.current.notification).toBeNull();
  });
});

describe('TreasuryContext modular endpoints', () => {
  test('given updatePreferences, then PATCH /api/preferences is called with the partial body', async () => {
    const { result } = await renderTreasury();
    await act(async () => {
      await result.current.updatePreferences({ theme: 'dark' });
    });
    const req = capturedRequests.find((r) => r.url.endsWith('/api/preferences'));
    expect(req).toBeDefined();
    expect(req!.method).toBe('PATCH');
    expect(req!.body).toEqual({ theme: 'dark' });
  });

  test('given updatePayoutConfig, then PATCH /api/payout-config is called with the partial body', async () => {
    const { result } = await renderTreasury();
    await act(async () => {
      await result.current.updatePayoutConfig({ archetype: 'monthly' });
    });
    const req = capturedRequests.find((r) => r.url.endsWith('/api/payout-config'));
    expect(req).toBeDefined();
    expect(req!.method).toBe('PATCH');
    expect(req!.body).toEqual({ archetype: 'monthly' });
  });

  test('given updateBaseSalary, then PATCH /api/base-salary is called with { baseSalary }', async () => {
    const { result } = await renderTreasury();
    await act(async () => {
      await result.current.updateBaseSalary(123);
    });
    const req = capturedRequests.find((r) => r.url.endsWith('/api/base-salary'));
    expect(req).toBeDefined();
    expect(req!.method).toBe('PATCH');
    expect(req!.body).toEqual({ baseSalary: 123 });
  });

  test('given updateAccounts, then PUT /api/accounts is called with { accounts }', async () => {
    const { result } = await renderTreasury();
    await act(async () => {
      await result.current.updateAccounts([
        { id: 'x', name: 'X', color: '#000', startingBalance: 0 },
      ]);
    });
    const req = capturedRequests.find((r) => r.url.endsWith('/api/accounts'));
    expect(req).toBeDefined();
    expect(req!.method).toBe('PUT');
    expect(req!.body).toEqual({
      accounts: [{ id: 'x', name: 'X', color: '#000', startingBalance: 0 }],
    });
  });

  test('given updateTypes, then PUT /api/types is called with { types }', async () => {
    const { result } = await renderTreasury();
    await act(async () => {
      await result.current.updateTypes([{ id: 'tnew', name: 'New', parent_type: null }]);
    });
    const req = capturedRequests.find((r) => r.url.endsWith('/api/types'));
    expect(req).toBeDefined();
    expect(req!.method).toBe('PUT');
    expect(req!.body).toEqual({
      types: [{ id: 'tnew', name: 'New', parent_type: null }],
    });
  });

  test('given createTransactions, then POST /api/transactions appends the batch', async () => {
    const { result } = await renderTreasury();
    const batch = [tx({ id: 'new1' }), tx({ id: 'new2' })];
    await act(async () => {
      await result.current.createTransactions(batch);
    });
    const req = capturedRequests.find(
      (r) => r.method === 'POST' && r.url.endsWith('/api/transactions'),
    );
    expect(req).toBeDefined();
    expect((req!.body as { transactions: Transaction[] }).transactions).toHaveLength(2);
    expect(result.current.data.transactions).toHaveLength(2);
  });

  test('given replaceTransactions, then PUT /api/transactions replaces the entire list', async () => {
    const { result } = await renderTreasury({ ...baseData, transactions: [tx({ id: 'old' })] });
    await act(async () => {
      await result.current.replaceTransactions([tx({ id: 'new' })]);
    });
    const req = capturedRequests.find(
      (r) => r.method === 'PUT' && r.url.endsWith('/api/transactions'),
    );
    expect(req).toBeDefined();
    expect(result.current.data.transactions.map((t) => t.id)).toEqual(['new']);
  });

  test('given deleteTransaction, then DELETE /api/transactions/:id is called and the tx is removed locally', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      transactions: [tx({ id: 'a' }), tx({ id: 'b' })],
    });
    await act(async () => {
      await result.current.deleteTransaction('a');
    });
    const req = capturedRequests.find(
      (r) => r.method === 'DELETE' && r.url.endsWith('/api/transactions/a'),
    );
    expect(req).toBeDefined();
    expect(result.current.data.transactions.map((t) => t.id)).toEqual(['b']);
  });

  test('given toggleExecution, then POST /api/transactions/:id/toggle-paid is called', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      transactions: [tx({ id: 'a', isPaid: false })],
    });
    await act(async () => {
      result.current.toggleExecution('a');
    });
    const req = capturedRequests.find((r) => r.url.endsWith('/api/transactions/a/toggle-paid'));
    expect(req).toBeDefined();
    expect(req!.method).toBe('POST');
  });

  test('given updateSeries, then PATCH /api/transactions/series/:groupId is called with stripped { updates, msg }', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      transactions: [tx({ id: 'a', recurringGroupId: 'g1' })],
    });
    await act(async () => {
      result.current.updateSeries(
        'g1',
        { id: 'NEW' as never, date: '1999-01-01', amount: 5 },
        'edit',
      );
    });
    const req = capturedRequests.find((r) =>
      r.url.endsWith('/api/transactions/series/g1'),
    );
    expect(req).toBeDefined();
    expect(req!.method).toBe('PATCH');
    expect(req!.body).toEqual({ updates: { amount: 5 }, msg: 'edit' });
  });

  test('given deleteSeries, then DELETE /api/transactions/series/:groupId is called', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      transactions: [tx({ id: 'a', recurringGroupId: 'g1' })],
    });
    await act(async () => {
      result.current.deleteSeries('g1');
    });
    const req = capturedRequests.find((r) =>
      r.url.endsWith('/api/transactions/series/g1'),
    );
    expect(req).toBeDefined();
    expect(req!.method).toBe('DELETE');
  });

  test('given breakSeriesLink, then POST /api/transactions/:id/break-series is called', async () => {
    const { result } = await renderTreasury({
      ...baseData,
      transactions: [tx({ id: 'a', recurringGroupId: 'g1' })],
    });
    await act(async () => {
      result.current.breakSeriesLink('a');
    });
    const req = capturedRequests.find((r) =>
      r.url.endsWith('/api/transactions/a/break-series'),
    );
    expect(req).toBeDefined();
    expect(req!.method).toBe('POST');
  });
});

describe('TreasuryContext reconcile request flow', () => {
  test('given requestReconcile is called, then reconcileRequest holds shortfall, cycleKey, and onSuccess', async () => {
    const { result } = await renderTreasury();
    const cb = vi.fn();
    await act(async () => {
      result.current.requestReconcile(500, '2026-01-02-A', cb);
    });
    expect(result.current.reconcileRequest).toEqual({
      shortfall: 500,
      cycleKey: '2026-01-02-A',
      onSuccess: cb,
    });
  });

  test('given clearReconcileRequest is called after a request, then reconcileRequest is null', async () => {
    const { result } = await renderTreasury();
    await act(async () => {
      result.current.requestReconcile(1, 'k', () => {});
      result.current.clearReconcileRequest();
    });
    expect(result.current.reconcileRequest).toBeNull();
  });
});
