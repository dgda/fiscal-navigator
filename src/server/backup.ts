import fs from 'node:fs/promises';
import path from 'node:path';

export const SNAPSHOT_PATTERN = /^db\.\d{4}-\d{2}-\d{2}\.json$/;
export const ROLLING_BACKUP_NAME = 'db.json.bak';

export interface BackupEntry {
  /** Filename only — no path. Safe to round-trip through the API. */
  filename: string;
  /** Type of backup: 'snapshot' (daily) or 'rolling' (pre-write .bak). */
  kind: 'snapshot' | 'rolling';
  /** ISO date string for snapshots, last-modified time for rolling backup. */
  date: string;
  /** File size in bytes. */
  size: number;
}

/**
 * Lists all available backups for the given dbPath: the rolling pre-write backup
 * (if it exists) plus all daily snapshots under {dbDir}/backups/.
 * Sorted newest-first.
 */
export async function listBackups(dbPath: string): Promise<BackupEntry[]> {
  const dbDir = path.dirname(dbPath);
  const dbFilename = path.basename(dbPath);
  const snapshotDir = path.join(dbDir, 'backups');
  const entries: BackupEntry[] = [];

  // Rolling pre-write backup
  try {
    const stat = await fs.stat(path.join(dbDir, `${dbFilename}.bak`));
    entries.push({
      filename: `${dbFilename}.bak`,
      kind: 'rolling',
      date: stat.mtime.toISOString(),
      size: stat.size,
    });
  } catch {
    // no rolling backup yet
  }

  // Daily snapshots
  try {
    const files = await fs.readdir(snapshotDir);
    const snaps = files.filter((f) => SNAPSHOT_PATTERN.test(f));
    for (const f of snaps) {
      const stat = await fs.stat(path.join(snapshotDir, f));
      const dateMatch = f.match(/^db\.(\d{4}-\d{2}-\d{2})\.json$/);
      entries.push({
        filename: f,
        kind: 'snapshot',
        date: dateMatch ? dateMatch[1] : stat.mtime.toISOString(),
        size: stat.size,
      });
    }
  } catch {
    // no snapshots dir yet
  }

  // Newest first: rolling .bak (mtime), then snapshots by date desc.
  entries.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
  return entries;
}

/**
 * Resolves a sanitized backup filename to its absolute path on disk.
 * Returns null if the filename is unsafe or doesn't match a known backup pattern.
 */
export function resolveBackupPath(dbPath: string, filename: string): string | null {
  // Reject any path traversal characters outright.
  if (
    !filename ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('..') ||
    filename.startsWith('.')
  ) {
    return null;
  }
  const dbDir = path.dirname(dbPath);
  const dbFilename = path.basename(dbPath);

  if (filename === `${dbFilename}.bak`) {
    return path.join(dbDir, filename);
  }
  if (SNAPSHOT_PATTERN.test(filename)) {
    return path.join(dbDir, 'backups', filename);
  }
  return null;
}

/**
 * Reads, validates, and returns the parsed JSON contents of the given backup.
 * Throws if the file is missing, unreadable, or invalid JSON.
 */
export async function readBackup(dbPath: string, filename: string): Promise<unknown> {
  const resolved = resolveBackupPath(dbPath, filename);
  if (!resolved) throw new Error('invalid backup filename');
  const raw = await fs.readFile(resolved, 'utf-8');
  return JSON.parse(raw);
}

export async function backupBeforeWrite(dbPath: string): Promise<boolean> {
  try {
    await fs.copyFile(dbPath, `${dbPath}.bak`);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw err;
  }
}

export async function snapshotDaily(
  dbPath: string,
  retainDays: number = 7,
  today: string = new Date().toISOString().slice(0, 10),
): Promise<string | null> {
  const dir = path.join(path.dirname(dbPath), 'backups');
  await fs.mkdir(dir, { recursive: true });

  const snapPath = path.join(dir, `db.${today}.json`);
  try {
    await fs.access(snapPath);
    return null;
  } catch {
    // not created yet today
  }

  try {
    await fs.copyFile(dbPath, snapPath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }

  await pruneOldSnapshots(dir, retainDays);
  return snapPath;
}

async function pruneOldSnapshots(dir: string, retainDays: number): Promise<void> {
  const entries = await fs.readdir(dir);
  const snapshots = entries.filter((f) => SNAPSHOT_PATTERN.test(f)).sort();
  const excess = snapshots.length - retainDays;
  if (excess <= 0) return;
  const toDelete = snapshots.slice(0, excess);
  await Promise.all(toDelete.map((f) => fs.unlink(path.join(dir, f))));
}
