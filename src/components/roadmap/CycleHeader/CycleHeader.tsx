import React from 'react';
import LiquidityGapIndicator from './LiquidityGap/LiquidityGap';
import { RoadmapCycle } from '../../../types/roadmap';
import BalanceCards from './BalanceCards/BalanceCards';
import CycleMetricPills from './CycleMetricPills/CycleMetricPills';
import CycleTitle from './CycleTitle/CycleTitle';

export interface CycleHeaderProps {
  cycleData: RoadmapCycle;
}

const CycleHeader: React.FC<CycleHeaderProps> = (props) => {
  const { cycleData } = props;
  const {
    NET_ACTUAL,
    PREV_PROJECTED,
    UNPAID_IN_CYCLE,
    REALITY_CHECK,
    PROJECTED_CHECK,
    PLANNED,
    IS_FORECASTING,
    IS_PROJECTED_FORECASTING,
    CYCLE_STATUS,
  } = cycleData.headers;

  return (
    <div className="group/cycle relative z-[10] shrink-0 border-b border-black/[0.04] px-4 py-4 backdrop-blur-xl transition-all hover:z-[50] dark:border-white/5">
      <CycleTitle cycleData={cycleData} />

      <BalanceCards cycleData={cycleData} />

      {/* ACTUAL STATUS */}
      <LiquidityGapIndicator
        label="Actual Liquidity"
        isForecasting={IS_FORECASTING}
        currentLiquidity={NET_ACTUAL}
        currentLiquidityLabel="Current Liquidity"
        comparisonValue={UNPAID_IN_CYCLE}
        comparisonLabel="Unpaid Planned Bills"
        marginValue={REALITY_CHECK}
        marginLabel="Survival Margin"
        cycleStatus={CYCLE_STATUS}
      />

      {/* PROJECTED STATUS */}
      <LiquidityGapIndicator
        isProjected
        label="Projected Liquidity"
        isForecasting={IS_PROJECTED_FORECASTING}
        currentLiquidity={PREV_PROJECTED}
        currentLiquidityLabel="Projected Current Liquidity"
        comparisonValue={PLANNED}
        comparisonLabel="Planned Bills"
        marginValue={PROJECTED_CHECK}
        marginLabel="Projected Survival Margin"
        cycleStatus={CYCLE_STATUS}
      />
      <CycleMetricPills cycleHeaders={cycleData.headers} />
    </div>
  );
};

export default CycleHeader;
