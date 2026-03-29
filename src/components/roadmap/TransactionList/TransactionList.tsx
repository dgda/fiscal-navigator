import React, { useMemo, useState, useEffect } from 'react';
import { useTreasury } from '../../../context/TreasuryContext';
import { Transaction } from '../../../types';
import { RoadmapCycle } from '../../../types/roadmap';
import { format, parseISO } from 'date-fns';
import SortableTransactionRow from './SortableTransactionRow';
import { Search, X } from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface TransactionListProps {
  ref: React.Ref<HTMLDivElement> | undefined;
  cycleData: RoadmapCycle;
  onEdit: (id: string) => void;
  highlightId: string | null;
  setDeleteCandidate: React.Dispatch<React.SetStateAction<Transaction | null>>;
}

const TransactionList: React.FC<TransactionListProps> = (props) => {
  const { ref, cycleData, onEdit, highlightId, setDeleteCandidate } = props;

  /** * DEBOUNCE LOGIC
   * localSearchTerm: Updates immediately for a responsive UI.
   * debouncedSearchQuery: The "source of truth" for the expensive filter/sort logic.
   */
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    // Set a timer to update the actual search query after 300ms of inactivity
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(localSearchTerm);
    }, 300);

    // If the user types again before 300ms, clear the previous timer
    return () => {
      clearTimeout(handler);
    };
  }, [localSearchTerm]);

  const {
    toggleExecution,
    sync,
    data,
    getFullTypeName,
    checkIsIncome,
    checkIsTransfer,
    computedAccounts,
  } = useTreasury();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /**
   * Processed Transactions Pipeline:
   * This is the "heavy" part. By depending on 'debouncedSearchQuery' instead of
   * 'localSearchTerm', we ensure this calculation doesn't fire on every keystroke.
   */
  const processedTxs = useMemo(() => {
    let results = [...cycleData.txs];

    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      results = results.filter((tx) => {
        const typeName = getFullTypeName(tx.typeId).toLowerCase();
        const account = computedAccounts.find((a) => a.id === tx.accountId);
        const accountName = account?.name.toLowerCase() || '';
        const amountStr = tx.amount.toString();

        return (
          tx.name.toLowerCase().includes(query) ||
          typeName.includes(query) ||
          accountName.includes(query) ||
          amountStr.includes(query)
        );
      });
    }

    return results.sort((a: Transaction, b: Transaction) => {
      if (a.isPlanned !== b.isPlanned) return a.isPlanned ? -1 : 1;
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return cycleData.txs.indexOf(a) - cycleData.txs.indexOf(b);
    });
  }, [cycleData.txs, debouncedSearchQuery, getFullTypeName, computedAccounts]);

  const firstAccruedId = useMemo(
    () => processedTxs.find((t: Transaction) => t.isPlanned)?.id,
    [processedTxs],
  );
  const firstOperatingId = useMemo(
    () => processedTxs.find((t: Transaction) => !t.isPlanned)?.id,
    [processedTxs],
  );
  const showAccruedSeparator = useMemo(
    () => processedTxs.some((t: Transaction) => t.isPlanned),
    [processedTxs],
  );
  const showOperatingSeparator = useMemo(
    () => processedTxs.some((t: Transaction) => !t.isPlanned),
    [processedTxs],
  );

  // Immediate clear function for the "X" button
  const handleClearSearch = () => {
    setLocalSearchTerm('');
    setDebouncedSearchQuery('');
  };

  return (
    <div
      ref={ref}
      className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4"
    >
      <div className="sticky top-0 z-[70] -mx-4 mb-2 bg-[#F5F5F7] px-4 py-2 dark:bg-[#0A0A0B]">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search cycle transactions..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-black/5 bg-white py-2 pl-9 pr-8 text-[11px] placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-blue-500/10 dark:border-white/5 dark:bg-[#1C1C1E] dark:text-slate-200"
          />
          {localSearchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e) => {
          const { active, over } = e;
          // Drag and drop is only allowed when not filtering
          if (!localSearchTerm && over && active.id !== over.id) {
            const cycleTxs = data.transactions.filter(
              (t: Transaction) => t.cycleKey === cycleData.key,
            );
            const otherTxs = data.transactions.filter(
              (t: Transaction) => t.cycleKey !== cycleData.key,
            );
            const oldIdx = cycleTxs.findIndex((t: Transaction) => t.id === active.id);
            const newIdx = cycleTxs.findIndex((t: Transaction) => t.id === over.id);
            sync({
              ...data,
              transactions: [...otherTxs, ...arrayMove(cycleTxs, oldIdx, newIdx)],
            });
          }
        }}
      >
        <SortableContext
          items={processedTxs.map((t: Transaction) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {processedTxs.length === 0 && localSearchTerm ? (
            <div className="flex h-32 flex-col items-center justify-center opacity-40">
              <span className="text-[10px] font-medium uppercase tracking-wider">
                No matching transactions
              </span>
            </div>
          ) : (
            processedTxs.map((tx: Transaction, index: number) => {
              const currentDate = format(parseISO(tx.date), 'yyyy-MM-dd');
              const prevDate =
                index > 0 ? format(parseISO(processedTxs[index - 1].date), 'yyyy-MM-dd') : null;

              const isAccruedHeader = showAccruedSeparator && tx.id === firstAccruedId;
              const isOperatingHeader = showOperatingSeparator && tx.id === firstOperatingId;
              const sectionHasHeader =
                (tx.isPlanned && showAccruedSeparator) || (!tx.isPlanned && showOperatingSeparator);

              const showDateSeparator =
                currentDate !== prevDate || isAccruedHeader || isOperatingHeader;

              const nextTx = index < processedTxs.length - 1 ? processedTxs[index + 1] : null;
              const isLastOfGroup =
                !nextTx ||
                format(parseISO(nextTx.date), 'yyyy-MM-dd') !== currentDate ||
                nextTx.id === firstOperatingId;

              return (
                <React.Fragment key={tx.id}>
                  {(isAccruedHeader || isOperatingHeader) && (
                    <div className="sticky top-[49px] z-[60] -mx-4 bg-[#F5F5F7] pb-[5px] pt-2.5 dark:bg-[#0A0A0B]">
                      <div className="relative flex items-center justify-center">
                        <div className="absolute h-[0.5px] w-full bg-gradient-to-r from-transparent via-black/[0.1] to-transparent dark:via-white/[0.1]" />
                        <div className="relative flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-1 shadow-sm dark:border-white/10 dark:bg-[#1C1C1E]">
                          <span className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-500">
                            {isAccruedHeader ? 'Accrued Expenses' : 'Operating Expenses'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {showDateSeparator && (
                    <div
                      className={`sticky z-[50] -mx-4 bg-[#F5F5F7] px-5 dark:bg-[#0A0A0B] ${
                        sectionHasHeader
                          ? `top-[83px] pb-2.5 ${!(isAccruedHeader || isOperatingHeader) && 'pt-2.5'}`
                          : 'top-[49px] pb-2.5 pt-2.5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 font-mono text-[7px] font-semibold uppercase tracking-[0.0em] text-slate-400 dark:text-slate-500">
                          {format(parseISO(tx.date), 'EEEE, MMM dd')}
                        </span>
                        <div className="h-[0.5px] flex-1 bg-gradient-to-r from-black/[0.1] to-transparent dark:from-white/[0.1]" />
                      </div>
                    </div>
                  )}
                  <div className={isLastOfGroup ? 'mb-0' : 'mb-1.5'}>
                    <SortableTransactionRow
                      tx={tx}
                      onEdit={onEdit}
                      toggleExecution={toggleExecution}
                      getFullTypeName={getFullTypeName}
                      checkIsIncome={checkIsIncome}
                      checkIsTransfer={checkIsTransfer}
                      isHighlighted={tx.id === highlightId}
                      onDeleteRequest={setDeleteCandidate}
                      computedAccounts={computedAccounts}
                    />
                  </div>
                </React.Fragment>
              );
            })
          )}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default TransactionList;
