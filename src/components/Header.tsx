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
          {/* Linha Principal do Cabeçalho - 3 Colunas Perfeitas no Esquadro (Altura h-16) */}
          <div className="relative flex items-center justify-between h-16 w-full">
            {/* Zona 1: Brand Wordmark (Esquerda - Alinhada à margem esquerda dos cartões) */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-2xs">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs sm:text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                  Assistente de Gastos
                </span>
                <span className="text-[9px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                  Cartão Corporativo
                </span>
              </div>
            </div>

            {/* Zona 2: Cápsula Centralizada de Navegação (Plano 1 - Perfeitamente ancorada ao Centro Matemático) */}
            <div className="hidden lg:flex items-center justify-center absolute left-1/2 -translate-x-1/2 pointer-events-none">
              <nav
                aria-label="Navegação Central"
                className="pointer-events-auto bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-1 rounded-xl shadow-xs backdrop-blur-md flex items-center gap-1"
              >
                <button
                  onClick={() => onSelectTab('dashboard')}
                  className={`h-8 px-3 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                    currentTab === 'dashboard'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Painel</span>
                </button>
                <button
                  onClick={() => onSelectTab('table')}
                  className={`h-8 px-3 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                    currentTab === 'table'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Mesa de Despesas</span>
                </button>
                <button
                  onClick={() => onSelectTab('report')}
                  className={`h-8 px-3 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                    currentTab === 'report'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Relatório</span>
                </button>
                <button
                  onClick={() => onSelectTab('settings')}
                  className={`h-8 px-3 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                    currentTab === 'settings'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configurações</span>
                </button>
                <button
                  onClick={onOpenInvoicesHistory}
                  className="h-8 px-3 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50 transition-all whitespace-nowrap flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  title="Consultar histórico de faturas fechadas e abertas"
                >
                  <Archive className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Faturas</span>
                </button>
              </nav>
            </div>

            {/* Zona 3: Ações e Ferramentas Rigorosamente no Esquadro à Direita */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Seletor de Competência (Desktop) */}
              <div className="hidden md:flex items-center h-9 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 text-xs text-slate-700 dark:text-slate-300 shrink-0 shadow-2xs">
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
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shadow-2xs cursor-pointer shrink-0"
                title={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
                aria-label="Alternar modo claro e escuro"
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-700" />
                )}
              </button>

              {/* Ação Primária: Escanear Comprovante (visível em tablet/desktop; no mobile utiliza-se o botão central da Bottom Navigation) */}
              <button
                onClick={onOpenScanner}
                disabled={invoiceStatus?.status === 'fechada'}
                className="hidden sm:flex h-9 items-center justify-center gap-1.5 px-3.5 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all rounded-lg shadow-xs whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title={
                  invoiceStatus?.status === 'fechada'
                    ? 'Fatura fechada. Reabra a fatura para adicionar novos comprovantes.'
                    : 'Escanear novo comprovante com IA'
                }
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Escanear</span>
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
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenInvoicesHistory}
                className="h-8 px-2 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Archive className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Faturas</span>
              </button>

              {invoiceStatus?.status === 'fechada' ? (
                <button
                  onClick={onReopenInvoice}
                  className="h-8 px-2.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-1 cursor-pointer"
                  title="Reabrir fatura para novos lançamentos"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Reabrir</span>
                </button>
              ) : (
                <button
                  onClick={onRequestCloseInvoice}
                  className="h-8 px-2.5 text-[11px] font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg flex items-center gap-1 cursor-pointer"
                  title="Encerrar lançamentos e fechar fatura deste mês"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Fechar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Barra de Navegação Inferior Dedicada para Smartphones (Mobile Bottom Navigation) */}
      <nav
        aria-label="Navegação Principal Mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1 flex items-center justify-around shadow-lg transition-colors"
      >
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-lg min-w-[56px] min-h-[48px] transition-colors cursor-pointer ${
            currentTab === 'dashboard'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Painel</span>
        </button>

        <button
          onClick={() => onSelectTab('table')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-lg min-w-[56px] min-h-[48px] transition-colors cursor-pointer ${
            currentTab === 'table'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Despesas</span>
        </button>

        {/* Botão de Destaque Central: Escanear */}
        <button
          onClick={onOpenScanner}
          disabled={invoiceStatus?.status === 'fechada'}
          className="flex flex-col items-center justify-center -mt-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 p-2.5 rounded-full shadow-lg border-4 border-white dark:border-[#0B0F17] transition-all cursor-pointer disabled:opacity-40"
          title="Digitalizar Comprovante"
          aria-label="Digitalizar comprovante"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>

        <button
          onClick={() => onSelectTab('report')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-lg min-w-[56px] min-h-[48px] transition-colors cursor-pointer ${
            currentTab === 'report'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Relatório</span>
        </button>

        <button
          onClick={() => onSelectTab('settings')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-lg min-w-[56px] min-h-[48px] transition-colors cursor-pointer ${
            currentTab === 'settings'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Ajustes</span>
        </button>
      </nav>
    </>
  );
};
