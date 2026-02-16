import React, { useState, useMemo } from 'react';
import { useTreasury } from '../../context/TreasuryContext';
import {
  Layers,
  Trash2,
  Landmark,
  Plus,
  Edit3,
  ChevronRight,
  Activity,
  Zap,
  Loader2,
  Wallet,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';
import { TransactionType, PayoutArchetype, Account } from '../../types';

export const SettingsPanel: React.FC = () => {
  const { data, sync, computedAccounts, renderTypeOptions, updatePayoutConfig, loading } =
    useTreasury();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Safety State for Deletion
  const [deleteCandidate, setDeleteCandidate] = useState<{
    type: 'account' | 'taxonomy';
    item: Account | TransactionType;
  } | null>(null);

  // SAFETY GATE
  if (loading || !data?.payoutConfig) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-[#F5F5F7] dark:bg-[#000000]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-black/5 dark:bg-[#1C1C1E] dark:ring-white/10">
            <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={20} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Synchronizing Treasury
          </p>
        </div>
      </div>
    );
  }

  const handleUpdate = (next: any) => sync(next);

  const executeDelete = () => {
    if (!deleteCandidate) return;

    if (deleteCandidate.type === 'account') {
      handleUpdate({
        ...data,
        accounts: data.accounts.filter((x) => x.id !== deleteCandidate.item.id),
      });
    } else {
      handleUpdate({
        ...data,
        types: data.types.filter((t) => t.id !== deleteCandidate.item.id),
      });
    }
    setDeleteCandidate(null);
  };

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveEdit = (id: string, updates: any, type: 'accounts' | 'types') => {
    const nextData = {
      ...data,
      [type]: data[type].map((item: any) => (item.id === id ? { ...item, ...updates } : item)),
    };
    handleUpdate(nextData);
    setEditingId(null);
  };

  const getTypeTotal = useMemo(() => {
    const memo: Record<string, number> = {};
    const calculate = (typeId: string): number => {
      if (memo[typeId] !== undefined) return memo[typeId];
      const direct = data.transactions
        .filter((tx) => tx.typeId === typeId)
        .reduce((a, b) => a + b.amount, 0);
      const children = data.types
        .filter((t) => t.parent_type === typeId)
        .reduce((a, b) => a + calculate(b.id), 0);
      const total = direct + children;
      memo[typeId] = total;
      return total;
    };
    return calculate;
  }, [data.transactions, data.types]);

  const TypeNode = ({ type, depth = 0 }: { type: TransactionType; depth?: number }) => {
    const children = data.types.filter((child) => child.parent_type === type.id);
    const hasTransactions = data.transactions.some((tx) => tx.typeId === type.id);
    const isExpanded = expandedNodes.has(type.id);
    const total = getTypeTotal(type.id);

    return (
      <div className="relative flex flex-col">
        <div
          className={`group flex items-center justify-between rounded-xl px-3 py-2 transition-all ${depth === 0 ? 'mb-1 bg-white shadow-sm ring-1 ring-black/5 dark:bg-[#1C1C1E]' : 'hover:bg-black/[0.02] dark:hover:bg-white/5'}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => (children.length > 0 || hasTransactions) && toggleNode(type.id)}
              className={`${children.length === 0 && !hasTransactions ? 'invisible' : ''}`}
            >
              <ChevronRight
                size={12}
                className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            </button>
            {editingId === type.id ? (
              <input
                autoFocus
                className="bg-transparent text-[11px] font-bold text-blue-600 outline-none"
                defaultValue={type.name}
                onBlur={(e) => saveEdit(type.id, { name: e.target.value }, 'types')}
                onKeyDown={(e) =>
                  e.key === 'Enter' && saveEdit(type.id, { name: e.currentTarget.value }, 'types')
                }
              />
            ) : (
              <span
                className={`truncate text-[11px] font-bold ${depth === 0 ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}
              >
                {type.name}
              </span>
            )}
            {total > 0 && (
              <span className="font-mono text-[9px] font-black text-blue-500/70">
                ₱{total.toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              className="text-slate-300 hover:text-blue-500"
              onClick={() => setEditingId(type.id)}
            >
              <Edit3 size={12} />
            </button>
            <button
              className="text-slate-300 hover:text-rose-500"
              onClick={() => setDeleteCandidate({ type: 'taxonomy', item: type })}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="ml-6 border-l border-black/5 pl-2 dark:border-white/5">
            {data.transactions
              .filter((tx) => tx.typeId === type.id)
              .map((tx) => (
                <div
                  key={tx.id}
                  className="flex justify-between px-2 py-1 text-[9px] font-medium text-slate-400"
                >
                  <span>{tx.name}</span>
                  <span className="font-mono">₱{tx.amount.toLocaleString()}</span>
                </div>
              ))}
            {children.map((c) => (
              <TypeNode key={c.id} type={c} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // --- LUXURY STYLES ---
  const sectionClass =
    'overflow-hidden rounded-[24px] border border-black/5 bg-[#FBFBFD] shadow-sm dark:border-white/5 dark:bg-[#141416]';
  const headerClass =
    'flex items-center justify-between border-b border-black/5 px-6 py-4 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] backdrop-blur-md';
  const labelClass =
    'mb-2 block text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500';
  const inputClass =
    'w-full rounded-xl border border-black/5 bg-white px-4 py-2.5 text-[11px] font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/10 dark:border-white/5 dark:bg-[#1C1C1E] dark:text-white';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F5F5F7] dark:bg-[#000000]">
      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* 1. PAYROLL PROTOCOL */}
          <section className={sectionClass}>
            <header className={headerClass}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 shadow-sm">
                  <Zap size={18} fill="currentColor" />
                </div>
                <div>
                  <h2 className="text-[13px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    Payroll Protocol
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400">System Payout Anchors</p>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-8 p-8 md:grid-cols-3">
              <div>
                <label className={labelClass}>Archetype</label>
                <select
                  value={data.payoutConfig.archetype}
                  onChange={(e) =>
                    updatePayoutConfig({ archetype: e.target.value as PayoutArchetype })
                  }
                  className={inputClass}
                >
                  <option value="bi-weekly">Bi-Weekly</option>
                  <option value="semi-monthly">Semi-Monthly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {data.payoutConfig.archetype === 'semi-monthly' && (
                <>
                  <div>
                    <label className={labelClass}>Primary Day</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={data.payoutConfig.semiMonthlyDays[0]}
                      onChange={(e) =>
                        updatePayoutConfig({
                          semiMonthlyDays: [
                            Number(e.target.value),
                            data.payoutConfig.semiMonthlyDays[1],
                          ],
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Secondary Day</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={data.payoutConfig.semiMonthlyDays[1]}
                      onChange={(e) =>
                        updatePayoutConfig({
                          semiMonthlyDays: [
                            data.payoutConfig.semiMonthlyDays[0],
                            Number(e.target.value),
                          ],
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                </>
              )}

              {data.payoutConfig.archetype === 'bi-weekly' && (
                <>
                  <div>
                    <label className={labelClass}>Anchor Date</label>
                    <input
                      type="date"
                      value={data.payoutConfig.anchorDate}
                      onChange={(e) => updatePayoutConfig({ anchorDate: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Cycle Days</label>
                    <input
                      type="number"
                      value={data.payoutConfig.fixedIntervalDays}
                      onChange={(e) =>
                        updatePayoutConfig({ fixedIntervalDays: Number(e.target.value) })
                      }
                      className={inputClass}
                    />
                  </div>
                </>
              )}

              {data.payoutConfig.archetype === 'monthly' && (
                <div>
                  <label className={labelClass}>Monthly Day</label>
                  <input
                    type="number"
                    value={data.payoutConfig.monthlyDay}
                    onChange={(e) => updatePayoutConfig({ monthlyDay: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
            {/* 2. CAPITAL INFRASTRUCTURE */}
            <section className={sectionClass}>
              <header className={headerClass}>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                    <Wallet size={18} />
                  </div>
                  <h2 className="text-[13px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    Capital Infrastructure
                  </h2>
                </div>
              </header>

              <div className="p-6">
                <form
                  onSubmit={(e: any) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    handleUpdate({
                      ...data,
                      accounts: [
                        ...data.accounts,
                        {
                          id: crypto.randomUUID(),
                          name: f.get('name') as string,
                          color: f.get('color') as string,
                          startingBalance: Number(f.get('startingBalance')),
                        },
                      ],
                    });
                    e.currentTarget.reset();
                  }}
                  className="mb-6 flex gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5 dark:bg-white/5"
                >
                  <input
                    name="name"
                    placeholder="Label"
                    className="flex-1 bg-transparent px-3 text-[11px] font-bold outline-none dark:text-white"
                    required
                  />
                  <input
                    name="startingBalance"
                    type="number"
                    placeholder="0.00"
                    className="w-24 bg-transparent text-right font-mono text-[11px] font-bold outline-none dark:text-white"
                    required
                  />
                  <input
                    name="color"
                    type="color"
                    defaultValue="#3b82f6"
                    className="h-8 w-8 cursor-pointer rounded-lg border-none bg-transparent"
                  />
                  <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg transition-transform active:scale-95 dark:bg-blue-600">
                    <Plus size={16} />
                  </button>
                </form>

                <div className="space-y-3">
                  {computedAccounts.map((acc) => {
                    const isExpanded = expandedNodes.has(acc.id);
                    const isEditing = editingId === acc.id;
                    const accountTxs = data.transactions.filter(
                      (t) => t.accountId === acc.id || t.toAccountId === acc.id,
                    );

                    return (
                      <div
                        key={acc.id}
                        className="group rounded-2xl border border-black/5 bg-white p-4 transition-all hover:shadow-md dark:border-white/5 dark:bg-[#1C1C1E]"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className="h-3 w-3 shrink-0 rounded-full"
                              style={{ backgroundColor: acc.color }}
                            />
                            <div className="min-w-0">
                              {isEditing ? (
                                <input
                                  autoFocus
                                  className="w-full bg-transparent text-[11px] font-black text-blue-500 outline-none"
                                  defaultValue={acc.name}
                                  onBlur={(e) =>
                                    saveEdit(acc.id, { name: e.target.value }, 'accounts')
                                  }
                                  onKeyDown={(e) =>
                                    e.key === 'Enter' &&
                                    saveEdit(acc.id, { name: e.currentTarget.value }, 'accounts')
                                  }
                                />
                              ) : (
                                <span className="block truncate text-[11px] font-black dark:text-white">
                                  {acc.name}
                                </span>
                              )}
                              <span className="font-mono text-[10px] font-bold text-slate-400">
                                ₱{acc.balance?.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <div className="mr-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                onClick={() => setEditingId(acc.id)}
                                className="p-1.5 text-slate-300 hover:text-blue-500"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteCandidate({ type: 'account', item: acc })}
                                className="p-1.5 text-slate-300 hover:text-rose-500"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <button
                              onClick={() => toggleNode(acc.id)}
                              className={`rounded-lg p-1.5 transition-colors ${isExpanded ? 'bg-blue-500 text-white' : 'text-slate-300 hover:bg-black/5'}`}
                            >
                              <Activity size={14} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="no-scrollbar mt-4 max-h-48 space-y-1 overflow-y-auto border-t border-black/5 pt-3 dark:border-white/5">
                            {accountTxs.length === 0 ? (
                              <p className="text-[9px] italic text-slate-400">No ledger history.</p>
                            ) : (
                              accountTxs.map((t) => (
                                <div
                                  key={t.id}
                                  className="flex justify-between rounded px-1 py-1 text-[9px] font-medium hover:bg-black/[0.02]"
                                >
                                  <span className="mr-4 truncate text-slate-500">{t.name}</span>
                                  <span
                                    className={`shrink-0 font-mono ${t.isPaid ? 'text-blue-500' : 'text-slate-300'}`}
                                  >
                                    {t.accountId === acc.id &&
                                    !data.types
                                      .find((x) => x.id === t.typeId)
                                      ?.name.includes('Income')
                                      ? '-'
                                      : '+'}
                                    ₱{t.amount.toLocaleString()}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* 3. COGNITIVE TAXONOMY */}
            <section className={sectionClass}>
              <header className={headerClass}>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                    <Layers size={18} />
                  </div>
                  <h2 className="text-[13px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    Taxonomy
                  </h2>
                </div>
              </header>

              <div className="flex flex-col overflow-hidden p-6">
                {/* RESTORED ADD CATEGORY FORM */}
                <form
                  onSubmit={(e: any) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    handleUpdate({
                      ...data,
                      types: [
                        ...data.types,
                        {
                          id: crypto.randomUUID(),
                          name: f.get('name') as string,
                          parent_type: (f.get('parent_type') as string) || null,
                        },
                      ],
                    });
                    e.currentTarget.reset();
                  }}
                  className="mb-6 flex gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5 dark:bg-white/5"
                >
                  <input
                    name="name"
                    placeholder="New Category"
                    className="flex-1 bg-transparent px-3 text-[11px] font-bold outline-none dark:text-white"
                    required
                  />
                  <select
                    name="parent_type"
                    className="max-w-[100px] bg-transparent text-[10px] font-bold text-slate-400 outline-none"
                  >
                    <option value="">Root Level</option>
                    {renderTypeOptions()}
                  </select>
                  <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg transition-transform active:scale-95 dark:bg-purple-600">
                    <Plus size={16} />
                  </button>
                </form>

                <div className="no-scrollbar max-h-[600px] overflow-y-auto">
                  {data.types
                    .filter((t) => !t.parent_type)
                    .map((root) => (
                      <TypeNode key={root.id} type={root} />
                    ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteCandidate && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30 p-4 backdrop-blur-md"
          onClick={() => setDeleteCandidate(null)}
        >
          <div
            className="animate-in zoom-in-95 w-[280px] overflow-hidden rounded-[24px] bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:bg-[#1C1C1E]/95 dark:ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center p-6 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-500/20">
                <AlertTriangle size={18} />
              </div>
              <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">
                Confirm Deletion
              </h3>
              <p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                Are you sure you want to remove this {deleteCandidate.type}?
                <span className="mt-1 block font-black text-slate-900 dark:text-white">
                  "{deleteCandidate.item.name}"
                </span>
                This action cannot be undone.
              </p>
            </div>
            <div className="flex flex-col border-t border-black/5 dark:border-white/5">
              <button
                onClick={executeDelete}
                className="py-3.5 text-[11px] font-bold text-red-600 transition-colors hover:bg-black/[0.02] dark:text-red-500 dark:hover:bg-white/5"
              >
                Delete {deleteCandidate.type === 'account' ? 'Account' : 'Category'}
              </button>
              <button
                onClick={() => setDeleteCandidate(null)}
                className="border-t border-black/5 py-3.5 text-[11px] font-bold text-slate-400 transition-colors hover:bg-black/[0.02] dark:border-white/5 dark:hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
