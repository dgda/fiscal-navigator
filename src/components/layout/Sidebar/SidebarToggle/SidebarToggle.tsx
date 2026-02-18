import { ChevronRight } from 'lucide-react';
import React from 'react';

interface SidebarToggleProps {
  onToggle: () => void;
  isOpen: boolean;
}

const SidebarToggle: React.FC<SidebarToggleProps> = (props) => {
  const { onToggle, isOpen } = props;

  return (
    <div
      className={`fixed top-[20%] z-[10000] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${props.isOpen ? 'left-[308px]' : 'left-0'}`}
    >
      <button
        onClick={onToggle}
        className={`group relative flex h-14 w-6 items-center justify-center rounded-r-2xl bg-white/80 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.1)] ring-1 ring-black/5 backdrop-blur-xl transition-all duration-500 dark:bg-[#1C1C1E]/80 dark:ring-white/10`}
      >
        <div
          className={`transition-all duration-500 ${isOpen ? 'rotate-180 text-slate-400' : 'rotate-0 text-blue-500'}`}
        >
          <ChevronRight size={14} strokeWidth={3} />
        </div>

        <div
          className={`pointer-events-none absolute left-10 z-[10001] -translate-x-2 whitespace-nowrap rounded-xl bg-slate-900/95 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-white opacity-0 shadow-2xl blur-sm transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-hover:blur-0 dark:bg-white dark:text-black`}
        >
          {isOpen ? 'Retract Inspector' : 'Expand Sidebar'}
        </div>
      </button>
    </div>
  );
};

export default SidebarToggle;
