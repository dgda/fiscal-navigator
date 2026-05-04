import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { Low } from 'lowdb';
import { Account, Transaction, TransactionType, TreasuryData } from '../types';
import { backupBeforeWrite, snapshotDaily, listBackups, readBackup } from './backup';

export enum Environment {
  STAGING = 'staging',
  PRODUCTION = 'production',
}

/**
 * Returns a YYYY-MM-DD string for the most recent same-weekday-as-anchor on/before today.
 * Used to align a fresh DB's anchor with the current calendar instead of a stale hardcoded date.
 * For bi-weekly archetype this picks the most recent Friday by default (matching the original
 * 2026-02-06 anchor), keeping cycle layout familiar.
 */
export function buildSeedAnchorDate(today: Date = new Date(), targetWeekday: number = 5): string {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  const diff = (d.getDay() - targetWeekday + 7) % 7;
  d.setDate(d.getDate() - diff);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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
  version: 0,
};

/**
 * Returns a fresh, mutable copy of {@link defaultData} with a dynamically computed anchorDate
 * (most recent Friday on/before today). Used at server startup when seeding an empty DB so the
 * roadmap's first cycle is near "now" instead of the hardcoded value baked into defaultData.
 */
export function buildSeedData(): TreasuryData {
  return {
    ...defaultData,
    accounts: defaultData.accounts.map((a) => ({ ...a })),
    types: defaultData.types.map((t) => ({ ...t })),
    transactions: [],
    preferences: { ...defaultData.preferences },
    payoutConfig: {
      ...defaultData.payoutConfig,
      anchorDate: buildSeedAnchorDate(),
    },
  };
}

export interface MigrationResult {
  migratedPreferences: boolean;
  migratedPayoutConfig: boolean;
  migratedCurrency: boolean;
  migratedVersion: boolean;
  writeCount: number;
}

export async function runMigrations(db: Low<TreasuryData>): Promise<MigrationResult> {
  const result: MigrationResult = {
    migratedPreferences: false,
    migratedPayoutConfig: false,
    migratedCurrency: false,
    migratedVersion: false,
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

  if (typeof db.data.version !== 'number') {
    console.log('Migrating DB: Adding version...');
    db.data.version = 0;
    await db.write();
    result.migratedVersion = true;
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
    sendVersion(res);
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
    // Guard: only stamp a version when the document is a plain object. The legacy
    // /api/update path accepts arrays/undefined for backward compat with very old clients.
    if (db.data && typeof db.data === 'object' && !Array.isArray(db.data)) {
      const cur = (db.data as TreasuryData).version;
      (db.data as TreasuryData).version = (typeof cur === 'number' ? cur : 0) + 1;
    }
    await db.write();
    return db.data && typeof db.data === 'object' && !Array.isArray(db.data)
      ? ((db.data as TreasuryData).version ?? 0)
      : 0;
  };

  /**
   * Optimistic-concurrency precheck. If the request carries an `If-Match` header,
   * compare it to the current document version. Returns true when the request can
   * proceed; returns false (and writes a 409 response) when the client is stale.
   */
  const checkVersion = (req: Request, res: Response): boolean => {
    const ifMatch = req.header('If-Match');
    if (ifMatch === undefined || ifMatch === '') return true;
    const expected = Number(ifMatch);
    if (Number.isNaN(expected)) {
      res.status(400).json({ error: 'If-Match header must be a number' });
      return false;
    }
    const current = db.data.version ?? 0;
    if (expected !== current) {
      res
        .status(409)
        .set('X-Resource-Version', String(current))
        .json({ error: 'version mismatch', currentVersion: current });
      return false;
    }
    return true;
  };

  const sendVersion = (res: Response) => {
    const v =
      db.data && typeof db.data === 'object' && !Array.isArray(db.data)
        ? ((db.data as TreasuryData).version ?? 0)
        : 0;
    res.set('X-Resource-Version', String(v));
  };

  // Legacy monolithic write — retained for backward compatibility. Prefer the focused endpoints below.
  app.post('/api/update', async (req, res) => {
    db.data = req.body;
    await persist();
    sendVersion(res);
    res.json({ success: true });
  });

  app.patch('/api/preferences', async (req: Request, res: Response) => {
    if (!checkVersion(req, res)) return;
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'body must be an object' });
    }
    db.data.preferences = { ...db.data.preferences, ...req.body };
    await persist();
    sendVersion(res);
    res.json({ preferences: db.data.preferences });
  });

  app.patch('/api/payout-config', async (req: Request, res: Response) => {
    if (!checkVersion(req, res)) return;
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'body must be an object' });
    }
    db.data.payoutConfig = { ...db.data.payoutConfig, ...req.body };
    await persist();
    sendVersion(res);
    res.json({ payoutConfig: db.data.payoutConfig });
  });

  app.patch('/api/base-salary', async (req: Request, res: Response) => {
    if (!checkVersion(req, res)) return;
    const { baseSalary } = req.body ?? {};
    if (typeof baseSalary !== 'number' || Number.isNaN(baseSalary)) {
      return res.status(400).json({ error: 'baseSalary must be a number' });
    }
    db.data.baseSalary = baseSalary;
    await persist();
    sendVersion(res);
    res.json({ baseSalary });
  });

  app.put('/api/accounts', async (req: Request, res: Response) => {
    if (!checkVersion(req, res)) return;
    const { accounts } = req.body ?? {};
    if (!Array.isArray(accounts)) {
      return res.status(400).json({ error: 'accounts must be an array' });
    }
    db.data.accounts = accounts as Account[];
    await persist();
    sendVersion(res);
    res.json({ accounts: db.data.accounts });
  });

  app.put('/api/types', async (req: Request, res: Response) => {
    if (!checkVersion(req, res)) return;
    const { types } = req.body ?? {};
    if (!Array.isArray(types)) {
      return res.status(400).json({ error: 'types must be an array' });
    }
    db.data.types = types as TransactionType[];
    await persist();
    sendVersion(res);
    res.json({ types: db.data.types });
  });

  app.post('/api/transactions', async (req: Request, res: Response) => {
    if (!checkVersion(req, res)) return;
    const { transactions } = req.body ?? {};
    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: 'transactions must be an array' });
    }
    db.data.transactions = [...db.data.transactions, ...(transactions as Transaction[])];
    await persist();
    sendVersion(res);
    res.json({ added: transactions.length });
  });

  app.put('/api/transactions', async (req: Request, res: Response) => {
    if (!checkVersion(req, res)) return;
    const { transactions } = req.body ?? {};
    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: 'transactions must be an array' });
    }
    db.data.transactions = transactions as Transaction[];
    await persist();
    sendVersion(res);
    res.json({ count: db.data.transactions.length });
  });

  app.patch('/api/transactions/series/:groupId', async (req: Request, res: Response) => {
    if (!checkVersion(req, res)) return;
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
    sendVersion(res);
    res.json({ success: true });
  });

  app.delete('/api/transactions/series/:groupId', async (req: Request, res: Response) => {
    if (!checkVersion(req, res)) return;
    const before = db.data.transactions.length;
    db.data.transactions = db.data.transactions.filter(
      (t) => t.recurringGroupId !== req.params.groupId,
    );
    await persist();
    sendVersion(res);
    res.json({ removed: before - db.data.transactions.length });
  });

  app.patch('/api/transactions/:id', async (req: Request, res: Response) => {
    if (!checkVersion(req, res)) return;
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
    sendVersion(res);
    res.json({ success: true });
  });

  app.post('/api/transactions/:id/toggle-paid', async (req: Request, res: Response) => {
    if (!checkVersion(req, res)) return;
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
    sendVersion(res);
    res.json({ isPaid: nextStatus });
  });

  app.post('/api/transactions/:id/break-series', async (req: Request, res: Response) => {
    if (!checkVersion(req, res)) return;
    const target = db.data.transactions.find((t) => t.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'transaction not found' });
    db.data.transactions = db.data.transactions.map((t) =>
      t.id === req.params.id ? { ...t, recurringGroupId: undefined } : t,
    );
    await persist();
    sendVersion(res);
    res.json({ success: true });
  });

  app.delete('/api/transactions/:id', async (req: Request, res: Response) => {
    if (!checkVersion(req, res)) return;
    const before = db.data.transactions.length;
    db.data.transactions = db.data.transactions.filter((t) => t.id !== req.params.id);
    if (db.data.transactions.length === before) {
      return res.status(404).json({ error: 'transaction not found' });
    }
    await persist();
    sendVersion(res);
    res.json({ success: true });
  });

  app.get('/api/backups', async (_req: Request, res: Response) => {
    if (!opts.dbPath) {
      return res.status(503).json({ error: 'backups not available (no dbPath configured)' });
    }
    try {
      const entries = await listBackups(opts.dbPath);
      sendVersion(res);
      res.json({ backups: entries });
    } catch (err) {
      console.error('Failed to list backups', err);
      res.status(500).json({ error: 'failed to list backups' });
    }
  });

  app.post('/api/backups/restore', async (req: Request, res: Response) => {
    if (!opts.dbPath) {
      return res.status(503).json({ error: 'backups not available (no dbPath configured)' });
    }
    if (!checkVersion(req, res)) return;
    const { filename } = req.body ?? {};
    if (typeof filename !== 'string' || filename.length === 0) {
      return res.status(400).json({ error: 'filename (string) is required' });
    }
    let restored: unknown;
    try {
      restored = await readBackup(opts.dbPath, filename);
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      const status = message.includes('invalid backup filename') ? 400 : 404;
      return res.status(status).json({ error: message });
    }
    if (!restored || typeof restored !== 'object') {
      return res.status(400).json({ error: 'backup did not contain a JSON object' });
    }
    db.data = restored as TreasuryData;
    await persist();
    sendVersion(res);
    res.json({ restored: filename, version: db.data.version });
  });

  if (opts.serveStatic && opts.staticDir) {
    app.use(express.static(opts.staticDir));
    app.get('*any', (_req, res) => {
      res.sendFile(path.join(opts.staticDir as string, 'index.html'));
    });
  }

  return app;
}
