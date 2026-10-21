import React from 'react';
import {
  Plus,
  CreditCard,
  Calendar,
  Lock,
  Unlock,
  Archive,
  Sun,
  Moon,
  LayoutDashboard,
  Receipt,
  FileText,
  Settings,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { PWAInstallButton } from './PWAInstallButton';
import { GoogleDriveUserMenu } from './GoogleDriveUserMenu';
import { DriveSyncInfo } from '../services/googleDriveStorage';
import { InvoiceStatement } from '../types/expense';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  currentTab: 'dashboard' | 'table' | 'report' | 'settings';
  onSelectTab: (tab: 'dashboard' | 'table' | 'report' | 'settings') => void;
  onOpenScanner: () => void;
  selectedMonth: string; // YYYY-MM
  onMonthChange: (month: string) => void;
  user: User | null;
  syncInfo: DriveSyncInfo | null;
  isSyncing: boolean;
  lastSyncedTime?: Date | null;
  secondsUntilSync?: number;
  onLoginSuccess: (user: User, accessToken: string) => void;
  onLogout: () => void;
  onManualSync: () => void;
  onOpenLeadsModal: () => void;
  invoiceStatus: InvoiceStatement | null;
  onOpenInvoicesHistory: () => void;
  onRequestCloseInvoice: () => void;
  onReopenInvoice: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenScanner,
  selectedMonth,
  onMonthChange,
  user,
  syncInfo,
  isSyncing,
  lastSyncedTime,
  secondsUntilSync,
  onLoginSuccess,
  onLogout,
  onManualSync,
  onOpenLeadsModal,
  invoiceStatus,
  onOpenInvoicesHistory,
  onRequestCloseInvoice,
  onReopenInvoice,
}) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <>
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Linha Principal do Cabeçalho - Altura h-16 e alinhamento estrito em esquadro */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 h-16">
            {/* Zona 1: Brand Wordmark */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                  Assistente de Gastos
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                  Cartão Corporativo
                </span>
              </div>
            </div>

            {/* Zona 2: Nav Links Desktop / Tablet (md+) */}
            <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
              <button
                onClick={() => onSelectTab('dashboard')}
                className={`h-9 px-3 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  currentTab === 'dashboard'
                    ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Painel Geral</span>
              </button>
              <button
                onClick={() => onSelectTab('table')}
                className={`h-9 px-3 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  currentTab === 'table'
                    ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Mesa de Despesas</span>
              </button>
              <button
                onClick={() => onSelectTab('report')}
                className={`h-9 px-3 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  currentTab === 'report'
                    ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Relatório Mensal</span>
              </button>
              <button
                onClick={() => onSelectTab('settings')}
                className={`h-9 px-3 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  currentTab === 'settings'
                    ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Configurações</span>
              </button>
              <button
                onClick={onOpenInvoicesHistory}
                className="h-9 px-3 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                title="Consultar histórico de faturas fechadas e abertas"
              >
                <Archive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Faturas</span>
              </button>
            </nav>

            {/* Zona 3: Ações e Ferramentas em Esquadro Perfeito (Todos h-9 e alinhamento central) */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <PWAInstallButton />

              {/* Status de Fatura (Oculto em telas ultra-pequenas, exibido na sub-barra mobile) */}
              <div className="hidden xl:flex items-center">
                {invoiceStatus?.status === 'fechada' ? (
                  <button
                    onClick={onOpenInvoicesHistory}
                    className="h-9 flex items-center gap-1.5 px-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors cursor-pointer shrink-0"
                    title="Fatura deste mês está Fechada. Clique para gerenciar ou reabrir."
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Fatura Fechada</span>
                  </button>
                ) : (
                  <button
                    onClick={onRequestCloseInvoice}
                    className="h-9 flex items-center gap-1.5 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:border-amber-500/40 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 text-xs font-medium transition-colors cursor-pointer shrink-0"
                    title="Concluiu os lançamentos deste mês? Clique para fechar a fatura."
                  >
                    <Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Fechar Fatura</span>
                  </button>
                )}
              </div>

              {/* Seletor de Competência (Desktop/Tablet) */}
              <div className="hidden md:flex items-center h-9 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 text-xs text-slate-700 dark:text-slate-300 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1.5" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => onMonthChange(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-slate-200 text-xs font-mono focus:outline-none cursor-pointer"
                  title="Mês de competência"
                />
              </div>

              {/* Botão de Alternância de Tema Claro / Escuro */}
              <button
                type="button"
                onClick={toggleTheme}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shadow-xs cursor-pointer shrink-0"
                title={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
                aria-label="Alternar modo claro e escuro"
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-700" />
                )}
              </button>

              {/* Ação Primária: Escanear Comprovante */}
              <button
                onClick={onOpenScanner}
                disabled={invoiceStatus?.status === 'fechada'}
                className="h-9 flex items-center justify-center gap-1.5 px-3 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all rounded-lg shadow-xs whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title={
                  invoiceStatus?.status === 'fechada'
                    ? 'Fatura fechada. Reabra a fatura para adicionar novos comprovantes.'
                    : 'Escanear novo comprovante com IA'
                }
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">Escanear</span>
              </button>

              {/* Menu do Usuário & Conexão Google Drive em Esquadro Perfeito */}
              <GoogleDriveUserMenu
                user={user}
                syncInfo={syncInfo}
                isSyncing={isSyncing}
                lastSyncedTime={lastSyncedTime}
                secondsUntilSync={secondsUntilSync}
                onLoginSuccess={onLoginSuccess}
                onLogout={onLogout}
                onManualSync={onManualSync}
                onOpenLeadsModal={onOpenLeadsModal}
              />
            </div>
          </div>

          {/* Sub-barra Compacta Mobile/Tablet para Competência e Status da Fatura */}
          <div className="flex md:hidden items-center justify-between gap-2 py-2 border-t border-slate-200 dark:border-slate-800/80 text-xs">
            {/* Seletor de Competência touch-friendly */}
            <div className="flex items-center h-8 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2 text-xs text-slate-700 dark:text-slate-300 flex-1 max-w-[170px]">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1.5" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => onMonthChange(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 text-xs font-mono focus:outline-none cursor-pointer w-full"
                title="Mês de competência"
              />
            </div>

            {/* Status da Fatura Mobile */}
            {invoiceStatus?.status === 'fechada' ? (
              <button
                onClick={onOpenInvoicesHistory}
                className="h-8 flex items-center justify-center gap-1.5 px-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold cursor-pointer shrink-0"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Fatura Fechada</span>
              </button>
            ) : (
              <button
                onClick={onRequestCloseInvoice}
                className="h-8 flex items-center justify-center gap-1.5 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer shrink-0"
              >
                <Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Fechar Fatura</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Barra de Navegação Inferior Nativa para Mobile (Smartphones e Tablets < md) */}
      <nav
        aria-label="Navegação móvel"
        className="print:hidden md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-xl px-2 py-1 safe-area-bottom transition-colors"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg transition-all min-h-[48px] cursor-pointer ${
              currentTab === 'dashboard'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Painel</span>
          </button>

          <button
            onClick={() => onSelectTab('table')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg transition-all min-h-[48px] cursor-pointer ${
              currentTab === 'table'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Despesas</span>
          </button>

          <button
            onClick={() => onSelectTab('report')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg transition-all min-h-[48px] cursor-pointer ${
              currentTab === 'report'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Relatório</span>
          </button>

          <button
            onClick={onOpenInvoicesHistory}
            className="flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg transition-all min-h-[48px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <Archive className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Faturas</span>
          </button>

          <button
            onClick={() => onSelectTab('settings')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg transition-all min-h-[48px] cursor-pointer ${
              currentTab === 'settings'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Ajustes</span>
          </button>
        </div>
      </nav>
    </>
  );
};
