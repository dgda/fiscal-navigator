import React, { useMemo } from 'react';
import BalanceCard from './BalanceCard';
import { RoadmapCycle } from '../../../../types/roadmap';
import { isBefore, parseISO, startOfDay } from 'date-fns';

interface BalanceCardsProps {
  cycleData: RoadmapCycle;
  isCurrentCycle: boolean;
}

export const BalanceCards: React.FC<BalanceCardsProps> = (props) => {
  const { cycleData, isCurrentCycle } = props;
  const { NET_ACTUAL, NET_PROJECTED, SURPLUS, MARGIN, PREV_ACTUAL, PREV_PROJECTED } =
    cycleData.headers;

  const isBlurred = !isCurrentCycle;

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
        isCurrentCycle={isCurrentCycle}
      />

      <BalanceCard
        variant="teal"
        label="Net Projected"
        value={NET_PROJECTED}
        prevValue={PREV_PROJECTED}
        prevLabel="Opening Target"
        flowValue={MARGIN}
        flowLabel="Planned Margin"
      />
    </div>
  );
};
