import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ExpenseTableView } from './components/ExpenseTableView';
import { MonthlyReportView } from './components/MonthlyReportView';
import { SettingsView } from './components/SettingsView';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { ReceiptViewerModal } from './components/ReceiptViewerModal';
import { CorporateExpense, CompanySettings } from './types/expense';
import {
  getStoredExpenses,
  saveStoredExpense,
  deleteStoredExpense,
  getCompanySettings,
} from './utils/storage';

export default function App() {
  const [currentTab, setCurrentTab] = useState<
    'dashboard' | 'table' | 'report' | 'settings'
  >('dashboard');

  // Mês de competência selecionado (padrão: mês atual YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const [expenses, setExpenses] = useState<CorporateExpense[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(getCompanySettings());
  const [isLoading, setIsLoading] = useState(true);

  // Modais
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<CorporateExpense | null>(
    null
  );

  // Carrega despesas ao montar
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await getStoredExpenses();
      setExpenses(data);
      const savedSettings = getCompanySettings();
      setSettings(savedSettings);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Salvar nova despesa
  const handleSaveExpense = async (newExpense: CorporateExpense) => {
    await saveStoredExpense(newExpense);
    setExpenses((prev) => [newExpense, ...prev.filter((e) => e.id !== newExpense.id)]);
  };

  // Atualizar despesa existente
  const handleUpdateExpense = async (updatedExpense: CorporateExpense) => {
    await saveStoredExpense(updatedExpense);
    setExpenses((prev) =>
      prev.map((e) => (e.id === updatedExpense.id ? updatedExpense : e))
    );
  };

  // Excluir despesa
  const handleDeleteExpense = async (id: string) => {
    await deleteStoredExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Barra de Navegação Principal */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenScanner={() => setIsScannerOpen(true)}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-mono">Carregando painel financeiro...</p>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                expenses={expenses}
                selectedMonth={selectedMonth}
                onOpenScanner={() => setIsScannerOpen(true)}
                onSelectTab={setCurrentTab}
                onViewExpense={(exp) => setViewingExpense(exp)}
              />
            )}

            {currentTab === 'table' && (
              <ExpenseTableView
                expenses={expenses}
                selectedMonth={selectedMonth}
                onOpenScanner={() => setIsScannerOpen(true)}
                onViewExpense={(exp) => setViewingExpense(exp)}
                onUpdateExpense={handleUpdateExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {currentTab === 'report' && (
              <MonthlyReportView
                expenses={expenses}
                settings={settings}
                selectedMonth={selectedMonth}
                onViewExpense={(exp) => setViewingExpense(exp)}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                settings={settings}
                onUpdateSettings={setSettings}
                onRefreshData={loadData}
              />
            )}
          </>
        )}
      </main>

      {/* Rodapé Executivo Mínimo */}
      <footer className="print:hidden border-t border-slate-900 bg-[#070A10] py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Assistente de Gastos</span>
            <span aria-hidden="true">·</span>
            <span>Gestão & Prestação de Contas de Cartão Corporativo</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Armazenamento Seguro Local (IndexedDB)</span>
            <span aria-hidden="true">·</span>
            <span>Leitura Multimodal via Gemini IA</span>
          </div>
        </div>
      </footer>

      {/* Modal de Digitalização & Extração com Gemini */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSaveExpense={handleSaveExpense}
        selectedMonth={selectedMonth}
        defaultCardNumber={settings.corporateCardNumber}
      />

      {/* Modal de Visualização de Comprovante em Alta Resolução */}
      <ReceiptViewerModal
        expense={viewingExpense}
        onClose={() => setViewingExpense(null)}
      />
    </div>
  );
}
