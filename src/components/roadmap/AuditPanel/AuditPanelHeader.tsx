import { Calculator, X } from 'lucide-react';
import React from 'react';

interface AuditPanelHeaderProps {
  activeMonthSummary: string | null;
  handleClose: () => void;
}

const AuditPanelHeader: React.FC<AuditPanelHeaderProps> = (props) => {
  const { activeMonthSummary, handleClose } = props;

  return (
    <div className="flex items-center justify-between border-b border-black/[0.05] px-6 py-4 dark:border-white/[0.05]">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-black">
          <Calculator size={14} />
        </div>
        <div>
          <h2 className="text-[12px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
            {activeMonthSummary}
          </h2>
          <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Ledger Intelligence Audit
          </p>
        </div>
      </div>
      <button
        onClick={handleClose}
        className="rounded-full p-2 text-slate-400 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default AuditPanelHeader;
