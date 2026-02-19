import { RoadmapCycle } from '../../../types/roadmap';

export interface MonthData {
  cycles: RoadmapCycle[];
  totals: {
    projInflow: number;
    actualInflow: number;
    actualOutflow: number;
    plannedOutflow: number;
    actualSurplus: number;
    projectedMargin: number;
  };
  start: number;
  endActual: number;
  endProjected: number;
}
