import React, { useState } from 'react';
import { useTreasury } from '../../../context/TreasuryContext';
import { TransactionType, Account, TreasuryData } from '../../../types';
import DeleteConfirmationModal from './DeleteConfirmationModal/DeleteConfirmationModal';
import TransactionCategoriesSection from './TransactionCategoriesSection/TransactionCategoriesSection';
import AccountsSection from './AccountsSection/AccountsSection';
import PayoutSection from './PayoutSection/PayoutSection';

const SettingsPanel: React.FC = () => {
  const { data, sync } = useTreasury();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Safety State for Deletion
  const [deleteCandidate, setDeleteCandidate] = useState<{
    type: 'account' | 'taxonomy';
    item: Account | TransactionType;
  } | null>(null);

  const handleUpdate = (next: TreasuryData) => sync(next);

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
    'overflow-hidden rounded-[24px] border border-black/5 bg-[#FBFBFD] shadow-sm dark:border-white/5 dark:bg-[#141416]';
  const headerClass =
    'flex items-center justify-between border-b border-black/5 px-6 py-4 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] backdrop-blur-md';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F5F5F7] dark:bg-[#000000]">
      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="mx-auto max-w-5xl space-y-8">
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
