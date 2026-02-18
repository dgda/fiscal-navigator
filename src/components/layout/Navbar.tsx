import React from 'react';
import { useTreasury } from '../../context/TreasuryContext';
import { useTheme } from '../../context/ThemeContext';
import { FilterMode, useRoadmap } from '../../hooks/useRoadmap'; // Import the hook
import {
  Landmark,
  Coins,
  Sun,
  Moon,
  Laptop,
  Settings,
  LayoutGrid,
  Clock, // Import Clock icon
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface NavbarProps {
  activeView: 'roadmap' | 'settings';
  setActiveView: (view: 'roadmap' | 'settings') => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeView, setActiveView }) => {
  const { computedAccounts, totalLiquidity } = useTreasury();
  const { theme, toggleTheme, isSystemDefault, setUseSystemDefault } = useTheme();

  // Fetch global bufferDays (using 'all' mode for global runway)
  const { bufferDays } = useRoadmap({
    mode: FilterMode.ALL,
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  });

  return (
    <nav className="relative z-30 flex h-14 w-full shrink-0 items-center justify-between border-b border-black/5 bg-[#FBFBFD]/80 px-4 backdrop-blur-2xl transition-colors dark:border-white/5 dark:bg-[#141416]/80">
      <div className="flex items-center gap-6">
        {/* BRAND IDENTITY */}
        <div className="flex items-center gap-3 pr-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30">
            <Landmark size={16} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold tracking-tight text-slate-900 dark:text-white">
              Fiscal Navigator
            </span>
            <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
              Personal Treasury
            </span>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-black/5 dark:bg-white/5" />

        {/* ACCOUNT STATUS PILLS */}
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
          {computedAccounts.map((acc) => (
            <div
              key={acc.id}
              className="group flex cursor-default items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-1 shadow-sm transition-all hover:border-black/10 hover:shadow-md dark:border-white/5 dark:bg-[#1C1C1E] dark:hover:border-white/10"
            >
              <div
                className="h-1.5 w-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.3)]"
                style={{ backgroundColor: acc.color, boxShadow: `0 0 6px ${acc.color}60` }}
              />
              <div className="flex flex-col leading-none">
                <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300">
                  {acc.name}
                </span>
              </div>
              <span className="font-mono text-[9px] font-bold text-slate-400 dark:text-slate-500">
                ₱
                {acc.balance?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* RULE FOUR: AGE OF MONEY (RUNWAY STATUS) */}
        <div
          className={`group relative flex items-center gap-3 overflow-hidden rounded-[10px] border px-3 py-1.5 transition-all duration-500 ${
            bufferDays > 30
              ? 'border-emerald-500/10 bg-emerald-500/[0.03] dark:border-emerald-500/10'
              : 'border-amber-500/10 bg-amber-500/[0.03] dark:border-amber-500/10'
          }`}
        >
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">
              Liquidity Runway
            </span>
            <div className="flex items-baseline gap-1">
              <span
                className={`font-mono text-[13px] font-bold ${bufferDays > 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}
              >
                {bufferDays}
              </span>
              <span className="text-[9px] font-bold uppercase text-slate-400">Days</span>
            </div>
          </div>
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full shadow-inner transition-colors ${
              bufferDays > 30
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
            }`}
          >
            <Clock
              size={14}
              strokeWidth={2.5}
              className={bufferDays <= 15 ? 'animate-pulse' : ''}
            />
          </div>
          {/* Hover Glass Sweep */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
        </div>

        <div className="h-6 w-[1px] bg-black/5 dark:bg-white/5" />

        {/* TOTAL LIQUIDITY DISPLAY (Glass Card) */}
        <div className="flex items-center gap-3 rounded-[10px] border border-black/5 bg-white/50 px-3 py-1.5 backdrop-blur-md dark:border-white/5 dark:bg-white/5">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
              Net Liquidity
            </span>
            <span className="font-mono text-[13px] font-bold tracking-tight text-slate-900 dark:text-white">
              ₱{totalLiquidity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600 shadow-inner dark:bg-blue-500/20 dark:text-blue-400">
            <Coins size={14} strokeWidth={2.5} />
          </div>
        </div>

        <div className="h-6 w-[1px] bg-black/5 dark:bg-white/5" />

        {/* CONTROL CLUSTER (Segmented) */}
        <div className="flex items-center gap-3">
          {/* Theme & View Toggles remain identical ... */}
          {/* ... */}
          <div className="flex items-center rounded-full border border-black/5 bg-white p-0.5 shadow-sm dark:border-white/5 dark:bg-[#1C1C1E]">
            <button
              onClick={() => setUseSystemDefault(true)}
              className={`flex h-6 w-6 items-center justify-center rounded-full transition-all ${
                isSystemDefault
                  ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="System Theme"
            >
              <Laptop size={12} />
            </button>
            <button
              onClick={toggleTheme}
              className={`flex h-6 w-6 items-center justify-center rounded-full transition-all ${
                !isSystemDefault
                  ? 'bg-slate-100 shadow-sm dark:bg-white/10'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {theme === 'light' ? (
                <Moon size={12} className="text-slate-700" />
              ) : (
                <Sun size={12} className="text-amber-400" />
              )}
            </button>
          </div>

          <div className="flex items-center rounded-full border border-black/5 bg-white p-0.5 shadow-sm dark:border-white/5 dark:bg-[#1C1C1E]">
            <button
              onClick={() => setActiveView('roadmap')}
              className={`flex h-6 w-6 items-center justify-center rounded-full transition-all ${
                activeView === 'roadmap'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Roadmap"
            >
              <LayoutGrid size={12} />
            </button>
            <button
              onClick={() => setActiveView('settings')}
              className={`flex h-6 w-6 items-center justify-center rounded-full transition-all ${
                activeView === 'settings'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Settings"
            >
              <Settings size={12} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
