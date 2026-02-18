import React from 'react';
import BalanceCard from './BalanceCard';
import { RoadmapCycle } from '../../../../types/roadmap';

interface BalanceCardsProps {
  cycleData: RoadmapCycle;
}

export const BalanceCards: React.FC<BalanceCardsProps> = (props) => {
  const { cycleData } = props;
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
