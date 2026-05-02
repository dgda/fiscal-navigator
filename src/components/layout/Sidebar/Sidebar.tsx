import React from 'react';
import { FilterMode } from '../../../hooks/useRoadmap';
import { ChevronDown } from 'lucide-react';
import SidebarToggle from './SidebarToggle/SidebarToggle';
import SidebarSettingsView from './SidebarSettingsView/SidebarSettingsView';
import SidebarTimelineSection from './SidebarRoadmapView/SidebarTimelineSection/SidebarTimelineSection';
import SidebarNewTransactionSection from './SidebarRoadmapView/SidebarNewTransactionSection/SidebarNewTransactionSection';

interface SidebarProps {
  filterMode: FilterMode;
  setFilterMode: (mode: FilterMode) => void;
  filterYear: number;
  setFilterYear: (year: number) => void;
  filterMonth: number;
  setFilterMonth: (month: number) => void;
  activeView: 'roadmap' | 'settings';
  setActiveView: (view: 'roadmap' | 'settings') => void;
  onCommitSuccess: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = (props) => {
  const sidebarBase =
    'no-scrollbar flex h-full flex-col overflow-y-auto border-r border-black/5 bg-[#FBFBFD]/80 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] dark:border-white/5 dark:bg-[#28282A]/90';

  const inputGroupClass =
    'group relative flex items-center rounded-[10px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/5 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 dark:bg-[#2C2C2E] dark:ring-white/10 dark:focus-within:ring-blue-500/30';

  const inputBaseClass =
    'w-full bg-transparent px-3 py-2.5 text-[11px] font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition-colors dark:text-[#E1E1E1] dark:placeholder:text-slate-600';

  const selectChevron = (
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
      <ChevronDown size={12} strokeWidth={3} />
    </div>
  );

  return (
    <div className="relative z-[500] flex h-full shrink-0">
      <aside
        className={`${sidebarBase} ${
          props.isOpen ? 'w-[320px] px-5 py-6 opacity-100' : 'w-0 overflow-hidden p-0 opacity-0'
        }`}
      >
        {props.activeView === 'roadmap' ? (
          <>
            <SidebarTimelineSection
              {...props}
              inputBaseClass={inputBaseClass}
              inputGroupClass={inputGroupClass}
              selectChevron={selectChevron}
            />

            <SidebarNewTransactionSection
              {...props}
              inputBaseClass={inputBaseClass}
              inputGroupClass={inputGroupClass}
              selectChevron={selectChevron}
            />
          </>
        ) : (
          <SidebarSettingsView
            setActiveView={props.setActiveView}
            inputGroupClass={inputGroupClass}
            inputBaseClass={inputBaseClass}
          />
        )}
      </aside>

      <SidebarToggle isOpen={props.isOpen} onToggle={props.onToggle} />
    </div>
  );
};

export default Sidebar;
