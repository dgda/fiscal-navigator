import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import { Low } from 'lowdb';
import { TreasuryData } from '../types';

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
  writeCount: number;
}

export async function runMigrations(db: Low<TreasuryData>): Promise<MigrationResult> {
  const result: MigrationResult = {
    migratedPreferences: false,
    migratedPayoutConfig: false,
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

  app.post('/api/update', async (req, res) => {
    db.data = req.body;
    await db.write();
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
