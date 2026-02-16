import React, { useState, useEffect } from 'react';
import { useTreasury } from '../../context/TreasuryContext';
import { useRoadmap } from '../../hooks/useRoadmap'; // Assuming the hook is in this path
import { Transaction } from '../../types';
import {
  X,
  Save,
  Layers,
  Target,
  ShieldCheck,
  History,
  ArrowRight,
  Unlink,
  Calendar,
  Hash,
  Tag,
  Repeat,
  Wallet,
  ArrowRightLeft,
  CalendarClock,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface EditModalProps {
  transactionId: string | null;
  onClose: () => void;
}

export const TransactionEditModal: React.FC<EditModalProps> = ({ transactionId, onClose }) => {
  const {
    data,
    commitUpdate,
    updateSeries,
    breakSeriesLink,
    getFullTypeName,
    checkIsTransfer,
    renderTypeOptions,
  } = useTreasury();

  // Load master cycles to populate the cycle selector
  const { masterCycles, groupedCycleOptions } = useRoadmap(
    'all',
    new Date().getFullYear(),
    new Date().getMonth(),
  );

  const [tx, setTx] = useState<Transaction | null>(null);
  const [editMode, setEditMode] = useState<'single' | 'series'>('single');
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (transactionId) {
      const found = data.transactions.find((t) => t.id === transactionId);
      if (found) setTx({ ...found });
    }
  }, [transactionId, data.transactions]);

  if (!tx) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const handleSave = () => {
    if (editMode === 'series' && tx.recurringGroupId) {
      updateSeries(tx.recurringGroupId, tx, 'Manual Series Update');
    } else {
      commitUpdate(tx.id, tx, 'Manual Update');
    }
    handleClose();
  };

  const sortedHistory = tx.history ? [...tx.history].reverse() : [];

  const getAccountName = (id?: string) => {
    if (!id) return 'None';
    return data.accounts.find((a) => a.id === id)?.name || 'Unknown Account';
  };

  const DiffRow = ({
    label,
    oldVal,
    newVal,
    formatFn,
  }: {
    label: string;
    oldVal: any;
    newVal: any;
    formatFn?: (v: any) => string;
  }) => {
    if (oldVal === newVal || (oldVal === undefined && newVal === undefined)) return null;

    const displayOld = formatFn ? formatFn(oldVal) : oldVal;
    const displayNew = formatFn ? formatFn(newVal) : newVal;

    return (
      <div className="flex items-center justify-between py-1.5 text-[10px] first:pt-0 last:pb-0">
        <span className="font-bold text-slate-400">{label}</span>
        <div className="flex items-center gap-2">
          <span className="max-w-[100px] truncate rounded bg-red-50 px-1.5 py-0.5 font-medium text-red-600 line-through decoration-red-300 dark:bg-red-500/10 dark:text-red-400">
            {displayOld?.toString() || '—'}
          </span>
          <ArrowRight size={10} className="shrink-0 text-slate-300" />
          <span className="max-w-[120px] truncate rounded bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            {displayNew?.toString() || '—'}
          </span>
        </div>
      </div>
    );
  };

  const inputGroupClass =
    'group relative flex items-center rounded-[10px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] ring-1 ring-black/5 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 dark:bg-[#1C1C1E] dark:ring-white/10 dark:focus-within:ring-blue-500/30';

  const inputBaseClass =
    'w-full bg-transparent px-3 py-2.5 pl-9 text-[11px] font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition-colors dark:text-[#E1E1E1] dark:placeholder:text-slate-600';

  const iconBaseClass =
    'absolute left-3 text-slate-400 dark:text-slate-600 transition-colors group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400';

  return (
    <div
      className={`fixed inset-0 z-[10000] flex items-center justify-center bg-black/20 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/50 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleClose}
    >
      <div
        className={`flex w-[460px] flex-col overflow-hidden rounded-[20px] bg-[#FBFBFD] shadow-2xl ring-1 ring-black/5 transition-all duration-300 dark:bg-[#0A0A0B] dark:ring-white/10 ${isClosing ? 'scale-[0.98] opacity-0' : 'scale-100 opacity-100'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-black/5 bg-white/50 px-5 py-4 backdrop-blur-md dark:border-white/5 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30">
              <Layers size={14} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                Transaction Editor
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                  {getFullTypeName(tx.typeId)}
                </span>
                <span className="h-0.5 w-0.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500/90">
                  {format(tx.created_at, 'MMM dd, yyyy HH:mm')}
                </span>
                <span className="h-0.5 w-0.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span className="font-mono text-[9px] text-slate-300 dark:text-slate-600">
                  #{tx.id.substring(0, 6)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-slate-500 transition-colors hover:bg-black/10 hover:text-red-500 dark:bg-white/10 dark:text-slate-400 dark:hover:bg-white/20 dark:hover:text-red-400"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* BODY */}
        <div className="no-scrollbar max-h-[65vh] overflow-y-auto p-6">
          <div className="space-y-6">
            {/* 1. CORE DETAILS */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Core Details
                </span>
              </div>

              <div className={inputGroupClass}>
                <Tag size={12} className={iconBaseClass} />
                <input
                  value={tx.name}
                  onChange={(e) => setTx({ ...tx, name: e.target.value })}
                  className={inputBaseClass}
                  placeholder="Transaction Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={inputGroupClass}>
                  <Hash size={12} className={iconBaseClass} />
                  <input
                    type="number"
                    value={tx.amount}
                    onChange={(e) => setTx({ ...tx, amount: Number(e.target.value) })}
                    className={inputBaseClass}
                    placeholder="0.00"
                  />
                </div>
                <div className={inputGroupClass}>
                  <Calendar size={12} className={iconBaseClass} />
                  <input
                    type="date"
                    value={format(parseISO(tx.date), 'yyyy-MM-dd')}
                    onChange={(e) => setTx({ ...tx, date: new Date(e.target.value).toISOString() })}
                    className={`${inputBaseClass} [color-scheme:light] dark:[color-scheme:dark]`}
                  />
                </div>
              </div>

              <div className={inputGroupClass}>
                <Layers size={12} className={iconBaseClass} />
                <select
                  value={tx.typeId}
                  onChange={(e) => setTx({ ...tx, typeId: e.target.value })}
                  className={`${inputBaseClass} appearance-none`}
                >
                  {renderTypeOptions()}
                </select>
              </div>
            </div>

            {/* NEW: TIMELINE ASSIGNMENT (Cycle Selection) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Timeline Assignment
                </span>
              </div>

              <div className={inputGroupClass}>
                <CalendarClock size={12} className={iconBaseClass} />
                <select
                  name="cycleKey"
                  defaultValue={tx.cycleKey}
                  className={`${inputBaseClass} appearance-none`}
                  onChange={(e) => setTx({ ...tx, cycleKey: e.target.value })}
                  required
                >
                  {Object.entries(groupedCycleOptions).map(([m, c]: any) => (
                    <optgroup key={m} label={m} className="dark:bg-[#1A1A1A]">
                      {c.map((o: any) => (
                        <option key={o.key} value={o.key}>
                          {o.display} ({o.dateLabel})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {/* <select
                  value={tx.cycleKey}
                  onChange={(e) => setTx({ ...tx, cycleKey: e.target.value })}
                  className={`${inputBaseClass} appearance-none`}
                >
                  {masterCycles.map((cycle) => (
                    <option key={cycle.key} value={cycle.key}>
                      {format(parseISO(cycle.date), 'MMM dd, yyyy')} ({cycle.absoluteSequence})
                    </option>
                  ))}
                </select> */}
              </div>
            </div>

            {/* 2. FINANCIAL ROUTING (Account Selection) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Financial Routing
                </span>
              </div>

              <div className={inputGroupClass}>
                <Wallet size={12} className={iconBaseClass} />
                <select
                  value={tx.accountId}
                  onChange={(e) => setTx({ ...tx, accountId: e.target.value })}
                  className={`${inputBaseClass} appearance-none`}
                >
                  {data.accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              {checkIsTransfer(tx.typeId) && (
                <div className={inputGroupClass}>
                  <ArrowRightLeft size={12} className={iconBaseClass} />
                  <select
                    value={tx.toAccountId || ''}
                    onChange={(e) => setTx({ ...tx, toAccountId: e.target.value })}
                    className={`${inputBaseClass} appearance-none`}
                  >
                    <option value="">Destination Account...</option>
                    {data.accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 3. RECURRENCE CONTROL */}
            {tx.recurringGroupId && (
              <div className="rounded-[14px] border border-blue-100 bg-blue-50/30 p-4 dark:border-blue-900/30 dark:bg-blue-900/5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Repeat size={12} />
                    <span className="text-[10px] font-black uppercase tracking-wide">
                      Series Logic
                    </span>
                  </div>
                  <button
                    onClick={() => breakSeriesLink(tx.id)}
                    className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[9px] font-bold uppercase text-slate-500 shadow-sm transition-all hover:text-red-500 dark:bg-white/5 dark:text-slate-400 dark:hover:text-red-400"
                  >
                    <Unlink size={10} /> Detach
                  </button>
                </div>

                <div className="flex rounded-[10px] bg-slate-200/50 p-1 dark:bg-black/20">
                  {(['single', 'series'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setEditMode(m)}
                      className={`flex-1 rounded-[7px] py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all ${
                        editMode === m
                          ? 'bg-white text-blue-600 shadow-sm dark:bg-blue-600 dark:text-white dark:shadow-md'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {m === 'single' ? 'This Instance' : 'All Future'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. STATUS TOGGLES */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTx({ ...tx, isPlanned: !tx.isPlanned })}
                className={`group relative flex items-center justify-center gap-2 overflow-hidden rounded-[12px] border px-4 py-3 transition-all ${
                  tx.isPlanned
                    ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400'
                    : 'border-black/5 bg-white text-slate-400 hover:border-black/10 hover:bg-slate-50 hover:text-slate-600 dark:border-white/5 dark:bg-[#1C1C1E] dark:hover:border-white/10 dark:hover:bg-white/5'
                }`}
              >
                <Target
                  size={14}
                  strokeWidth={2.5}
                  className={tx.isPlanned ? 'fill-current' : ''}
                />
                <span className="text-[10px] font-black uppercase tracking-wide">Planned</span>
              </button>

              <button
                onClick={() => setTx({ ...tx, isPaid: !tx.isPaid })}
                className={`group relative flex items-center justify-center gap-2 overflow-hidden rounded-[12px] border px-4 py-3 transition-all ${
                  tx.isPaid
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'border-black/5 bg-white text-slate-400 hover:border-black/10 hover:bg-slate-50 hover:text-slate-600 dark:border-white/5 dark:bg-[#1C1C1E] dark:hover:border-white/10 dark:hover:bg-white/5'
                }`}
              >
                <ShieldCheck
                  size={14}
                  strokeWidth={2.5}
                  className={tx.isPaid ? 'fill-current' : ''}
                />
                <span className="text-[10px] font-black uppercase tracking-wide">Liquidated</span>
              </button>
            </div>

            {/* 5. AUDIT TRAIL */}
            <div className="rounded-[14px] border border-black/5 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-white/[0.02]">
              <div className="mb-4 flex items-center gap-2">
                <History size={12} className="text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Ledger History
                </h3>
              </div>

              <div className="relative space-y-4 pl-2">
                <div className="absolute bottom-0 left-[5px] top-1.5 w-[1px] bg-slate-200 dark:bg-white/5" />

                {sortedHistory.length > 0 ? (
                  sortedHistory.map((entry, i) => {
                    const s = entry.snapshot;
                    return (
                      <div key={i} className="relative pl-6">
                        <div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-300 ring-1 ring-slate-200 dark:border-[#1C1C1E] dark:bg-slate-600 dark:ring-white/10" />

                        <div className="mb-2 flex items-baseline justify-between">
                          <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">
                            {entry.label}
                          </span>
                          <span className="font-mono text-[9px] font-medium text-slate-400">
                            {format(parseISO(entry.timestamp), 'HH:mm • MMM dd')}
                          </span>
                        </div>

                        <div className="space-y-0.5 rounded-lg border border-black/5 bg-white p-3 shadow-sm dark:border-white/5 dark:bg-black/20">
                          <DiffRow label="Name" oldVal={s.name} newVal={tx.name} />
                          <DiffRow
                            label="Amount"
                            oldVal={s.amount}
                            newVal={tx.amount}
                            formatFn={(v) => `₱${Number(v).toLocaleString()}`}
                          />
                          <DiffRow
                            label="Category"
                            oldVal={s.typeId}
                            newVal={tx.typeId}
                            formatFn={(id) => getFullTypeName(id)}
                          />
                          <DiffRow
                            label="Source"
                            oldVal={s.accountId}
                            newVal={tx.accountId}
                            formatFn={(id) => getAccountName(id)}
                          />
                          <DiffRow
                            label="Dest"
                            oldVal={s.toAccountId}
                            newVal={tx.toAccountId}
                            formatFn={(id) => getAccountName(id)}
                          />
                          <DiffRow label="Cycle" oldVal={s.cycleKey} newVal={tx.cycleKey} />
                          <DiffRow
                            label="Date"
                            oldVal={s.date}
                            newVal={tx.date}
                            formatFn={(v) => (v ? format(parseISO(v), 'MM/dd/yy') : '')}
                          />
                          <DiffRow
                            label="Status"
                            oldVal={s.isPaid}
                            newVal={tx.isPaid}
                            formatFn={(v) => (v ? 'Liquidated' : 'Planned')}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center gap-2 pl-6 pt-1 text-slate-400">
                    <div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-200 dark:border-[#1C1C1E] dark:bg-white/10" />
                    <span className="text-[10px] italic">No modifications logged</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center gap-3 border-t border-black/5 bg-slate-50/50 p-4 backdrop-blur-md dark:border-white/5 dark:bg-[#141416]">
          <button
            onClick={handleClose}
            className="rounded-[10px] px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-slate-900 py-2.5 text-[10px] font-black uppercase tracking-wide text-white shadow-lg shadow-slate-900/10 transition-all hover:translate-y-[-1px] hover:bg-slate-800 hover:shadow-xl active:translate-y-0 active:scale-[0.98] dark:bg-blue-600 dark:shadow-blue-900/20 dark:hover:bg-blue-500"
          >
            <Save size={14} />
            {editMode === 'series' ? 'Update Series' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
