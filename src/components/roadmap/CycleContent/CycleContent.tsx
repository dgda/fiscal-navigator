import React from 'react';
import { CycleStatus, LabeledRoadmapTransaction, RoadmapCycle } from '../../../types/roadmap';
import { Transaction } from '../../../types';
import { getCycleStatus } from './cycleContentHelpers';
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
        // 1. Find the index of THIS cycle in the GLOBAL roadmap array
        const globalIndex = roadmap.findIndex((r) => r.key === meta.key);

        // 2. Look ahead in the GLOBAL array, not the local monthly 'arr'
        const nextCycleData = roadmap[globalIndex + 1];
        const nextCycleDate = nextCycleData?.date;

        const cycleStatus = getCycleStatus(cycleData.date, nextCycleDate);

        return (
          <div
            key={cycleData.key}
            className={`relative flex h-full w-[432px] flex-col overflow-visible bg-[#F5F5F7] hover:z-50 dark:border-white/5 dark:bg-[#0A0A0B] ${cycleStatus === CycleStatus.FUTURE && 'opacity-50 brightness-50 dark:opacity-50 dark:brightness-50'} ${cycleStatus === CycleStatus.PAST && 'brightness-95 dark:brightness-75'} border-r`}
          >
            <CycleHeader cycleData={cycleData} cycleStatus={cycleStatus} />

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
