export interface Account {
  id: string;
  name: string;
  color: string;
  startingBalance: number;
  balance?: number;
}

export interface TransactionType {
  id: string;
  name: string;
  parent_type: string | null;
}

export interface TransactionHistoryEntry {
  snapshot: Partial<Omit<Transaction, 'history'>>;
  timestamp: string;
  label: string;
}

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  typeId: string;
  accountId: string;
  toAccountId?: string;
  date: string;
  cycleKey: string;
  isPlanned: boolean;
  isPaid: boolean;
  isRecurring: boolean;
  recurringGroupId?: string;
  isException?: boolean;
  history: TransactionHistoryEntry[];
  created_at: string;
  updated_at: string;
}

// --- NEW PREFERENCE TYPES ---
export interface UserPreferences {
  theme: 'light' | 'dark';
  useSystemDefault: boolean;
  /** ISO 4217 currency code, e.g. 'PHP', 'USD'. Defaults to 'PHP'. */
  currency: string;
}

export type PayoutArchetype = 'bi-weekly' | 'semi-monthly' | 'monthly';

export interface PayoutConfig {
  archetype: PayoutArchetype;
  fixedIntervalDays: number;
  anchorDate: string;
  semiMonthlyDays: [number, number];
  monthlyDay: number;
}

export interface TreasuryData {
  accounts: Account[];
  types: TransactionType[];
  transactions: Transaction[];
  baseSalary: number;
  preferences: UserPreferences; // Added here
  payoutConfig: PayoutConfig;
  /**
   * Monotonically increasing version, bumped on every successful write.
   * Used for optimistic-concurrency control via If-Match headers.
   */
  version: number;
}
