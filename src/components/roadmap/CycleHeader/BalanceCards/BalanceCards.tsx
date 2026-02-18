import React, { useMemo } from 'react';
import BalanceCard from './BalanceCard';
import { CycleStatus, RoadmapCycle } from '../../../../types/roadmap';
import { isBefore, parseISO, startOfDay } from 'date-fns';

interface BalanceCardsProps {
  cycleData: RoadmapCycle;
  cycleStatus: CycleStatus;
}

export const BalanceCards: React.FC<BalanceCardsProps> = (props) => {
  const { cycleData, cycleStatus } = props;
  const { NET_ACTUAL, NET_PROJECTED, SURPLUS, MARGIN, PREV_ACTUAL, PREV_PROJECTED } =
    cycleData.headers;

  return (
    <div className="mb-2.5 grid grid-cols-2 gap-2">
      <BalanceCard
        variant="blue"
        label="Net Actual"
        value={NET_ACTUAL}
        prevValue={PREV_ACTUAL}
        prevLabel="Opening Balance"
        flowValue={SURPLUS}
        flowLabel="Cycle Net Flow"
        cycleStatus={cycleStatus}
      />

      <BalanceCard
        variant="teal"
        label="Net Projected"
        value={NET_PROJECTED}
        prevValue={PREV_PROJECTED}
        prevLabel="Opening Target"
        flowValue={MARGIN}
        flowLabel="Planned Margin"
        cycleStatus={cycleStatus}
      />
    </div>
  );
};
