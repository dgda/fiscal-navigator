import { Activity, BarChart3, X } from 'lucide-react';
import React from 'react';
import { CycleHeaders, GroupedRoadmapTransactions, RoadmapCycle } from '../../../types/roadmap';

interface AuditPanelProps {
  activeMonthSummary: string | null;
  isOpening: boolean;
  isClosing: boolean;
  handleClose: () => void;
  groupedCycleOptions: GroupedRoadmapTransactions;
  roadmap: RoadmapCycle[];
}

const AuditPanel: React.FC<AuditPanelProps> = (props) => {
  const { activeMonthSummary, isOpening, isClosing, handleClose, groupedCycleOptions, roadmap } =
    props;

  return (
    <>
      {activeMonthSummary && (
        <div
          className={`fixed inset-0 z-[10000] flex justify-end bg-black/20 backdrop-blur-[4px] transition-all duration-500 ${isOpening && !isClosing ? 'opacity-100' : 'opacity-0'}`}
          onClick={handleClose}
        >
          <div
            className={`m-4 w-[480px] overflow-hidden rounded-[32px] border border-white/60 bg-[#F5F5F7]/95 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.25)] backdrop-blur-3xl transition-all duration-500 dark:border-white/10 dark:bg-[#161618]/95 ${isOpening && !isClosing ? 'translate-x-0 scale-100 opacity-100' : 'translate-x-full scale-95 opacity-0'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/[0.04] px-8 py-5 dark:border-white/5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <h2 className="text-[15px] font-black leading-none tracking-tight text-slate-900 dark:text-white">
                    {activeMonthSummary}
                  </h2>
                  <p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Monthly Intelligence Audit
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="group flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-slate-500 transition-all hover:rotate-90 hover:bg-black/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
            <div className="no-scrollbar h-[calc(100%-82px)] overflow-y-auto px-8 py-6">
              <div className="relative mb-8 overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-black">
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-200/10 blur-[60px] dark:bg-blue-900/10" />
                <div className="relative z-10 flex items-center justify-between border-b border-black/[0.03] p-6 dark:border-white/[0.03]">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400/80">
                      Net Projected Surplus
                    </span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-light text-slate-400">₱</span>
                      <p className="text-3xl font-black tabular-nums tracking-tighter text-slate-900 dark:text-white">
                        {groupedCycleOptions[activeMonthSummary]
                          .reduce(
                            (acc, c) =>
                              acc + (roadmap.find((r) => r.key === c.key)?.headers?.MARGIN || 0),
                            0,
                          )
                          .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 ring-1 ring-emerald-500/20">
                    <div className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" />
                    <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Stable
                    </span>
                  </div>
                </div>
                <div className="relative z-10 grid grid-cols-4 divide-x divide-black/[0.03] bg-slate-50/50 dark:divide-white/[0.03] dark:bg-white/[0.02]">
                  {[
                    { label: 'Inflow', val: 'INFLOW', color: 'text-emerald-600' },
                    { label: 'Actual', val: 'CLEARED', color: 'text-rose-600' },
                    { label: 'Planned', val: 'PLANNED', color: 'text-blue-600' },
                    { label: 'Surplus', val: 'SURPLUS', color: 'text-slate-500' },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col items-center py-4">
                      <span className="mb-1 text-[7px] font-black uppercase tracking-widest text-slate-400">
                        {item.label}
                      </span>
                      <p className={`font-mono text-[10px] font-black tabular-nums ${item.color}`}>
                        ₱
                        {groupedCycleOptions[activeMonthSummary]
                          .reduce(
                            (acc, c) =>
                              acc +
                              ((roadmap.find((r) => r.key === c.key)?.headers?.[
                                item.val as keyof CycleHeaders
                              ] || 0) as number),
                            0,
                          )
                          .toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                            minimumFractionDigits: 2,
                          })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Cycle Analytics
                  </h3>
                  <div className="ml-4 h-[0.5px] flex-1 bg-gradient-to-r from-black/[0.08] to-transparent dark:from-white/10" />
                </div>
                <div className="space-y-3">
                  {groupedCycleOptions[activeMonthSummary].map((c) => {
                    const cycle = roadmap.find((r) => r.key === c.key);
                    const headers = cycle?.headers;
                    const surplus = headers?.SURPLUS || 0;
                    return (
                      <div
                        key={c.key}
                        className="group overflow-hidden rounded-2xl border border-black/[0.03] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/5 dark:bg-[#1C1C1E]/50"
                      >
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-500 dark:bg-white/5 dark:text-slate-500 dark:group-hover:bg-blue-500/10">
                              <Activity size={16} />
                            </div>
                            <div>
                              <p className="text-[12px] font-black tracking-tight text-slate-900 dark:text-white">
                                {cycle?.display}
                              </p>
                              <p className="text-[9px] font-bold text-slate-400">
                                {cycle?.dateLabel}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`font-mono text-[12px] font-black tabular-nums ${surplus >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
                            >
                              {surplus >= 0 ? '+' : ''}₱
                              {surplus.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center border-t border-black/[0.02] bg-slate-50/50 px-5 py-2.5 dark:border-white/5 dark:bg-white/[0.02]">
                          {[
                            { l: 'IN', v: headers?.INFLOW, c: 'text-emerald-600' },
                            { l: 'OUT', v: headers?.CLEARED, c: 'text-rose-600' },
                            { l: 'EST', v: headers?.PLANNED, c: 'text-blue-600' },
                            { l: 'SUR', v: headers?.SURPLUS, c: 'text-slate-500' },
                            { l: 'MAR', v: headers?.MARGIN, c: 'text-slate-500' },
                          ].map((m) => (
                            <div key={m.l} className="flex flex-1 items-baseline gap-1.5">
                              <span className="text-[6px] font-black text-slate-400/80">{m.l}</span>
                              <span
                                className={`font-mono text-[8px] font-bold tabular-nums ${m.c}`}
                              >
                                ₱
                                {Math.abs(m.v || 0).toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AuditPanel;
