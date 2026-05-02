import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { backupBeforeWrite, snapshotDaily } from '../src/server/backup';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'treasury-backup-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('backupBeforeWrite', () => {
  test('given an existing db file, then writes db.json.bak with identical contents', async () => {
    const dbPath = path.join(tmpDir, 'db.json');
    await fs.writeFile(dbPath, '{"a":1}');
    const ok = await backupBeforeWrite(dbPath);
    expect(ok).toBe(true);
    expect(await fs.readFile(`${dbPath}.bak`, 'utf-8')).toBe('{"a":1}');
  });

  test('given the db file does not exist, then returns false and creates no .bak', async () => {
    const dbPath = path.join(tmpDir, 'missing.json');
    const ok = await backupBeforeWrite(dbPath);
    expect(ok).toBe(false);
    await expect(fs.access(`${dbPath}.bak`)).rejects.toThrow();
  });

  test('given an existing .bak from a prior write, then it is overwritten with the latest contents', async () => {
    const dbPath = path.join(tmpDir, 'db.json');
    await fs.writeFile(dbPath, '{"v":1}');
    await backupBeforeWrite(dbPath);
    await fs.writeFile(dbPath, '{"v":2}');
    await backupBeforeWrite(dbPath);
    expect(await fs.readFile(`${dbPath}.bak`, 'utf-8')).toBe('{"v":2}');
  });
});

describe('snapshotDaily', () => {
  test('given no snapshot exists for today, then creates backups/db.YYYY-MM-DD.json', async () => {
    const dbPath = path.join(tmpDir, 'db.json');
    await fs.writeFile(dbPath, '{"x":1}');
    const created = await snapshotDaily(dbPath, 7, '2026-05-02');
    expect(created).toBe(path.join(tmpDir, 'backups', 'db.2026-05-02.json'));
    expect(await fs.readFile(created!, 'utf-8')).toBe('{"x":1}');
  });

  test('given today’s snapshot already exists, then returns null and does not overwrite', async () => {
    const dbPath = path.join(tmpDir, 'db.json');
    await fs.writeFile(dbPath, '{"x":1}');
    await snapshotDaily(dbPath, 7, '2026-05-02');
    await fs.writeFile(dbPath, '{"x":2}');
    const second = await snapshotDaily(dbPath, 7, '2026-05-02');
    expect(second).toBeNull();
    const snap = await fs.readFile(path.join(tmpDir, 'backups', 'db.2026-05-02.json'), 'utf-8');
    expect(snap).toBe('{"x":1}');
  });

  test('given more snapshots than retainDays, then prunes oldest first', async () => {
    const dbPath = path.join(tmpDir, 'db.json');
    await fs.writeFile(dbPath, '{}');
    const dates = [
      '2026-04-25',
      '2026-04-26',
      '2026-04-27',
      '2026-04-28',
      '2026-04-29',
      '2026-04-30',
      '2026-05-01',
      '2026-05-02',
    ];
    for (const d of dates) {
      await snapshotDaily(dbPath, 7, d);
    }
    const remaining = (await fs.readdir(path.join(tmpDir, 'backups'))).sort();
    expect(remaining).toEqual([
      'db.2026-04-26.json',
      'db.2026-04-27.json',
      'db.2026-04-28.json',
      'db.2026-04-29.json',
      'db.2026-04-30.json',
      'db.2026-05-01.json',
      'db.2026-05-02.json',
    ]);
  });

  test('given the db file does not exist, then returns null and creates no snapshot', async () => {
    const dbPath = path.join(tmpDir, 'missing.json');
    const created = await snapshotDaily(dbPath, 7, '2026-05-02');
    expect(created).toBeNull();
    await expect(fs.access(path.join(tmpDir, 'backups', 'db.2026-05-02.json'))).rejects.toThrow();
  });

  test('given the backups dir does not yet exist, then it is created', async () => {
    const dbPath = path.join(tmpDir, 'db.json');
    await fs.writeFile(dbPath, '{}');
    await snapshotDaily(dbPath, 7, '2026-05-02');
    const stat = await fs.stat(path.join(tmpDir, 'backups'));
    expect(stat.isDirectory()).toBe(true);
  });

  test('given retainDays of 1, then only the newest snapshot survives', async () => {
    const dbPath = path.join(tmpDir, 'db.json');
    await fs.writeFile(dbPath, '{}');
    await snapshotDaily(dbPath, 1, '2026-05-01');
    await snapshotDaily(dbPath, 1, '2026-05-02');
    const remaining = (await fs.readdir(path.join(tmpDir, 'backups'))).sort();
    expect(remaining).toEqual(['db.2026-05-02.json']);
  });
});
