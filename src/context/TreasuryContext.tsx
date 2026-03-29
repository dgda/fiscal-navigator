import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { TreasuryData, Transaction, Account, PayoutConfig, UserPreferences } from '../types';
import { API_URL } from '../constants';

interface TreasuryContextType {
  data: TreasuryData;
  loading: boolean;
  sync: (newData: TreasuryData) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  updatePayoutConfig: (updates: Partial<PayoutConfig>) => Promise<void>;
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

  // Sync to Server
  const sync = useCallback(async (newData: TreasuryData) => {
    setData(newData); // Optimistic Update
    try {
      await fetch(`${API_URL}/api/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      });
    } catch (err) {
      console.error('Sync failed', err);
    }
  }, []);

  // --- UPDATED: Atomic Preference Update ---
  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      if (!data) return;
      const newPreferences = { ...data.preferences, ...updates };
      const nextData = { ...data, preferences: newPreferences };
      await sync(nextData);
    },
    [data, sync],
  );

  const updatePayoutConfig = useCallback(
    async (updates: Partial<PayoutConfig>) => {
      if (!data) return;
      const nextData = {
        ...data,
        payoutConfig: { ...data.payoutConfig, ...updates },
      };
      await sync(nextData);
    },
    [data, sync],
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
    sync({ ...data, transactions: nextTxs });
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
    sync({ ...data, transactions: nextTxs });
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

    sync({ ...data, transactions: nextTxs });
  };

  const deleteSeries = (groupId: string) => {
    if (!data) return;
    const nextTxs = data.transactions.filter((t) => t.recurringGroupId !== groupId);
    sync({ ...data, transactions: nextTxs });
  };

  const breakSeriesLink = (id: string) => {
    if (!data) return;
    const nextTxs = data.transactions.map((t) =>
      t.id === id ? { ...t, recurringGroupId: undefined } : t,
    );
    sync({ ...data, transactions: nextTxs });
  };

  if (loading || !data) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5F5F7] dark:bg-[#0A0A0B]">
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
