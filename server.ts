import { JSONFilePreset } from 'lowdb/node';
import { TreasuryData } from './src/types';
import path from 'path';
import 'dotenv/config';
import {
  Environment,
  createApp,
  defaultData,
  resolveDbPath,
  resolveEnvironment,
  runMigrations,
} from './src/server/app';

const environment: Environment = resolveEnvironment(process.env.ENV);

const __dirname = path.resolve();

const dbPath = resolveDbPath(environment, __dirname);

const db = await JSONFilePreset<TreasuryData>(dbPath, defaultData);

await runMigrations(db);

const app = createApp(db, {
  serveStatic: environment !== Environment.STAGING,
  staticDir: path.join(__dirname, 'dist'),
  dbPath,
});

app.listen(3001, '0.0.0.0', () => {
  console.log('🏛️  Treasury OS Core: http://0.0.0.0:3001');
});
