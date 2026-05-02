import fs from 'node:fs/promises';
import path from 'node:path';

const SNAPSHOT_PATTERN = /^db\.\d{4}-\d{2}-\d{2}\.json$/;

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
