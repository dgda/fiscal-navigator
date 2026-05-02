import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCycleStatus } from '../src/helpers/cycleHelpers';
import { CycleStatus } from '../src/types/roadmap';

describe('getCycleStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('given a cycle date strictly after today, then returns FUTURE', () => {
    expect(getCycleStatus('2026-05-20', '2026-06-03')).toBe(CycleStatus.FUTURE);
  });

  test('given a cycle date equal to today and no nextCycleDate, then returns CURRENT', () => {
    expect(getCycleStatus('2026-05-15', undefined)).toBe(CycleStatus.CURRENT);
  });

  test('given a cycle date in the past with no nextCycleDate, then returns CURRENT (open-ended last cycle)', () => {
    expect(getCycleStatus('2026-04-01', undefined)).toBe(CycleStatus.CURRENT);
  });

  test('given today is between cycle start and nextCycleDate, then returns CURRENT', () => {
    expect(getCycleStatus('2026-05-01', '2026-05-29')).toBe(CycleStatus.CURRENT);
  });

  test('given today is exactly the nextCycleDate, then returns PAST (boundary)', () => {
    expect(getCycleStatus('2026-05-01', '2026-05-15')).toBe(CycleStatus.PAST);
  });

  test('given today is after the nextCycleDate, then returns PAST', () => {
    expect(getCycleStatus('2026-04-01', '2026-04-15')).toBe(CycleStatus.PAST);
  });

  test('given a cycle date strictly in the future with a nextCycleDate also in the future, then returns FUTURE', () => {
    expect(getCycleStatus('2026-06-01', '2026-06-15')).toBe(CycleStatus.FUTURE);
  });

  test('given times of day vary, then comparison is normalized to start-of-day', () => {
    vi.setSystemTime(new Date('2026-05-15T23:59:59Z'));
    expect(getCycleStatus('2026-05-15', '2026-05-29')).toBe(CycleStatus.CURRENT);
  });
});
