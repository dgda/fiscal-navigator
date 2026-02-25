import React, { useState } from 'react';
import { Transaction } from '../../../types';
import { X, AlertCircle, Check, DollarSign, ArrowRight } from 'lucide-react';
import { CURRENCY_SYMBOL } from '../../../constants';

interface BalanceReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (adjustments: Record<string, number>) => void;
  onSkip?: () => void;
  cycleKey: string;
  shortfallAmount: number;
  unpaidTransactions: Transaction[];
}

export const BalanceReconciliationModal: React.FC<BalanceReconciliationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  cycleKey,
  shortfallAmount,
  unpaidTransactions,
  onSkip,
}) => {
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});

  const totalAdjusted = Object.values(adjustments).reduce((sum, val) => sum + val, 0);
  const remainingShortfall = Math.max(0, shortfallAmount - totalAdjusted);

  if (!isOpen) return null;

  const handleAdjust = (txId: string, input: string, max: number) => {
    const amount = Number(input);
    const validAmount = Math.min(Math.max(0, amount), max);
    setAdjustments((prev) => ({ ...prev, [txId]: validAmount }));
  };

  return (
    <div
      className="animate-in fade-in fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 px-4 backdrop-blur-md duration-300"
      onClick={onClose}
    >
      <div
        className="animate-in zoom-in-95 relative w-full max-w-[500px] overflow-hidden rounded-[24px] bg-[#FBFBFD]/90 shadow-2xl ring-1 ring-black/5 duration-300 dark:bg-[#1C1C1E]/90 dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/5 px-6 py-5 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                Liquidity Reconciliation
              </h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                Cycle: <span className="font-mono text-blue-500">{cycleKey}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-slate-400 transition-colors hover:bg-black/10 hover:text-slate-600 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Status Dashboard */}
        <div className="px-6 py-6">
          <div className="mb-6 flex items-center justify-between rounded-2xl bg-white/50 p-5 shadow-sm ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/5">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                Required Reduction
              </span>
              <div className="text-xl font-black text-red-500">
                {CURRENCY_SYMBOL}{' '}
                {shortfallAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-white/10" />
            <div className="text-right">
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                Remaining Gap
              </span>
              <div
                className={`text-xl font-black transition-colors ${remainingShortfall <= 0 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}
              >
                {CURRENCY_SYMBOL}{' '}
                {remainingShortfall.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* List of Unpaid Transactions */}
          <div className="no-scrollbar max-h-[320px] space-y-3 overflow-y-auto pr-1">
            <span className="block px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Select targets for dispersion
            </span>
            {unpaidTransactions.length > 0 ? (
              unpaidTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="group relative rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition-all focus-within:ring-blue-500/50 dark:bg-[#2C2C2E]/50 dark:ring-white/5"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      {tx.name}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-slate-400">
                      Max: {CURRENCY_SYMBOL} {tx.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 text-slate-400 transition-colors group-focus-within:text-blue-500">
                      <DollarSign size={12} />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount to subtract..."
                      className="w-full rounded-lg bg-slate-50 py-2.5 pl-8 pr-3 text-[11px] font-semibold text-slate-900 outline-none ring-1 ring-inset ring-black/5 transition-all focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:bg-black/20 dark:text-white dark:ring-white/5 dark:focus:bg-black/40"
                      value={adjustments[tx.id] || ''}
                      onChange={(e) => handleAdjust(tx.id, e.target.value, tx.amount)}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-[11px] italic text-slate-400">
                No unpaid transactions available in this cycle to disperse from.
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 bg-black/5 p-5 backdrop-blur-sm dark:bg-white/5">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={onSkip}
            className="px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-amber-600 transition-colors hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
          >
            Ignore & Proceed
          </button>
          <button
            disabled={remainingShortfall > 0.01}
            onClick={() => onConfirm(adjustments)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-slate-900/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:grayscale dark:bg-white dark:text-black dark:shadow-white/5"
          >
            <Check size={14} strokeWidth={3} />
            Confirm Dispersion
          </button>
        </div>
      </div>
    </div>
  );
};
