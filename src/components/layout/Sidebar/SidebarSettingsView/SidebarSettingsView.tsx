import React from 'react';
import { useTreasury } from '../../../../context/TreasuryContext';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

interface SidebarSettingsViewProps {
  setActiveView: (view: 'roadmap' | 'settings') => void;
  inputGroupClass: string;
  inputBaseClass: string;
}

const SidebarSettingsView: React.FC<SidebarSettingsViewProps> = (props) => {
  const { setActiveView, inputGroupClass, inputBaseClass } = props;
  const { data, updateBaseSalary, currencySymbol } = useTreasury();

  return (
    <div className="space-y-6">
      <button
        onClick={() => setActiveView('roadmap')}
        className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-blue-600 transition-colors hover:text-blue-500 dark:text-blue-400"
      >
        <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" /> Return
        to Roadmap
      </button>
      <div className="rounded-[14px] border border-black/5 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#2C2C2E]">
        <p className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          <ShieldCheck size={12} /> Core Infrastructure
        </p>
        <div className="space-y-2">
          <label className="text-[9px] font-bold uppercase text-slate-400">
            Monthly Base Salary
          </label>
          <div className={inputGroupClass}>
            <div className="absolute left-3 text-emerald-500">
              <span className="font-mono text-[12px] font-bold">{currencySymbol}</span>
            </div>
            <input
              type="number"
              defaultValue={data.baseSalary}
              onBlur={(e) => updateBaseSalary(Number(e.target.value))}
              className={`${inputBaseClass} pl-8`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarSettingsView;
