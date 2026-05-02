import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  TreasuryData,
  Transaction,
  TransactionType,
  Account,
  PayoutConfig,
  UserPreferences,
} from '../types';
import { API_URL } from '../constants';

interface TreasuryContextType {
  data: TreasuryData;
  loading: boolean;
  /** @deprecated Prefer the focused mutation methods below. Kept for legacy/escape-hatch use. */
  sync: (newData: TreasuryData) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  updatePayoutConfig: (updates: Partial<PayoutConfig>) => Promise<void>;
  updateBaseSalary: (baseSalary: number) => Promise<void>;
  updateAccounts: (accounts: Account[]) => Promise<void>;
  updateTypes: (types: TransactionType[]) => Promise<void>;
  computedAccounts: Account[];
  totalLiquidity: number;
  renderTypeOptions: () => React.ReactNode;
  checkIsIncome: (typeId: string) => boolean;
  checkIsTransfer: (typeId: string) => boolean;
  getFullTypeName: (typeId: string) => string;
  commitUpdate: (id: string, updates: Partial<Transaction>, msg: string) => void;
  updateSeries: (groupId: string, baseUpdates: Partial<Transaction>, msg: string) => void;
  deleteSeries: (groupId: string) => void;
  breakSeriesLink: (id: string) => void;
  toggleExecution: (id: string) => void;
  createTransactions: (transactions: Transaction[]) => Promise<void>;
  replaceTransactions: (transactions: Transaction[]) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  // Reconciliation Global State
  reconcileRequest: {
    shortfall: number;
    cycleKey: string;
    onSuccess: (adjustments: Record<string, number>, updatedTransactions: Transaction[]) => void;
  } | null;
  requestReconcile: (
    shortfall: number,
    cycleKey: string,
    onSuccess: (adjustments: Record<string, number>, updatedTransactions: Transaction[]) => void,
  ) => void;
  clearReconcileRequest: () => void;
}

const TreasuryContext = createContext<TreasuryContextType | null>(null);

export const TreasuryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<TreasuryData | null>(null);
  const [loading, setLoading] = useState(true);

  // Reconciliation Global State
  const [reconcileRequest, setReconcileRequest] = useState<{
    shortfall: number;
    cycleKey: string;
    onSuccess: (adjustments: Record<string, number>, updatedTransactions: Transaction[]) => void;
  } | null>(null);

  const requestReconcile = useCallback(
    (
      shortfall: number,
      cycleKey: string,
      onSuccess: (adjustments: Record<string, number>, updatedTransactions: Transaction[]) => void,
    ) => {
      setReconcileRequest({ shortfall, cycleKey, onSuccess });
    },
    [],
  );

  const clearReconcileRequest = useCallback(() => {
    setReconcileRequest(null);
  }, []);

  // Initial Fetch
  useEffect(() => {
    fetch(`${API_URL}/api/data`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load treasury data', err);
        setLoading(false);
      });
  }, []);

  // Generic JSON fetch helper. Optimistic update of local state has already happened by the caller.
  const apiCall = useCallback(
    async (path: string, init: RequestInit) => {
      try {
        await fetch(`${API_URL}${path}`, {
          ...init,
          headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
        });
      } catch (err) {
        console.error(`Request failed: ${init.method ?? 'GET'} ${path}`, err);
      }
    },
    [],
  );

  // Legacy escape hatch: replaces the entire DB document. Prefer focused methods.
  const sync = useCallback(
    async (newData: TreasuryData) => {
      setData(newData);
      await apiCall('/api/update', { method: 'POST', body: JSON.stringify(newData) });
    },
    [apiCall],
  );

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      if (!data) return;
      const newPreferences = { ...data.preferences, ...updates };
      setData({ ...data, preferences: newPreferences });
      await apiCall('/api/preferences', { method: 'PATCH', body: JSON.stringify(updates) });
    },
    [data, apiCall],
  );

  const updatePayoutConfig = useCallback(
    async (updates: Partial<PayoutConfig>) => {
      if (!data) return;
      const newPayoutConfig = { ...data.payoutConfig, ...updates };
      setData({ ...data, payoutConfig: newPayoutConfig });
      await apiCall('/api/payout-config', { method: 'PATCH', body: JSON.stringify(updates) });
    },
    [data, apiCall],
  );

  const updateBaseSalary = useCallback(
    async (baseSalary: number) => {
      if (!data) return;
      setData({ ...data, baseSalary });
      await apiCall('/api/base-salary', { method: 'PATCH', body: JSON.stringify({ baseSalary }) });
    },
    [data, apiCall],
  );

  const updateAccounts = useCallback(
    async (accounts: Account[]) => {
      if (!data) return;
      setData({ ...data, accounts });
      await apiCall('/api/accounts', { method: 'PUT', body: JSON.stringify({ accounts }) });
    },
    [data, apiCall],
  );

  const updateTypes = useCallback(
    async (types: TransactionType[]) => {
      if (!data) return;
      setData({ ...data, types });
      await apiCall('/api/types', { method: 'PUT', body: JSON.stringify({ types }) });
    },
    [data, apiCall],
  );

  const createTransactions = useCallback(
    async (transactions: Transaction[]) => {
      if (!data) return;
      setData({ ...data, transactions: [...data.transactions, ...transactions] });
      await apiCall('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({ transactions }),
      });
    },
    [data, apiCall],
  );

  const replaceTransactions = useCallback(
    async (transactions: Transaction[]) => {
      if (!data) return;
      setData({ ...data, transactions });
      await apiCall('/api/transactions', {
        method: 'PUT',
        body: JSON.stringify({ transactions }),
      });
    },
    [data, apiCall],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!data) return;
      setData({ ...data, transactions: data.transactions.filter((t) => t.id !== id) });
      await apiCall(`/api/transactions/${id}`, { method: 'DELETE' });
    },
    [data, apiCall],
  );

  // --- HELPER FUNCTIONS ---
  const checkIsIncome = useCallback(
    (typeId: string): boolean => {
      if (!data) return false;
      const t = data.types.find((x) => x.id === typeId);
      if (!t) return false;
      // eslint-disable-next-line react-hooks/immutability
      return t.name === 'Income' ? true : t.parent_type ? checkIsIncome(t.parent_type) : false;
    },
    [data],
  );

  const checkIsTransfer = useCallback(
    (typeId: string): boolean => {
      if (!data) return false;
      const t = data.types.find((x) => x.id === typeId);
      if (!t) return false;
      // eslint-disable-next-line react-hooks/immutability
      return t.name === 'Transfer' ? true : t.parent_type ? checkIsTransfer(t.parent_type) : false;
    },
    [data],
  );

  const getFullTypeName = useCallback(
    (typeId: string): string => {
      if (!data) return '';
      const t = data.types.find((x) => x.id === typeId);
      if (!t) return 'Unknown';
      if (t.parent_type) {
        const p = data.types.find((x) => x.id === t.parent_type);
        return p ? `${p.name} - ${t.name}` : t.name;
      }
      return t.name;
    },
    [data],
  );

  // --- CORE CALCULATION LOGIC ---
  const computedAccounts =
    data?.accounts.map((acc) => {
      const balance =
        acc.startingBalance +
        (data.transactions || [])
          .filter((t) => t.isPaid)
          .reduce((sum, t) => {
            const isInc = checkIsIncome(t.typeId);
            if (t.accountId === acc.id) {
              if (isInc) return sum + t.amount;
              return sum - t.amount;
            }
            if (t.toAccountId === acc.id) {
              return sum + t.amount;
            }
            return sum;
          }, 0);
      return { ...acc, balance };
    }) || [];

  const totalLiquidity = computedAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  const renderTypeOptions = (parentId: string | null = null, depth = 0) => {
    if (!data) return null;
    return data.types
      .filter((t) => t.parent_type === parentId)
      .map((t) => (
        <React.Fragment key={t.id}>
          <option value={t.id}>
            {'\u00A0'.repeat(depth * 3)} {t.name}
          </option>
          {renderTypeOptions(t.id, depth + 1)}
        </React.Fragment>
      ));
  };

  // --- Transaction Mutations ---
  const commitUpdate = (id: string, updates: Partial<Transaction>, msg: string) => {
    if (!data) return;
    const now = new Date().toISOString();
    const nextTxs = data.transactions.map((t) => {
      if (t.id !== id) return t;
      const snapshot = { ...t };
      // @ts-expect-error clearing values
      delete snapshot.history;

      return {
        ...t,
        ...updates,
        updated_at: now,
        history: [...t.history, { snapshot, timestamp: now, label: msg }],
      };
    });
    setData({ ...data, transactions: nextTxs });
    void apiCall(`/api/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ updates, msg }),
    });
  };

  const toggleExecution = (id: string) => {
    if (!data) return;
    const now = new Date().toISOString();
    const nextTxs = data.transactions.map((t) => {
      if (t.id !== id) return t;
      const nextStatus = !t.isPaid;
      const snapshot = { ...t };
      // @ts-expect-error clearing values
      delete snapshot.history;

      return {
        ...t,
        isPaid: nextStatus,
        updated_at: now,
        history: [
          ...t.history,
          { snapshot, timestamp: now, label: nextStatus ? 'Marked Paid' : 'Marked Planned' },
        ],
      };
    });
    setData({ ...data, transactions: nextTxs });
    void apiCall(`/api/transactions/${id}/toggle-paid`, { method: 'POST' });
  };

  const updateSeries = (groupId: string, baseUpdates: Partial<Transaction>, msg: string) => {
    if (!data) return;
    const now = new Date().toISOString();

    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      id: _id,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      date: _date,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      cycleKey: _cycleKey,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      created_at: _ca,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      history: _h,
      ...safeUpdates
    } = baseUpdates;

    const nextTxs = data.transactions.map((t) => {
      if (t.recurringGroupId !== groupId || t.isPaid) return t;

      const snapshot = { ...t };
      // @ts-expect-error clearing values
      delete snapshot.history;

      return {
        ...t,
        ...safeUpdates,
        updated_at: now,
        history: [...t.history, { snapshot, timestamp: now, label: msg }],
      };
    });

    setData({ ...data, transactions: nextTxs });
    void apiCall(`/api/transactions/series/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify({ updates: safeUpdates, msg }),
    });
  };

  const deleteSeries = (groupId: string) => {
    if (!data) return;
    const nextTxs = data.transactions.filter((t) => t.recurringGroupId !== groupId);
    setData({ ...data, transactions: nextTxs });
    void apiCall(`/api/transactions/series/${groupId}`, { method: 'DELETE' });
  };

  const breakSeriesLink = (id: string) => {
    if (!data) return;
    const nextTxs = data.transactions.map((t) =>
      t.id === id ? { ...t, recurringGroupId: undefined } : t,
    );
    setData({ ...data, transactions: nextTxs });
    void apiCall(`/api/transactions/${id}/break-series`, { method: 'POST' });
  };

  if (loading || !data) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5F5F7] dark:bg-[#1E1E1F]">
        <div className="animate-pulse text-[10px] font-black uppercase tracking-widest text-slate-400">
          Loading Treasury...
        </div>
      </div>
    );
  }

  return (
    <TreasuryContext.Provider
      value={{
        data,
        loading,
        sync,
        updatePreferences,
        updatePayoutConfig,
        updateBaseSalary,
        updateAccounts,
        updateTypes,
        computedAccounts,
        totalLiquidity,
        renderTypeOptions,
        checkIsIncome,
        checkIsTransfer,
        getFullTypeName,
        commitUpdate,
        updateSeries,
        deleteSeries,
        breakSeriesLink,
        toggleExecution,
        createTransactions,
        replaceTransactions,
        deleteTransaction,
        reconcileRequest,
        requestReconcile,
        clearReconcileRequest,
      }}
    >
      {children}
    </TreasuryContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTreasury = () => {
  const ctx = useContext(TreasuryContext);
  if (!ctx) throw new Error('useTreasury must be used within TreasuryProvider');
  return ctx;
};
