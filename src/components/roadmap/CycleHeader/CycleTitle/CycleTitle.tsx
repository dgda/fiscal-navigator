import React from 'react';
import { MetricBadges } from '../MetricBadges/MetricBadges';
import { RoadmapCycle } from '../../../../types/roadmap';

interface CycleTitleProps {
  cycleData: RoadmapCycle;
}

export const CycleTitle: React.FC<CycleTitleProps> = (props) => {
  const { cycleData } = props;
  const { dateLabel, display, headers } = cycleData;
  const { LIQUIDITY_RUNWAY, PROJECTED_LIQUIDITY_RUNWAY } = headers;

  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-[13px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
        {display}
      </h3>

      <div className="flex items-center gap-1 self-center">
        {/* The new modular metric component */}
        <MetricBadges
          liquidityRunway={LIQUIDITY_RUNWAY}
          projectedLiquidityRunway={PROJECTED_LIQUIDITY_RUNWAY}
        />

        {/* Date Tag stays in the header as it is identity-specific */}
        <div className="ml-0.5 flex h-4 items-center rounded-full bg-slate-900/[0.04] px-2 dark:bg-white/[0.06]">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400">
            {dateLabel}
          </span>
        </div>
      </div>
    </div>
  );
};
