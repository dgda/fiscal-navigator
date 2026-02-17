import React from 'react';
import BalanceCard from './BalanceCard';

interface BalanceCardsProps {
  NET_ACTUAL: number;
  NET_PROJECTED: number;
  SURPLUS: number;
  MARGIN: number;
  prevActual: number;
  prevProjected: number;
}

export const BalanceCards: React.FC<BalanceCardsProps> = (props) => {
  const { NET_ACTUAL, NET_PROJECTED, SURPLUS, MARGIN, prevActual, prevProjected } = props;
  return (
    <div className="mb-2.5 grid grid-cols-2 gap-2">
      <BalanceCard
        variant="blue"
        label="Net Actual"
        value={NET_ACTUAL}
        prevValue={prevActual}
        prevLabel="Opening Balance"
        flowValue={SURPLUS}
        flowLabel="Cycle Net Flow"
      />

      <BalanceCard
        variant="teal"
        label="Net Projected"
        value={NET_PROJECTED}
        prevValue={prevProjected}
        prevLabel="Opening Target"
        flowValue={MARGIN}
        flowLabel="Planned Margin"
      />
    </div>
  );
};
