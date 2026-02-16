import React, { useState } from 'react';
import { TreasuryProvider } from './context/TreasuryContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { RoadmapSpreadsheet } from './components/roadmap/RoadmapSpreadsheet';
import { TransactionEditModal } from './components/roadmap/TransactionEditModal';
import { SettingsPanel } from './components/panels/SettingsPanel'; // Re-integrated Import

const App: React.FC = () => {
  // 1. TEMPORAL SCOPE STATE
  const [filter, setFilter] = useState<{
    mode: 'all' | 'year' | 'month';
    year: number;
    month: number;
  }>({
    mode: 'all',
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  });

  // 2. UI VISIBILITY STATE
  const [activeView, setActiveView] = useState<'roadmap' | 'settings'>('roadmap');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 3. INTERACTION STATE
  const [editingId, setEditingId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  return (
    <TreasuryProvider>
      <ThemeProvider>
        <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 dark:bg-[#0A0A0B]">
          {/* TOP HUD: Restored with live account balances */}
          <Navbar activeView={activeView} setActiveView={setActiveView} />

          <div className="flex flex-1 overflow-hidden">
            {/* LEFT COMMAND SIDEBAR: Only visible in Roadmap view */}
            {activeView === 'roadmap' && (
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
            )}

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
        </div>
      </ThemeProvider>
    </TreasuryProvider>
  );
};

export default App;
