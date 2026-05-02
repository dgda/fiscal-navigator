import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { Low, Memory } from 'lowdb';
import { JSONFilePreset } from 'lowdb/node';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import {
  createApp,
  defaultData,
  runMigrations,
  resolveDbPath,
  resolveEnvironment,
  Environment,
} from '../src/server/app';
import type { TreasuryData } from '../src/types';

const buildDb = (override?: Partial<TreasuryData>): Low<TreasuryData> => {
  const adapter = new Memory<TreasuryData>();
  const data = { ...defaultData, ...(override ?? {}) } as TreasuryData;
  return new Low<TreasuryData>(adapter, data);
};

describe('GET /api/data', () => {
  test('given a fresh db with seeded defaultData, then returns full TreasuryData with every top-level field', async () => {
    const db = buildDb();
    const app = createApp(db);
    const res = await request(app).get('/api/data');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accounts');
    expect(res.body).toHaveProperty('types');
    expect(res.body).toHaveProperty('transactions');
    expect(res.body).toHaveProperty('baseSalary');
    expect(res.body).toHaveProperty('preferences');
    expect(res.body).toHaveProperty('payoutConfig');
  });

  test('given a populated db, then returns the exact stored data', async () => {
    const customTx = {
      id: 'tx-test',
      name: 'rent',
      amount: 100,
      typeId: 't4',
      accountId: 'acc-1',
      date: '2026-01-01',
      cycleKey: '2026-01-01-A',
      isPlanned: true,
      isPaid: false,
      isRecurring: false,
      history: [],
    };
    const db = buildDb({ baseSalary: 999999, transactions: [customTx as never] });
    const app = createApp(db);
    const res = await request(app).get('/api/data');
    expect(res.body.baseSalary).toBe(999999);
    expect(res.body.transactions).toHaveLength(1);
    expect(res.body.transactions[0].id).toBe('tx-test');
  });

  test('given GET /api/data, then content-type is application/json', async () => {
    const db = buildDb();
    const app = createApp(db);
    const res = await request(app).get('/api/data');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  test('given GET to a non-existent api route, then 404 (no SPA fallback when serveStatic disabled)', async () => {
    const db = buildDb();
    const app = createApp(db);
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/update happy path', () => {
  test('given valid full TreasuryData, then returns 200 with success true', async () => {
    const db = buildDb();
    const app = createApp(db);
    const res = await request(app).post('/api/update').send(defaultData);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  test('given POST then GET, then returns the posted data verbatim', async () => {
    const db = buildDb();
    const app = createApp(db);
    const updated: TreasuryData = { ...defaultData, baseSalary: 12345 };
    await request(app).post('/api/update').send(updated);
    const res = await request(app).get('/api/data');
    expect(res.body.baseSalary).toBe(12345);
  });

  test('given POST /api/update, then content-type of response is application/json', async () => {
    const db = buildDb();
    const app = createApp(db);
    const res = await request(app).post('/api/update').send(defaultData);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  test('given two sequential POSTs, then last write wins', async () => {
    const db = buildDb();
    const app = createApp(db);
    await request(app).post('/api/update').send({ ...defaultData, baseSalary: 1 });
    await request(app).post('/api/update').send({ ...defaultData, baseSalary: 2 });
    const res = await request(app).get('/api/data');
    expect(res.body.baseSalary).toBe(2);
  });

  test('given POST /api/update, then db.write is called once', async () => {
    const db = buildDb();
    const writeSpy = vi.spyOn(db, 'write');
    const app = createApp(db);
    await request(app).post('/api/update').send(defaultData);
    expect(writeSpy).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/update edge cases (locks current monolithic behavior)', () => {
  test('given empty object body, then writes empty object to db', async () => {
    const db = buildDb();
    const app = createApp(db);
    const res = await request(app).post('/api/update').send({});
    expect(res.status).toBe(200);
    expect(db.data).toEqual({});
  });

  test('given partial body, then overwrites entire document with the partial', async () => {
    const db = buildDb();
    const app = createApp(db);
    const partial = { baseSalary: 50000 };
    await request(app).post('/api/update').send(partial);
    expect(db.data).toEqual(partial);
    expect((db.data as Partial<TreasuryData>).accounts).toBeUndefined();
    expect((db.data as Partial<TreasuryData>).preferences).toBeUndefined();
  });

  test('given malformed JSON body, then returns 400 and db is untouched', async () => {
    const db = buildDb();
    const writeSpy = vi.spyOn(db, 'write');
    const app = createApp(db);
    const res = await request(app)
      .post('/api/update')
      .set('Content-Type', 'application/json')
      .send('{not valid json');
    expect(res.status).toBe(400);
    expect(writeSpy).not.toHaveBeenCalled();
    expect(db.data).toEqual(defaultData);
  });

  test('given non-json content type, then express.json skips parsing and db.data becomes undefined (locks current weakness)', async () => {
    const db = buildDb();
    const app = createApp(db);
    const res = await request(app)
      .post('/api/update')
      .set('Content-Type', 'text/plain')
      .send('arbitrary text payload');
    expect(res.status).toBe(200);
    expect(db.data).toBeUndefined();
  });

  test('given body exceeding configured payload limit, then returns 413', async () => {
    const db = buildDb();
    const app = createApp(db, { payloadLimit: '1kb' });
    const oversized = { blob: 'a'.repeat(2048) };
    const res = await request(app).post('/api/update').send(oversized);
    expect(res.status).toBe(413);
  });

  test('given body exceeding configured payload limit, then console.error is invoked by the size middleware', async () => {
    const db = buildDb();
    const app = createApp(db, { payloadLimit: '1kb' });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const oversized = { blob: 'a'.repeat(2048) };
      await request(app).post('/api/update').send(oversized);
      expect(errorSpy).toHaveBeenCalledWith('Payload Limit Exceeded!');
      expect(errorSpy).toHaveBeenCalledWith('Limit set to:', expect.anything());
      expect(errorSpy).toHaveBeenCalledWith('Current body size:', expect.anything());
    } finally {
      errorSpy.mockRestore();
    }
  });

  test('given db.write rejects, then POST /api/update returns 500 and db is left in the optimistically assigned state (locks current behavior, no rollback)', async () => {
    const db = buildDb();
    vi.spyOn(db, 'write').mockRejectedValue(new Error('disk failure'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const app = createApp(db);
      const res = await request(app).post('/api/update').send({ ...defaultData, baseSalary: 42 });
      expect(res.status).toBe(500);
      // current behavior, db.data was assigned before the failed write, no rollback
      expect((db.data as TreasuryData).baseSalary).toBe(42);
    } finally {
      errorSpy.mockRestore();
    }
  });

  test('given application/x-www-form-urlencoded body, then express.urlencoded parses it into req.body', async () => {
    const db = buildDb();
    const app = createApp(db);
    const res = await request(app)
      .post('/api/update')
      .type('form')
      .send({ baseSalary: '321', name: 'urlencoded-write' });
    expect(res.status).toBe(200);
    expect(db.data).toEqual({ baseSalary: '321', name: 'urlencoded-write' });
  });

  test('given urlencoded body exceeding payload limit, then returns 413', async () => {
    const db = buildDb();
    const app = createApp(db, { payloadLimit: '1kb' });
    const big = { blob: 'a'.repeat(2048) };
    const res = await request(app).post('/api/update').type('form').send(big);
    expect(res.status).toBe(413);
  });

  test('given body within configured payload limit, then 200', async () => {
    const db = buildDb();
    const app = createApp(db, { payloadLimit: '10kb' });
    const small = { ...defaultData, baseSalary: 7 };
    const res = await request(app).post('/api/update').send(small);
    expect(res.status).toBe(200);
  });

  test('given POST /api/update with array body, then db.data becomes that array (current behavior, no schema check)', async () => {
    const db = buildDb();
    const app = createApp(db);
    await request(app).post('/api/update').send([1, 2, 3]);
    expect(db.data).toEqual([1, 2, 3]);
  });
});

describe('CORS', () => {
  test('given any GET request, then Access-Control-Allow-Origin header is *', async () => {
    const db = buildDb();
    const app = createApp(db);
    const res = await request(app).get('/api/data').set('Origin', 'http://example.com');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  test('given OPTIONS preflight on /api/update, then returns 204 with CORS allow-origin header', async () => {
    const db = buildDb();
    const app = createApp(db);
    const res = await request(app)
      .options('/api/update')
      .set('Origin', 'http://example.com')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  test('given a POST cross-origin request, then CORS header is present on the response', async () => {
    const db = buildDb();
    const app = createApp(db);
    const res = await request(app)
      .post('/api/update')
      .set('Origin', 'http://other.com')
      .send(defaultData);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});

describe('runMigrations', () => {
  test('given db missing preferences, then preferences set to default and write called', async () => {
    const db = buildDb();
    db.data.preferences = undefined as never;
    const writeSpy = vi.spyOn(db, 'write').mockResolvedValue();
    const result = await runMigrations(db);
    expect(result.migratedPreferences).toBe(true);
    expect(db.data.preferences).toEqual(defaultData.preferences);
    expect(writeSpy).toHaveBeenCalledTimes(1);
  });

  test('given db missing payoutConfig, then payoutConfig set to default and write called', async () => {
    const db = buildDb();
    db.data.payoutConfig = undefined as never;
    const writeSpy = vi.spyOn(db, 'write').mockResolvedValue();
    const result = await runMigrations(db);
    expect(result.migratedPayoutConfig).toBe(true);
    expect(db.data.payoutConfig).toEqual(defaultData.payoutConfig);
    expect(writeSpy).toHaveBeenCalledTimes(1);
  });

  test('given db missing both preferences and payoutConfig, then both set and write called twice', async () => {
    const db = buildDb();
    db.data.preferences = undefined as never;
    db.data.payoutConfig = undefined as never;
    const writeSpy = vi.spyOn(db, 'write').mockResolvedValue();
    const result = await runMigrations(db);
    expect(result.migratedPreferences).toBe(true);
    expect(result.migratedPayoutConfig).toBe(true);
    expect(result.writeCount).toBe(2);
    expect(writeSpy).toHaveBeenCalledTimes(2);
  });

  test('given db with both fields present, then no migration and no write', async () => {
    const db = buildDb();
    const writeSpy = vi.spyOn(db, 'write').mockResolvedValue();
    const result = await runMigrations(db);
    expect(result.migratedPreferences).toBe(false);
    expect(result.migratedPayoutConfig).toBe(false);
    expect(result.writeCount).toBe(0);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  test('given db with partial preferences (theme set, useSystemDefault missing), then NOT migrated, partial state preserved (locks current weakness)', async () => {
    const partial = { theme: 'dark' as const } as never;
    const db = buildDb({ preferences: partial });
    const writeSpy = vi.spyOn(db, 'write').mockResolvedValue();
    const result = await runMigrations(db);
    expect(result.migratedPreferences).toBe(false);
    expect(db.data.preferences).toEqual(partial);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  test('given db with empty data object, then both fields populated and two writes occur', async () => {
    const adapter = new Memory<TreasuryData>();
    const db = new Low<TreasuryData>(adapter, {} as TreasuryData);
    const writeSpy = vi.spyOn(db, 'write').mockResolvedValue();
    const result = await runMigrations(db);
    expect(result.migratedPreferences).toBe(true);
    expect(result.migratedPayoutConfig).toBe(true);
    expect(db.data.preferences).toEqual(defaultData.preferences);
    expect(db.data.payoutConfig).toEqual(defaultData.payoutConfig);
    expect(writeSpy).toHaveBeenCalledTimes(2);
  });

  test('given runMigrations is idempotent on already-migrated db, then second invocation is a no-op', async () => {
    const db = buildDb();
    db.data.preferences = undefined as never;
    const writeSpy = vi.spyOn(db, 'write').mockResolvedValue();
    await runMigrations(db);
    writeSpy.mockClear();
    const second = await runMigrations(db);
    expect(second.writeCount).toBe(0);
    expect(writeSpy).not.toHaveBeenCalled();
  });
});

describe('JSONFilePreset seeding', () => {
  let tmpDir: string;
  let originalNodeEnv: string | undefined;

  beforeEach(async () => {
    // lowdb's JSONFilePreset uses an in-memory adapter when NODE_ENV is "test".
    // override here so we exercise the real file adapter the server actually runs against.
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'treasury-seed-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    process.env.NODE_ENV = originalNodeEnv;
  });

  test('given no existing db file, when JSONFilePreset initializes, then defaultData is loaded into memory and persisted on first write', async () => {
    const dbPath = path.join(tmpDir, 'db.json');
    const db = await JSONFilePreset<TreasuryData>(dbPath, defaultData);
    expect(db.data).toEqual(defaultData);
    await db.write();
    const onDisk = JSON.parse(await fs.readFile(dbPath, 'utf-8'));
    expect(onDisk).toEqual(defaultData);
  });

  test('given existing db file with valid data, when JSONFilePreset initializes, then existing data is loaded and defaults are not reapplied', async () => {
    const dbPath = path.join(tmpDir, 'db.json');
    const existing: TreasuryData = { ...defaultData, baseSalary: 88888 };
    await fs.writeFile(dbPath, JSON.stringify(existing));
    const db = await JSONFilePreset<TreasuryData>(dbPath, defaultData);
    expect(db.data.baseSalary).toBe(88888);
  });

  test('given JSONFilePreset plus runMigrations, when an older db lacks preferences, then preferences are persisted to disk', async () => {
    const dbPath = path.join(tmpDir, 'db.json');
    const older = { ...defaultData };
    delete (older as Partial<TreasuryData>).preferences;
    await fs.writeFile(dbPath, JSON.stringify(older));
    const db = await JSONFilePreset<TreasuryData>(dbPath, defaultData);
    await runMigrations(db);
    const onDisk = JSON.parse(await fs.readFile(dbPath, 'utf-8'));
    expect(onDisk.preferences).toEqual(defaultData.preferences);
  });
});

describe('Static SPA serving', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'treasury-static-'));
    await fs.writeFile(path.join(tmpDir, 'index.html'), '<html>treasury-spa</html>');
    await fs.writeFile(path.join(tmpDir, 'asset.js'), 'console.log("asset")');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test('given serveStatic enabled with a staticDir, when GET /, then serves index.html', async () => {
    const db = buildDb();
    const app = createApp(db, { serveStatic: true, staticDir: tmpDir });
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('treasury-spa');
  });

  test('given serveStatic enabled, when GET unknown route, then SPA fallback serves index.html', async () => {
    const db = buildDb();
    const app = createApp(db, { serveStatic: true, staticDir: tmpDir });
    const res = await request(app).get('/some/deep/route');
    expect(res.status).toBe(200);
    expect(res.text).toContain('treasury-spa');
  });

  test('given serveStatic enabled, when GET /api/data, then api route still wins over SPA fallback', async () => {
    const db = buildDb();
    const app = createApp(db, { serveStatic: true, staticDir: tmpDir });
    const res = await request(app).get('/api/data');
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toHaveProperty('accounts');
  });

  test('given serveStatic enabled, when GET an existing asset path, then serves the asset content', async () => {
    const db = buildDb();
    const app = createApp(db, { serveStatic: true, staticDir: tmpDir });
    const res = await request(app).get('/asset.js');
    expect(res.status).toBe(200);
    expect(res.text).toContain('asset');
  });

  test('given serveStatic disabled, when GET /, then 404 (no fallback registered)', async () => {
    const db = buildDb();
    const app = createApp(db, { serveStatic: false });
    const res = await request(app).get('/');
    expect(res.status).toBe(404);
  });

  test('given serveStatic enabled but staticDir omitted, then static handlers are not registered and root is 404', async () => {
    const db = buildDb();
    const app = createApp(db, { serveStatic: true });
    const res = await request(app).get('/');
    expect(res.status).toBe(404);
  });
});

describe('resolveEnvironment', () => {
  test('given ENV value "staging", then returns Environment.STAGING', () => {
    expect(resolveEnvironment('staging')).toBe(Environment.STAGING);
  });

  test('given ENV value "production", then returns Environment.PRODUCTION', () => {
    expect(resolveEnvironment('production')).toBe(Environment.PRODUCTION);
  });

  test('given ENV undefined, then defaults to Environment.PRODUCTION', () => {
    expect(resolveEnvironment(undefined)).toBe(Environment.PRODUCTION);
  });

  test('given ENV empty string, then defaults to Environment.PRODUCTION', () => {
    expect(resolveEnvironment('')).toBe(Environment.PRODUCTION);
  });

  test('given ENV unknown value "local", then returns that value as-is (current loose typing, locks behavior)', () => {
    expect(resolveEnvironment('local')).toBe('local');
  });

  test('given ENV with surrounding whitespace, then returns the raw value (no trim, locks current behavior)', () => {
    expect(resolveEnvironment(' staging ')).toBe(' staging ');
  });
});

describe('resolveDbPath', () => {
  test('given STAGING, then uses ./db.json relative to baseDir', () => {
    expect(resolveDbPath(Environment.STAGING, '/some/base')).toBe('/some/base/db.json');
  });

  test('given PRODUCTION, then uses /app/data/db.json regardless of baseDir', () => {
    expect(resolveDbPath(Environment.PRODUCTION, '/some/base')).toBe('/app/data/db.json');
  });

  test('given an unknown environment value, then falls through to production path (locks current default)', () => {
    expect(resolveDbPath('local' as Environment, '/some/base')).toBe('/app/data/db.json');
  });
});
