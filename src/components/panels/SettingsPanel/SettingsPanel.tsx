import React, { useState } from 'react';
import { useTreasury } from '../../../context/TreasuryContext';
import { TransactionType, Account, TreasuryData } from '../../../types';
import DeleteConfirmationModal from './DeleteConfirmationModal/DeleteConfirmationModal';
import TransactionCategoriesSection from './TransactionCategoriesSection/TransactionCategoriesSection';
import AccountsSection from './AccountsSection/AccountsSection';
import PayoutSection from './PayoutSection/PayoutSection';
import CurrencySection from './CurrencySection/CurrencySection';
import RestoreSection from './RestoreSection/RestoreSection';

const SettingsPanel: React.FC = () => {
  const { data, sync, updateAccounts, updateTypes } = useTreasury();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Safety State for Deletion
  const [deleteCandidate, setDeleteCandidate] = useState<{
    type: 'account' | 'taxonomy';
    item: Account | TransactionType;
  } | null>(null);

  // Routes whatever changed in `next` to the focused endpoint instead of the monolithic /api/update.
  const handleUpdate = async (next: TreasuryData): Promise<void> => {
    if (next.accounts !== data.accounts) return updateAccounts(next.accounts);
    if (next.types !== data.types) return updateTypes(next.types);
    return sync(next);
  };

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveEdit = (id: string, updates: { name: string }, type: 'accounts' | 'types') => {
    const nextData: TreasuryData = {
      ...data,
      [type]: data[type].map((item) => (item.id === id ? { ...item, ...updates } : item)),
    };
    handleUpdate(nextData);
    setEditingId(null);
  };

  const sectionClass =
    'overflow-hidden rounded-[24px] border border-black/5 bg-[#FBFBFD] shadow-sm dark:border-white/5 dark:bg-[#28282A]';
  const headerClass =
    'flex items-center justify-between border-b border-black/5 px-6 py-4 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] backdrop-blur-md';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F5F5F7] dark:bg-[#1E1E1F]">
      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="mx-auto max-w-5xl space-y-8">
          <CurrencySection sectionClass={sectionClass} headerClass={headerClass} />

          <PayoutSection sectionClass={sectionClass} headerClass={headerClass} />

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
            <AccountsSection
              sectionClass={sectionClass}
              headerClass={headerClass}
              handleUpdate={handleUpdate}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              setDeleteCandidate={setDeleteCandidate}
              editingId={editingId}
              setEditingId={setEditingId}
              saveEdit={saveEdit}
            />

            <TransactionCategoriesSection
              sectionClass={sectionClass}
              headerClass={headerClass}
              handleUpdate={handleUpdate}
              editingId={editingId}
              setEditingId={setEditingId}
              expandedNodes={expandedNodes}
              setDeleteCandidate={setDeleteCandidate}
              toggleNode={toggleNode}
              saveEdit={saveEdit}
            />
          </div>

          <RestoreSection sectionClass={sectionClass} headerClass={headerClass} />
        </div>
      </main>

      <DeleteConfirmationModal
        deleteCandidate={deleteCandidate}
        setDeleteCandidate={setDeleteCandidate}
        handleUpdate={handleUpdate}
      />
    </div>
  );
};

export default SettingsPanel;
