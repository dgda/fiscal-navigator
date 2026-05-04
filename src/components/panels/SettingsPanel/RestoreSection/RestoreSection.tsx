import React, { useCallback, useEffect, useState } from 'react';
import { Archive, History, RefreshCw } from 'lucide-react';
import { API_URL } from '../../../../constants';
import { useTreasury } from '../../../../context/TreasuryContext';

interface BackupEntry {
  filename: string;
  kind: 'snapshot' | 'rolling';
  date: string;
  size: number;
}

interface RestoreSectionProps {
  sectionClass: string;
  headerClass: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const RestoreSection: React.FC<RestoreSectionProps> = ({ sectionClass, headerClass }) => {
  const { dismissNotification } = useTreasury();
  const [entries, setEntries] = useState<BackupEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<BackupEntry | null>(null);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(`${API_URL}/api/backups`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setLoadError(body?.error ?? `failed: ${res.status}`);
        setEntries([]);
        return;
      }
      const body = (await res.json()) as { backups: BackupEntry[] };
      setEntries(body.backups);
    } catch (err) {
      setLoadError((err as Error).message);
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmRestore = async () => {
    if (!pending) return;
    setRestoring(true);
    try {
      const res = await fetch(`${API_URL}/api/backups/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: pending.filename }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setLoadError(body?.error ?? `restore failed: ${res.status}`);
        return;
      }
      setPending(null);
      dismissNotification();
      // Force a hard reload so every consumer rebinds to the restored state.
      window.location.reload();
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <section className={sectionClass}>
      <header className={headerClass}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 shadow-sm">
            <Archive size={18} />
          </div>
          <div>
            <h2 className="text-[13px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Restore From Backup
            </h2>
            <p className="text-[10px] font-bold text-slate-400">
              Roll Back To A Previous Snapshot
            </p>
          </div>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-1.5 rounded-md border border-black/5 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 dark:border-white/5 dark:bg-[#2C2C2E] dark:text-slate-300 dark:hover:bg-white/5"
        >
          <RefreshCw size={11} /> Refresh
        </button>
      </header>

      <div className="p-6">
        {loadError && (
          <p className="mb-3 text-[11px] font-medium text-rose-500">Error: {loadError}</p>
        )}
        {entries === null ? (
          <p className="text-[11px] text-slate-400">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-[11px] text-slate-400">
            No backups yet. They appear automatically after the first save.
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li
                key={e.filename}
                className="flex items-center justify-between rounded-xl border border-black/5 bg-white px-4 py-3 dark:border-white/5 dark:bg-[#2C2C2E]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <History
                      size={12}
                      className={
                        e.kind === 'rolling'
                          ? 'text-amber-500'
                          : 'text-slate-400 dark:text-slate-500'
                      }
                    />
                    <span className="truncate text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      {e.filename}
                    </span>
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-slate-500 dark:bg-white/5 dark:text-slate-400">
                      {e.kind}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[9px] text-slate-400 dark:text-slate-500">
                    {e.date} · {formatBytes(e.size)}
                  </p>
                </div>
                <button
                  onClick={() => setPending(e)}
                  className="rounded-lg bg-blue-500 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-blue-600"
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pending && (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/30 p-4 backdrop-blur-md"
          onClick={() => !restoring && setPending(null)}
        >
          <div
            className="w-[320px] overflow-hidden rounded-[24px] bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:bg-[#2C2C2E]/95 dark:ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center p-6 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                <History size={18} />
              </div>
              <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">
                Restore from <span className="font-mono">{pending.filename}</span>?
              </h3>
              <p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                This will replace your current data with the contents of this backup. The
                current state will be saved as <span className="font-mono">db.json.bak</span>{' '}
                automatically before the restore. The page will reload after restoring.
              </p>
            </div>
            <div className="flex flex-col border-t border-black/5 dark:border-white/5">
              <button
                onClick={confirmRestore}
                disabled={restoring}
                className="py-3.5 text-[11px] font-bold text-blue-600 transition-colors hover:bg-black/[0.02] disabled:opacity-50 dark:text-blue-400 dark:hover:bg-white/5"
              >
                {restoring ? 'Restoring…' : 'Restore'}
              </button>
              <button
                onClick={() => setPending(null)}
                disabled={restoring}
                className="border-t border-black/5 py-3.5 text-[11px] font-bold text-slate-400 transition-colors hover:bg-black/[0.02] disabled:opacity-50 dark:border-white/5 dark:hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default RestoreSection;
