import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { Low } from 'lowdb';
import { Account, Transaction, TransactionType, TreasuryData } from '../types';
import { backupBeforeWrite, snapshotDaily } from './backup';

export enum Environment {
  STAGING = 'staging',
  PRODUCTION = 'production',
}

export const defaultData: TreasuryData = {
  accounts: [
    { id: 'acc-1', name: 'Metrobank', color: '#3b82f6', startingBalance: 0 },
    { id: 'acc-2', name: 'Maya Wallet', color: '#10b981', startingBalance: 0 },
    { id: 'acc-3', name: 'Physical Cash', color: '#f59e0b', startingBalance: 0 },
  ],
  types: [
    { id: 't1', name: 'Income', parent_type: null },
    { id: 't2', name: 'Expense', parent_type: null },
    { id: 't3', name: 'Salary', parent_type: 't1' },
    { id: 't4', name: 'Housing', parent_type: 't2' },
    { id: 't5', name: 'Automotive', parent_type: 't2' },
    { id: 't6', name: 'Lifestyle', parent_type: 't2' },
    { id: 't7', name: 'Transfer', parent_type: null },
  ],
  transactions: [],
  baseSalary: 70000,
  preferences: {
    theme: 'light',
    useSystemDefault: true,
    currency: 'PHP',
  },
  payoutConfig: {
    archetype: 'bi-weekly',
    fixedIntervalDays: 14,
    anchorDate: '2026-02-06',
    semiMonthlyDays: [15, 30],
    monthlyDay: 1,
  },
};

export interface MigrationResult {
  migratedPreferences: boolean;
  migratedPayoutConfig: boolean;
  migratedCurrency: boolean;
  writeCount: number;
}

export async function runMigrations(db: Low<TreasuryData>): Promise<MigrationResult> {
  const result: MigrationResult = {
    migratedPreferences: false,
    migratedPayoutConfig: false,
    migratedCurrency: false,
    writeCount: 0,
  };

  if (!db.data.preferences) {
    console.log('Migrating DB: Adding User Preferences...');
    db.data.preferences = defaultData.preferences;
    await db.write();
    result.migratedPreferences = true;
    result.writeCount += 1;
  }

  if (!db.data.payoutConfig) {
    console.log('Migrating DB: Adding Payout Config...');
    db.data.payoutConfig = defaultData.payoutConfig;
    await db.write();
    result.migratedPayoutConfig = true;
    result.writeCount += 1;
  }

  if (db.data.preferences && !db.data.preferences.currency) {
    console.log('Migrating DB: Adding currency preference...');
    db.data.preferences.currency = defaultData.preferences.currency;
    await db.write();
    result.migratedCurrency = true;
    result.writeCount += 1;
  }

  return result;
}

export function resolveDbPath(environment: Environment, baseDir: string): string {
  return environment === Environment.STAGING ? path.join(baseDir, 'db.json') : '/app/data/db.json';
}

export function resolveEnvironment(envValue: string | undefined): Environment {
  return (envValue as Environment) || Environment.PRODUCTION;
}

export interface CreateAppOptions {
  serveStatic?: boolean;
  staticDir?: string;
  payloadLimit?: string;
  dbPath?: string;
  backupRetainDays?: number;
}

export function createApp(db: Low<TreasuryData>, opts: CreateAppOptions = {}): Express {
  const limit = opts.payloadLimit ?? '100mb';
  const app = express();
  app.use(express.json({ limit }));
  app.use(express.urlencoded({ limit, extended: true }));
  // @ts-expect-error no types
  app.use((err, _req, _res, next) => {
    if (err.type === 'entity.too.large') {
      console.error('Payload Limit Exceeded!');
      console.error('Limit set to:', err.limit);
      console.error('Current body size:', err.length);
    }
    next(err);
  });
  app.use(cors());
  app.use(express.json());

  app.get('/api/data', (_req, res) => {
    res.json(db.data);
  });

  const persist = async () => {
    if (opts.dbPath) {
      try {
        await backupBeforeWrite(opts.dbPath);
        await snapshotDaily(opts.dbPath, opts.backupRetainDays ?? 7);
      } catch (err) {
        console.error('Backup failed (continuing with write)', err);
      }
    }
    await db.write();
  };

  // Legacy monolithic write — retained for backward compatibility. Prefer the focused endpoints below.
  app.post('/api/update', async (req, res) => {
    db.data = req.body;
    await persist();
    res.json({ success: true });
  });

  app.patch('/api/preferences', async (req: Request, res: Response) => {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'body must be an object' });
    }
    db.data.preferences = { ...db.data.preferences, ...req.body };
    await persist();
    res.json({ preferences: db.data.preferences });
  });

  app.patch('/api/payout-config', async (req: Request, res: Response) => {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'body must be an object' });
    }
    db.data.payoutConfig = { ...db.data.payoutConfig, ...req.body };
    await persist();
    res.json({ payoutConfig: db.data.payoutConfig });
  });

  app.patch('/api/base-salary', async (req: Request, res: Response) => {
    const { baseSalary } = req.body ?? {};
    if (typeof baseSalary !== 'number' || Number.isNaN(baseSalary)) {
      return res.status(400).json({ error: 'baseSalary must be a number' });
    }
    db.data.baseSalary = baseSalary;
    await persist();
    res.json({ baseSalary });
  });

  app.put('/api/accounts', async (req: Request, res: Response) => {
    const { accounts } = req.body ?? {};
    if (!Array.isArray(accounts)) {
      return res.status(400).json({ error: 'accounts must be an array' });
    }
    db.data.accounts = accounts as Account[];
    await persist();
    res.json({ accounts: db.data.accounts });
  });

  app.put('/api/types', async (req: Request, res: Response) => {
    const { types } = req.body ?? {};
    if (!Array.isArray(types)) {
      return res.status(400).json({ error: 'types must be an array' });
    }
    db.data.types = types as TransactionType[];
    await persist();
    res.json({ types: db.data.types });
  });

  app.post('/api/transactions', async (req: Request, res: Response) => {
    const { transactions } = req.body ?? {};
    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: 'transactions must be an array' });
    }
    db.data.transactions = [...db.data.transactions, ...(transactions as Transaction[])];
    await persist();
    res.json({ added: transactions.length });
  });

  app.put('/api/transactions', async (req: Request, res: Response) => {
    const { transactions } = req.body ?? {};
    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: 'transactions must be an array' });
    }
    db.data.transactions = transactions as Transaction[];
    await persist();
    res.json({ count: db.data.transactions.length });
  });

  app.patch('/api/transactions/series/:groupId', async (req: Request, res: Response) => {
    const { updates, msg } = req.body ?? {};
    if (!updates || typeof updates !== 'object' || typeof msg !== 'string') {
      return res.status(400).json({ error: 'body requires { updates: object, msg: string }' });
    }
    const now = new Date().toISOString();
    const {
      id: _id,
      date: _date,
      cycleKey: _cycleKey,
      created_at: _ca,
      history: _h,
      ...safeUpdates
    } = updates as Partial<Transaction> & Record<string, unknown>;
    void _id;
    void _date;
    void _cycleKey;
    void _ca;
    void _h;
    db.data.transactions = db.data.transactions.map((t) => {
      if (t.recurringGroupId !== req.params.groupId || t.isPaid) return t;
      const snapshot = { ...t } as Partial<Transaction>;
      delete snapshot.history;
      return {
        ...t,
        ...(safeUpdates as Partial<Transaction>),
        updated_at: now,
        history: [...t.history, { snapshot, timestamp: now, label: msg }],
      };
    });
    await persist();
    res.json({ success: true });
  });

  app.delete('/api/transactions/series/:groupId', async (req: Request, res: Response) => {
    const before = db.data.transactions.length;
    db.data.transactions = db.data.transactions.filter(
      (t) => t.recurringGroupId !== req.params.groupId,
    );
    await persist();
    res.json({ removed: before - db.data.transactions.length });
  });

  app.patch('/api/transactions/:id', async (req: Request, res: Response) => {
    const { updates, msg } = req.body ?? {};
    if (!updates || typeof updates !== 'object' || typeof msg !== 'string') {
      return res.status(400).json({ error: 'body requires { updates: object, msg: string }' });
    }
    const target = db.data.transactions.find((t) => t.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'transaction not found' });
    const now = new Date().toISOString();
    db.data.transactions = db.data.transactions.map((t) => {
      if (t.id !== req.params.id) return t;
      const snapshot = { ...t } as Partial<Transaction>;
      delete snapshot.history;
      return {
        ...t,
        ...(updates as Partial<Transaction>),
        updated_at: now,
        history: [...t.history, { snapshot, timestamp: now, label: msg }],
      };
    });
    await persist();
    res.json({ success: true });
  });

  app.post('/api/transactions/:id/toggle-paid', async (req: Request, res: Response) => {
    const target = db.data.transactions.find((t) => t.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'transaction not found' });
    const now = new Date().toISOString();
    const nextStatus = !target.isPaid;
    db.data.transactions = db.data.transactions.map((t) => {
      if (t.id !== req.params.id) return t;
      const snapshot = { ...t } as Partial<Transaction>;
      delete snapshot.history;
      return {
        ...t,
        isPaid: nextStatus,
        updated_at: now,
        history: [
          ...t.history,
          {
            snapshot,
            timestamp: now,
            label: nextStatus ? 'Marked Paid' : 'Marked Planned',
          },
        ],
      };
    });
    await persist();
    res.json({ isPaid: nextStatus });
  });

  app.post('/api/transactions/:id/break-series', async (req: Request, res: Response) => {
    const target = db.data.transactions.find((t) => t.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'transaction not found' });
    db.data.transactions = db.data.transactions.map((t) =>
      t.id === req.params.id ? { ...t, recurringGroupId: undefined } : t,
    );
    await persist();
    res.json({ success: true });
  });

  app.delete('/api/transactions/:id', async (req: Request, res: Response) => {
    const before = db.data.transactions.length;
    db.data.transactions = db.data.transactions.filter((t) => t.id !== req.params.id);
    if (db.data.transactions.length === before) {
      return res.status(404).json({ error: 'transaction not found' });
    }
    await persist();
    res.json({ success: true });
  });

  if (opts.serveStatic && opts.staticDir) {
    app.use(express.static(opts.staticDir));
    app.get('*any', (_req, res) => {
      res.sendFile(path.join(opts.staticDir as string, 'index.html'));
    });
  }

  return app;
}
