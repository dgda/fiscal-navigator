import React, { useState } from 'react';
import { TreasuryProvider, useTreasury } from './context/TreasuryContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar/Sidebar';
import RoadmapSpreadsheet from './components/roadmap/RoadmapSpreadsheet';
import TransactionEditModal from './components/roadmap/TransactionEditModal';
import SettingsPanel from './components/panels/SettingsPanel/SettingsPanel';
import { BalanceReconciliationModal } from './components/roadmap/BalanceReconciliationModal/BalanceReconciliationModal';
import { FilterMode, UseRoadmapProps } from './hooks/useRoadmap';
import { ThemeProvider } from './context/ThemeContext';

const AppContent: React.FC = () => {
  const { data, sync, reconcileRequest, clearReconcileRequest } = useTreasury();

  // 1. TEMPORAL SCOPE STATE
  const [filter, setFilter] = useState<UseRoadmapProps>({
    mode: FilterMode.ALL,
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  });

  // 2. UI VISIBILITY STATE
  const [activeView, setActiveView] = useState<'roadmap' | 'settings'>('roadmap');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 3. INTERACTION STATE
  const [editingId, setEditingId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const handleReconcileConfirm = (adjustments: Record<string, number>) => {
    if (!reconcileRequest || !data) return;

    // 1. Generate the updated ledger with subtractions
    const updatedLedger = data.transactions.map((t) => {
      if (adjustments[t.id]) {
        return {
          ...t,
          amount: t.amount - adjustments[t.id],
          history: [
            ...t.history,
            {
              timestamp: new Date().toISOString(),
              label: 'Balance Reconciliation Adjustment',
              snapshot: { amount: t.amount },
            },
          ],
        };
      }
      return t;
    });

    // 2. Pass BOTH the adjustments and the full updatedLedger to the callback
    // This allows the Sidebar to include these changes in its final sync
    reconcileRequest.onSuccess(adjustments, updatedLedger);
    clearReconcileRequest();
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 dark:bg-[#0A0A0B]">
      {/* TOP HUD: Restored with live account balances */}
      <Navbar activeView={activeView} setActiveView={setActiveView} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          filterMode={filter.mode}
          setFilterMode={(m) => setFilter({ ...filter, mode: m })}
          filterYear={filter.year}
          setFilterYear={(y) => setFilter({ ...filter, year: y })}
          filterMonth={filter.month}
          setFilterMonth={(m) => setFilter({ ...filter, month: m })}
          activeView={activeView}
          setActiveView={setActiveView}
          onCommitSuccess={(id) => setHighlightId(id)}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* MAIN LEDGER SPACE */}
        <main className="relative flex flex-1 flex-col overflow-hidden">
          {activeView === 'roadmap' ? (
            <RoadmapSpreadsheet
              filter={filter}
              onEdit={(id) => setEditingId(id)}
              highlightId={highlightId}
              onHighlightComplete={() => setHighlightId(null)}
            />
          ) : (
            <SettingsPanel />
          )}
        </main>
      </div>

      {/*  macOS EDIT MODAL: Series & Standalone support */}
      {editingId && (
        <TransactionEditModal transactionId={editingId} onClose={() => setEditingId(null)} />
      )}

      {/* GLOBAL RECONCILIATION MODAL: Blurs entire viewport */}
      {reconcileRequest && (
        <BalanceReconciliationModal
          isOpen={true}
          onClose={clearReconcileRequest}
          onConfirm={handleReconcileConfirm}
          cycleKey={reconcileRequest.cycleKey}
          shortfallAmount={reconcileRequest.shortfall}
          unpaidTransactions={data.transactions.filter(
            (t) => t.cycleKey === reconcileRequest.cycleKey && !t.isPaid,
          )}
          onSkip={() => {
            reconcileRequest.onSuccess({}, data.transactions);
            clearReconcileRequest();
          }}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <TreasuryProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </TreasuryProvider>
  );
};

export default App;
