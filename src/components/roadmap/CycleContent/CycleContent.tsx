import React from 'react';
import { CycleStatus, LabeledRoadmapTransaction, RoadmapCycle } from '../../../types/roadmap';
import { Transaction } from '../../../types';
import CycleHeader from '../CycleHeader/CycleHeader';
import TransactionList from '../TransactionList/TransactionList';

interface CycleContentProps {
  cycleMeta: LabeledRoadmapTransaction[];
  roadmap: RoadmapCycle[];
  onEdit: (id: string) => void;
  highlightId: string | null;
  setDeleteCandidate: React.Dispatch<React.SetStateAction<Transaction | null>>;
  cycleScrollRefs: React.RefObject<{
    [key: string]: HTMLDivElement | null;
  }>;
}

const CycleContent: React.FC<CycleContentProps> = (props) => {
  const { cycleMeta, roadmap, onEdit, highlightId, setDeleteCandidate, cycleScrollRefs } = props;

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-visible">
      {cycleMeta.map((meta) => {
        const cycleData = roadmap.find((r) => r.key === meta.key);
        if (!cycleData) return null;
        const { CYCLE_STATUS } = cycleData.headers;

        const columnClasses = [
          // Layout & Base
          'relative flex h-full w-[432px] flex-col overflow-visible',
          'bg-[#F5F5F7] border-r hover:z-50',
          'dark:border-white/5 dark:bg-[#0A0A0B]',

          // Status: Future
          CYCLE_STATUS === CycleStatus.FUTURE &&
            'opacity-50 brightness-[0.4] dark:opacity-50 dark:brightness-[0.30]',

          // Status: Past
          CYCLE_STATUS === CycleStatus.PAST && 'opacity-65 brightness-[0.95] dark:brightness-95',

          // Status: Current
          CYCLE_STATUS === CycleStatus.CURRENT &&
            'shadow-xl shadow-slate-600/20 dark:shadow-zinc-900/90',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div key={cycleData.key} className={columnClasses}>
            <CycleHeader cycleData={cycleData} />

            <TransactionList
              ref={(el) => {
                cycleScrollRefs.current[cycleData.key] = el;
              }}
              cycleData={cycleData}
              onEdit={onEdit}
              highlightId={highlightId}
              setDeleteCandidate={setDeleteCandidate}
            />
          </div>
        );
      })}
    </div>
  );
};

export default CycleContent;
