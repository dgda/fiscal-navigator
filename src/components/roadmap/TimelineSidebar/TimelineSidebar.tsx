import { Compass } from 'lucide-react';
import React from 'react';

interface TimelineSidebarProps {
  timelineData: Record<string, string[]>;
  monthRefs: React.RefObject<{
    [key: string]: HTMLDivElement | null;
  }>;
}

const TimelineSidebar: React.FC<TimelineSidebarProps> = (props) => {
  const { timelineData, monthRefs } = props;

  return (
    <>
      <div className="z-40 flex h-full w-[72px] shrink-0 flex-col items-center border-l border-black/5 bg-[#FBFBFD]/80 backdrop-blur-2xl dark:border-white/5 dark:bg-[#28282A]/80">
        <div className="flex h-[60px] w-full shrink-0 items-center justify-center border-b border-black/5 dark:border-white/5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-400 shadow-inner hover:bg-blue-50 hover:text-blue-500 dark:bg-white/5 dark:text-slate-500 dark:hover:bg-blue-500/20 dark:hover:text-blue-400">
            <Compass size={18} strokeWidth={2.5} />
          </div>
        </div>
        <div className="no-scrollbar w-full flex-1 overflow-y-auto py-8">
          <div className="flex flex-col items-center gap-10">
            {Object.entries(timelineData).map(([year, months]) => (
              <div key={year} className="group/year relative flex flex-col items-center gap-3">
                <div className="relative flex w-6 items-center justify-center overflow-hidden rounded-full border border-black/5 bg-white py-4 shadow-sm dark:border-white/5 dark:bg-[#2C2C2E]">
                  <span className="rotate-180 text-[10px] font-black tracking-[0.3em] text-slate-300 transition-colors [writing-mode:vertical-rl] group-hover/year:text-slate-800 dark:text-slate-600 dark:group-hover/year:text-slate-200">
                    {year}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {months.map((label) => (
                    <button
                      key={label}
                      onClick={() =>
                        monthRefs.current[label]?.scrollIntoView({
                          behavior: 'smooth',
                          inline: 'start',
                        })
                      }
                      className="group relative flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:bg-white hover:shadow-md hover:ring-1 hover:ring-black/5 dark:hover:bg-[#2C2C2E]"
                    >
                      <span className="text-[9px] font-bold uppercase text-slate-400 group-hover:scale-110 group-hover:text-blue-600 dark:text-slate-500 dark:group-hover:text-blue-400">
                        {label.substring(0, 3)}
                      </span>
                      <div className="absolute -right-1 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-blue-500 opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default TimelineSidebar;
