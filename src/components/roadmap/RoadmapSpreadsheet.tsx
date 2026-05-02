import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTreasury } from '../../context/TreasuryContext';
import { UseRoadmapProps } from '../../hooks/useRoadmap';
import { useRoadmap } from '../../hooks/useRoadmap';
import { format } from 'date-fns';
import { Transaction } from '../../types';
import DeleteModal from './DeleteModal/DeleteModal';
import AuditPanel from './AuditPanel/AuditPanel';
import TimelineSidebar from './TimelineSidebar/TimelineSidebar';
import CycleContent from './CycleContent/CycleContent';
import MonthHeader from './MonthHeader/MonthHeader';

interface RoadmapSpreadsheetProps {
  filter: UseRoadmapProps;
  onEdit: (id: string) => void;
  highlightId: string | null;
  onHighlightComplete: () => void;
}

const RoadmapSpreadsheet: React.FC<RoadmapSpreadsheetProps> = ({
  filter,
  onEdit,
  highlightId,
  onHighlightComplete,
}) => {
  const { deleteTransaction, deleteSeries } = useTreasury();
  const { roadmap, groupedCycleOptions } = useRoadmap(filter);
  const [activeMonthSummary, setActiveMonthSummary] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Transaction | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cycleScrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const monthRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (activeMonthSummary) {
      const timer = requestAnimationFrame(() => setIsOpening(true));
      return () => cancelAnimationFrame(timer);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpening(false);
    }
  }, [activeMonthSummary]);

  const handleClose = () => {
    setIsOpening(false);
    setIsClosing(true);
    setTimeout(() => {
      setActiveMonthSummary(null);
      setIsClosing(false);
    }, 500);
  };

  const executeDelete = (mode: 'one' | 'series') => {
    if (!deleteCandidate) return;
    if (mode === 'one') {
      void deleteTransaction(deleteCandidate.id);
    } else if (deleteCandidate.recurringGroupId) {
      deleteSeries(deleteCandidate.recurringGroupId);
    }
    setDeleteCandidate(null);
  };

  useEffect(() => {
    const currentMonthLabel = format(new Date(), 'MMMM yyyy');
    if (monthRefs.current[currentMonthLabel]) {
      setTimeout(
        () =>
          monthRefs.current[currentMonthLabel]?.scrollIntoView({
            behavior: 'smooth',
            inline: 'start',
            block: 'nearest',
          }),
        800,
      );
    }
  }, [groupedCycleOptions]);

  useEffect(() => {
    if (highlightId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`tx-row-${highlightId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      const clearTimer = setTimeout(() => onHighlightComplete(), 4000);
      return () => {
        clearTimeout(timer);
        clearTimeout(clearTimer);
      };
    }
  }, [highlightId, onHighlightComplete]);

  const timelineData = useMemo(() => {
    const years: Record<string, string[]> = {};
    Object.keys(groupedCycleOptions).forEach((l) => {
      const y = l.split(' ')[1];
      if (!years[y]) years[y] = [];
      years[y].push(l);
    });
    return years;
  }, [groupedCycleOptions]);

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#F5F5F7] dark:bg-[#1E1E1F]">
      {/* HORIZONTAL SCROLL CONTAINER: Set to h-full to capture viewport height */}
      <div
        ref={scrollContainerRef}
        className="no-scrollbar flex h-full flex-1 overflow-x-auto scroll-smooth"
      >
        {Object.entries(groupedCycleOptions).map(([monthLabel, cycleMeta]) => (
          <div
            key={monthLabel}
            ref={(el) => {
              monthRefs.current[monthLabel] = el;
            }}
            className="flex h-full flex-col border-r border-black/[0.04] dark:border-white/5"
          >
            <MonthHeader monthLabel={monthLabel} setActiveMonthSummary={setActiveMonthSummary} />

            <CycleContent
              cycleMeta={cycleMeta}
              roadmap={roadmap}
              onEdit={onEdit}
              highlightId={highlightId}
              setDeleteCandidate={setDeleteCandidate}
              cycleScrollRefs={cycleScrollRefs}
            />
          </div>
        ))}
      </div>

      <TimelineSidebar timelineData={timelineData} monthRefs={monthRefs} />

      <DeleteModal
        deleteCandidate={deleteCandidate}
        setDeleteCandidate={setDeleteCandidate}
        executeDelete={executeDelete}
      />

      <AuditPanel
        activeMonthSummary={activeMonthSummary}
        isOpening={isOpening}
        isClosing={isClosing}
        handleClose={handleClose}
        roadmap={roadmap}
      />
    </div>
  );
};

export default RoadmapSpreadsheet;
