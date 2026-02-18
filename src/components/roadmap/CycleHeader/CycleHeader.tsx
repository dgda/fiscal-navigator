import React from 'react';
import { BalanceCards } from './BalanceCards/BalanceCards';
import { CycleMetricPills } from './CycleMetricPills/CycleMetricPills';
import { CycleTitle } from './CycleTitle/CycleTitle';
import LiquidityGapIndicator from './LiquidityGap/LiquidityGap';
import { RoadmapCycle } from '../../../types/roadmap';

export interface CycleHeaderProps {
  cycleData: RoadmapCycle;
  isCurrentCycle: boolean;
}

export const CycleHeader: React.FC<CycleHeaderProps> = (props) => {
  const { cycleData, isCurrentCycle } = props;
  const {
    NET_ACTUAL,
    PREV_ACTUAL,
    NET_PROJECTED,
    PREV_PROJECTED,
    SURPLUS,
    MARGIN,
    UNPAID_IN_CYCLE,
    REALITY_CHECK,
    PROJECTED_CHECK,
    PLANNED,
    IS_FORECASTING,
    IS_PROJECTED_FORECASTING,
  } = cycleData.headers;

  return (
    <div className="group/cycle relative z-[10] shrink-0 border-b border-black/[0.04] bg-[#F5F5F7]/95 px-4 py-4 backdrop-blur-xl transition-all hover:z-[50] dark:border-white/5 dark:bg-[#0A0A0B]/95">
      <CycleTitle cycleData={cycleData} />

      <BalanceCards cycleData={cycleData} isCurrentCycle={isCurrentCycle} />

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
        isCurrentCycle={isCurrentCycle}
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
      />
      <CycleMetricPills cycleHeaders={cycleData.headers} />
    </div>
  );
};
