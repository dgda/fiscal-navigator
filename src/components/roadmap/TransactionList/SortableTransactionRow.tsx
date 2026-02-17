import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, CheckCircle2, Circle, Repeat, Trash2 } from 'lucide-react';
import { Account, Transaction } from '../../../types';

interface SortableTransactionRowProps {
  tx: Transaction;
  onEdit: (id: string) => void;
  toggleExecution: (id: string) => void;
  getFullTypeName: (typeId: string) => string;
  checkIsIncome: (typeId: string) => boolean;
  checkIsTransfer: (typeId: string) => boolean;
  isHighlighted: boolean;
  onDeleteRequest: React.Dispatch<React.SetStateAction<Transaction | null>>;
  computedAccounts: Account[];
}

const SortableTransactionRow = (props: SortableTransactionRowProps) => {
  const {
    tx,
    onEdit,
    toggleExecution,
    getFullTypeName,
    checkIsIncome,
    checkIsTransfer,
    isHighlighted,
    onDeleteRequest,
    computedAccounts,
  } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tx.id,
  });

  const isIncome = checkIsIncome(tx.typeId);
  const isTransfer = checkIsTransfer(tx.typeId);
  const account = computedAccounts?.find((acc: Account) => tx.accountId === acc.id);

  const getAccentBg = () => {
    if (isIncome) return tx.isPaid ? 'bg-emerald-500' : 'bg-emerald-500/20';
    if (isTransfer) return tx.isPaid ? 'bg-violet-500' : 'bg-violet-500/20';
    return tx.isPaid ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600';
  };

  const getIconColor = () => {
    if (!tx.isPaid) return 'text-slate-300/80 dark:text-slate-600';
    if (isIncome) return 'text-emerald-500';
    if (isTransfer) return 'text-violet-500';
    return 'text-rose-500';
  };

  const getTextColor = () => {
    if (!tx.isPaid) return 'text-slate-500/80 dark:text-slate-400/80';
    if (isIncome) return 'text-emerald-700 dark:text-emerald-400';
    if (isTransfer) return 'text-violet-700 dark:text-violet-400';
    return 'text-rose-700 dark:text-rose-400';
  };

  const getMetadataColor = () =>
    tx.isPaid ? 'text-slate-400 dark:text-slate-400' : 'text-slate-400/60';

  const getCurrencyColor = () => {
    if (!tx.isPaid) return 'text-slate-400/80 dark:text-slate-500/80';
    if (isIncome) return 'text-emerald-600 dark:text-emerald-400';
    if (isTransfer) return 'text-violet-600 dark:text-violet-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const baseClasses =
    'bg-white dark:bg-[#1C1C1E] ' +
    'border-y border-r border-y-slate-100 border-r-slate-100 dark:border-y-white/5 dark:border-r-white/5 ' +
    'shadow-sm transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ' +
    'hover:-translate-y-[1px] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] ' +
    'dark:hover:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.5)]';

  return (
    <div
      ref={setNodeRef}
      id={`tx-row-${tx.id}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`group relative flex items-center justify-between overflow-hidden rounded-[12px] px-3 py-2 ${baseClasses} w-full max-w-[400px] shrink-0 ${
        isDragging ? 'z-50 scale-[1.02] shadow-2xl ring-1 ring-black/5' : ''
      } ${isHighlighted ? 'z-10 border-blue-500 shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)] ring-1 ring-blue-500/50' : ''}`}
    >
      <div
        className={`absolute bottom-0 left-0 top-0 w-[3px] transition-all duration-300 ${getAccentBg()}`}
      />
      <div className="flex min-w-0 flex-1 items-center gap-3 pl-0.5">
        <div className="flex shrink-0 items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-slate-300/60 transition-all hover:text-slate-400 dark:text-white/5 dark:hover:text-slate-600"
          >
            <GripVertical size={14} />
          </button>
          <button
            onClick={() => toggleExecution(tx.id)}
            className="shrink-0 transition-transform active:scale-90"
          >
            {tx.isPaid ? (
              <CheckCircle2 className={getIconColor()} size={18} />
            ) : (
              <Circle className="text-slate-300 dark:text-slate-600" size={18} />
            )}
          </button>
        </div>
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onEdit(tx.id)}>
          <div className="flex flex-col">
            <p
              className={`truncate text-[11px] ${tx.isPaid ? 'font-semibold' : 'font-medium'} ${getTextColor()}`}
            >
              {tx.name}
            </p>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span
                  className={`truncate text-[8px] font-normal uppercase tracking-[0.08em] ${getMetadataColor()}`}
                >
                  {getFullTypeName(tx.typeId)}
                </span>
                {tx.recurringGroupId && (
                  <Repeat
                    size={9}
                    className={`transition-all ${tx.isPaid ? 'text-blue-400/60' : 'text-blue-400/20'}`}
                  />
                )}
              </div>
              <span
                className={`shrink-0 font-mono text-[8px] font-normal tracking-tighter ${getMetadataColor()}`}
              >
                {account?.name || 'Unassigned Account'}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="ml-3 flex shrink-0 items-center gap-3">
        <span
          className={`font-mono text-[11px] font-black tabular-nums tracking-tight ${getCurrencyColor()}`}
        >
          <span className="mr-px text-[9px] font-medium opacity-40">₱</span>
          {tx.amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRequest(tx);
          }}
          className="text-slate-300/60 transition-all hover:!text-red-500 dark:text-white/5"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default SortableTransactionRow;
