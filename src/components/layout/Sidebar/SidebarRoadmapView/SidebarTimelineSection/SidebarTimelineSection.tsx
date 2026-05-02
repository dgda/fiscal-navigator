import React, { JSX } from 'react';
import { FilterMode } from '../../../../../hooks/useRoadmap';

interface SidebarTimelineSectionProps {
  inputGroupClass: string;
  inputBaseClass: string;
  setFilterMode: (mode: FilterMode) => void;
  filterMode: FilterMode;
  filterMonth: number;
  setFilterMonth: (month: number) => void;
  selectChevron: JSX.Element;
  filterYear: number;
  setFilterYear: (year: number) => void;
}

const SidebarTimelineSection: React.FC<SidebarTimelineSectionProps> = (props) => {
  const {
    inputGroupClass,
    inputBaseClass,
    setFilterMode,
    filterMode,
    filterMonth,
    setFilterMonth,
    selectChevron,
    filterYear,
    setFilterYear,
  } = props;

  return (
    <section className="mb-6 space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400/80 dark:text-slate-500">
          Timeline
        </span>
      </div>

      <div className="flex rounded-[10px] bg-slate-200/50 p-1 dark:bg-white/5">
        {Object.values(FilterMode).map((m) => (
          <button
            key={m}
            onClick={() => setFilterMode(m)}
            className={`flex-1 rounded-[7px] py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all duration-200 ${
              filterMode === m
                ? 'bg-white text-slate-900 shadow-sm dark:bg-[#2C2C2E] dark:text-white dark:shadow-black/20'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {filterMode !== 'all' && (
        <div className="animate-in slide-in-from-top-1 fade-in grid grid-cols-2 gap-2 duration-300">
          {filterMode === 'month' && (
            <div className={inputGroupClass}>
              <div className="relative w-full">
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(Number(e.target.value))}
                  className={`${inputBaseClass} appearance-none`}
                >
                  {[
                    'Jan',
                    'Feb',
                    'Mar',
                    'Apr',
                    'May',
                    'Jun',
                    'Jul',
                    'Aug',
                    'Sep',
                    'Oct',
                    'Nov',
                    'Dec',
                  ].map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
                {selectChevron}
              </div>
            </div>
          )}
          <div className={`${inputGroupClass} ${filterMode === 'year' ? 'col-span-2' : ''}`}>
            <input
              type="number"
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className={`${inputBaseClass} text-center font-bold`}
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default SidebarTimelineSection;
