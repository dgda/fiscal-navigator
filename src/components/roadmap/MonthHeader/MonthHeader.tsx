import { Activity, CalendarDays } from 'lucide-react';
import React from 'react';

interface MonthHeaderProps {
  monthLabel: string;
  setActiveMonthSummary: React.Dispatch<React.SetStateAction<string | null>>;
}

const MonthHeader: React.FC<MonthHeaderProps> = (props) => {
  const { monthLabel, setActiveMonthSummary } = props;

  return (
    <div className="sticky top-0 z-[40] flex shrink-0 items-center justify-between border-b border-black/[0.04] bg-[#F5F5F7]/80 px-5 py-3 backdrop-blur-xl dark:border-white/5 dark:bg-[#28282A]/80">
      <div className="flex items-center gap-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-slate-300">
          <CalendarDays size={12} />
        </div>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-900 dark:text-white">
          {monthLabel}
        </h2>
      </div>
      <button
        onClick={() => setActiveMonthSummary(monthLabel)}
        className="group flex items-center gap-1.5 rounded-full border border-black/5 bg-white px-3 py-1 text-[9px] font-bold text-slate-500 shadow-sm transition-all hover:border-blue-500/30 hover:text-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
      >
        <Activity size={10} /> <span>AUDIT</span>
      </button>
    </div>
  );
};

export default React.memo(MonthHeader);
