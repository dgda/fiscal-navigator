import { DndContext } from '@dnd-kit/core/dist/components/DndContext/DndContext';
import { KeyboardSensor } from '@dnd-kit/core/dist/sensors/keyboard/KeyboardSensor';
import { PointerSensor } from '@dnd-kit/core/dist/sensors/pointer/PointerSensor';
import { useSensor } from '@dnd-kit/core/dist/sensors/useSensor';
import { useSensors } from '@dnd-kit/core/dist/sensors/useSensors';
import { closestCenter } from '@dnd-kit/core/dist/utilities/algorithms/closestCenter';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable/dist/sensors/keyboard/sortableKeyboardCoordinates';
import React, { useMemo } from 'react';
import { useTreasury } from '../../../context/TreasuryContext';
import { Transaction } from '../../../types';
import { RoadmapCycle } from '../../../types/roadmap';
import { arrayMove } from '@dnd-kit/sortable/dist/utilities/arrayMove';
import { SortableContext } from '@dnd-kit/sortable/dist/components/SortableContext';
import { verticalListSortingStrategy } from '@dnd-kit/sortable/dist/strategies/verticalListSorting';
import { format, parseISO } from 'date-fns';
import SortableTransactionRow from './SortableTransactionRow';

interface TransactionListProps {
  ref: React.Ref<HTMLDivElement> | undefined;
  cycleData: RoadmapCycle;
  onEdit: (id: string) => void;
  highlightId: string | null;
  setDeleteCandidate: React.Dispatch<React.SetStateAction<Transaction | null>>;
}

const TransactionList: React.FC<TransactionListProps> = (props) => {
  const { ref, cycleData, onEdit, highlightId, setDeleteCandidate } = props;
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

  const processedTxs = useMemo(() => {
    return [...cycleData.txs].sort((a: Transaction, b: Transaction) => {
      if (a.isPlanned !== b.isPlanned) return a.isPlanned ? -1 : 1;
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return cycleData.txs.indexOf(a) - cycleData.txs.indexOf(b);
    });
  }, [cycleData]);
  const firstAccruedId = useMemo(() => {
    return processedTxs.find((t: Transaction) => t.isPlanned)?.id;
  }, [processedTxs]);
  const firstOperatingId = useMemo(() => {
    return processedTxs.find((t: Transaction) => !t.isPlanned)?.id;
  }, [processedTxs]);
  const showAccruedSeparator = useMemo(() => {
    return processedTxs.some((t: Transaction) => t.isPlanned);
  }, [processedTxs]);
  const showOperatingSeparator = useMemo(() => {
    return processedTxs.some((t: Transaction) => !t.isPlanned);
  }, [processedTxs]);

  return (
    <div
      ref={ref}
      className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4"
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e) => {
          const { active, over } = e;
          if (over && active.id !== over.id) {
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
          {processedTxs.map((tx: Transaction, index: number) => {
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
                  <div className="sticky top-0 z-[60] -mx-4 bg-[#F5F5F7] pb-[5px] pt-2.5 dark:bg-[#0A0A0B]">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute h-[0.5px] w-full bg-gradient-to-r from-transparent via-black/[0.4] to-transparent dark:via-white/[0.4]" />
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
                    className={`sticky z-[50] -mx-4 bg-[#F5F5F7] px-5 dark:bg-[#0A0A0B] ${sectionHasHeader ? `top-[34px] pb-2.5 ${!(isAccruedHeader || isOperatingHeader) && 'pt-2.5'}` : 'top-0 pb-2.5 pt-2.5'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 font-mono text-[7px] font-semibold uppercase tracking-[0.0em] text-slate-400 dark:text-slate-500">
                        {format(parseISO(tx.date), 'EEEE, MMM dd')}
                      </span>
                      <div className="h-[0.5px] flex-1 bg-gradient-to-r from-black/[0.2] to-transparent dark:from-white/[0.2]" />
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
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default TransactionList;
