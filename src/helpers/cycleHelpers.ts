import { startOfDay, parseISO, isBefore } from 'date-fns';
import { CycleStatus } from '../types/roadmap';

export const getCycleStatus = (date: string, nextCycleDate: string | undefined): CycleStatus => {
  // Use startOfDay for absolute calendar date comparison
  const today = startOfDay(new Date());
  const cycleStart = startOfDay(parseISO(date));

  // 1. FUTURE: If today hasn't even reached the start of this cycle yet
  if (isBefore(today, cycleStart)) {
    return CycleStatus.FUTURE;
  }

  // 2. PAST: A cycle is past if today has reached or passed the NEXT cycle's start
  if (nextCycleDate) {
    const nextStart = startOfDay(parseISO(nextCycleDate));
    // If today is NOT before the next start, it means today is >= nextStart
    if (!isBefore(today, nextStart)) {
      return CycleStatus.PAST;
    }
  }

  // 3. CURRENT: Today is >= cycleStart AND (no next cycle OR today < nextStart)
  return CycleStatus.CURRENT;
};
