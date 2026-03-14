import React, { useMemo } from 'react';
import { Account, TransactionType, TreasuryData } from '../../../../types';
import { useTreasury } from '../../../../context/TreasuryContext';
import { ChevronRight, Edit3, Trash2, Layers, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface TransactionCategoriesSectionProps {
  sectionClass: string;
  headerClass: string;
  handleUpdate: (next: TreasuryData) => Promise<void>;
  editingId: string | null;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  expandedNodes: Set<string>;
  setDeleteCandidate: (
    value: React.SetStateAction<{
      type: 'account' | 'taxonomy';
      item: Account | TransactionType;
    } | null>,
  ) => void;
  toggleNode: (id: string) => void;
  saveEdit: (
    id: string,
    updates: {
      name: string;
    },
    type: 'accounts' | 'types',
  ) => void;
}

const TransactionCategoriesSection: React.FC<TransactionCategoriesSectionProps> = (props) => {
  const {
    sectionClass,
    headerClass,
    handleUpdate,
    editingId,
    setEditingId,
    expandedNodes,
    setDeleteCandidate,
    toggleNode,
    saveEdit,
  } = props;

  const { data, renderTypeOptions } = useTreasury();

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

  return (
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
          onSubmit={(e: React.SubmitEvent<HTMLFormElement>) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            handleUpdate({
              ...data,
              types: [
                ...data.types,
                {
                  id: uuidv4(),
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
  );
};

export default TransactionCategoriesSection;
