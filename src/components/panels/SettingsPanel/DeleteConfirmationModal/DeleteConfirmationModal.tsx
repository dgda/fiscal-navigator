import React from 'react';
import { Account, TransactionType, TreasuryData } from '../../../../types';
import { AlertTriangle } from 'lucide-react';
import { useTreasury } from '../../../../context/TreasuryContext';

interface DeleteConfirmationModalProps {
  deleteCandidate: {
    type: 'account' | 'taxonomy';
    item: Account | TransactionType;
  } | null;
  setDeleteCandidate: (
    value: React.SetStateAction<{
      type: 'account' | 'taxonomy';
      item: Account | TransactionType;
    } | null>,
  ) => void;
  handleUpdate: (next: TreasuryData) => Promise<void>;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = (props) => {
  const { deleteCandidate, setDeleteCandidate, handleUpdate } = props;

  const { data } = useTreasury();

  const executeDelete = () => {
    if (!deleteCandidate) return;

    if (deleteCandidate.type === 'account') {
      handleUpdate({
        ...data,
        accounts: data.accounts.filter((x) => x.id !== deleteCandidate.item.id),
      });
    } else {
      handleUpdate({
        ...data,
        types: data.types.filter((t) => t.id !== deleteCandidate.item.id),
      });
    }
    setDeleteCandidate(null);
  };

  return (
    <>
      {deleteCandidate && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30 p-4 backdrop-blur-md"
          onClick={() => setDeleteCandidate(null)}
        >
          <div
            className="animate-in zoom-in-95 w-[280px] overflow-hidden rounded-[24px] bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:bg-[#1C1C1E]/95 dark:ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center p-6 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-500/20">
                <AlertTriangle size={18} />
              </div>
              <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">
                Confirm Deletion
              </h3>
              <p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                Are you sure you want to remove this {deleteCandidate.type}?
                <span className="mt-1 block font-black text-slate-900 dark:text-white">
                  "{deleteCandidate.item.name}"
                </span>
                This action cannot be undone.
              </p>
            </div>
            <div className="flex flex-col border-t border-black/5 dark:border-white/5">
              <button
                onClick={executeDelete}
                className="py-3.5 text-[11px] font-bold text-red-600 transition-colors hover:bg-black/[0.02] dark:text-red-500 dark:hover:bg-white/5"
              >
                Delete {deleteCandidate.type === 'account' ? 'Account' : 'Category'}
              </button>
              <button
                onClick={() => setDeleteCandidate(null)}
                className="border-t border-black/5 py-3.5 text-[11px] font-bold text-slate-400 transition-colors hover:bg-black/[0.02] dark:border-white/5 dark:hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeleteConfirmationModal;
