import express from 'express';
import cors from 'cors';
import { JSONFilePreset } from 'lowdb/node';
import { TreasuryData } from './src/types';
import path from 'path';
import 'dotenv/config';

enum Environment {
  STAGING = 'staging',
  PRODUCTION = 'production',
}

const app = express();
app.use(express.json({ limit: '100mb' })); // Increase to 100mb
app.use(express.urlencoded({ limit: '100mb', extended: true }));
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

const defaultData: TreasuryData = {
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
    useSystemDefault: true, // Default to system on new installs
  },
  payoutConfig: {
    archetype: 'bi-weekly',
    fixedIntervalDays: 14,
    anchorDate: '2026-02-06',
    semiMonthlyDays: [15, 30],
    monthlyDay: 1,
  },
};

const environment: Environment = (process.env.ENV as Environment) || Environment.PRODUCTION;

const __dirname = path.resolve();

const dbPath =
  environment === Environment.STAGING ? path.join(__dirname, 'db.json') : '/app/data/db.json';

// Initialize DB

const db = await JSONFilePreset<TreasuryData>(dbPath, defaultData);

// --- MIGRATION: Ensure preferences object exists for older DBs ---
if (!db.data.preferences) {
  console.log('⚙️  Migrating DB: Adding User Preferences...');
  db.data.preferences = defaultData.preferences;
  await db.write();
}
// --- MIGRATION: Ensure payoutConfig exists ---
if (!db.data.payoutConfig) {
  console.log('⚙️  Migrating DB: Adding Payout Config...');
  db.data.payoutConfig = defaultData.payoutConfig;
  await db.write();
}

app.get('/api/data', (_req, res) => {
  res.json(db.data);
});

app.post('/api/update', async (req, res) => {
  db.data = req.body;
  await db.write();
  res.json({ success: true });
});

if (environment !== Environment.STAGING) {
  app.use(express.static(path.join(__dirname, 'dist')));

  app.get('*any', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(3001, '0.0.0.0', () => {
  console.log('🏛️  Treasury OS Core: http://0.0.0.0:3001');
});
