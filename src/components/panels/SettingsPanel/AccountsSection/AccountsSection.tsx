import React from 'react';
import { Account, TransactionType, TreasuryData } from '../../../../types';
import { useTreasury } from '../../../../context/TreasuryContext';
import { Activity, Edit3, Plus, Trash2, Wallet } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface AccountsSectionProps {
  sectionClass: string;
  headerClass: string;
  handleUpdate: (next: TreasuryData) => Promise<void>;
  expandedNodes: Set<string>;
  editingId: string | null;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  saveEdit: (
    id: string,
    updates: {
      name: string;
    },
    type: 'accounts' | 'types',
  ) => void;
  setDeleteCandidate: React.Dispatch<
    React.SetStateAction<{
      type: 'account' | 'taxonomy';
      item: Account | TransactionType;
    } | null>
  >;
  toggleNode: (id: string) => void;
}

const AccountsSection: React.FC<AccountsSectionProps> = (props) => {
  const {
    sectionClass,
    headerClass,
    handleUpdate,
    expandedNodes,
    editingId,
    setEditingId,
    saveEdit,
    setDeleteCandidate,
    toggleNode,
  } = props;

  const { data, computedAccounts, currencySymbol } = useTreasury();

  return (
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
          onSubmit={(e: React.SubmitEvent<HTMLFormElement>) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            handleUpdate({
              ...data,
              accounts: [
                ...data.accounts,
                {
                  id: uuidv4(),
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
                className="group rounded-2xl border border-black/5 bg-white p-4 transition-all hover:shadow-md dark:border-white/5 dark:bg-[#2C2C2E]"
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
                          onBlur={(e) => saveEdit(acc.id, { name: e.target.value }, 'accounts')}
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
                        {currencySymbol}
                        {acc.balance?.toLocaleString()}
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
                            !data.types.find((x) => x.id === t.typeId)?.name.includes('Income')
                              ? '-'
                              : '+'}
                            {currencySymbol}
                            {t.amount.toLocaleString()}
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
  );
};

export default AccountsSection;
