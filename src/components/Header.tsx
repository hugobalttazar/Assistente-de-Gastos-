import React from 'react';
import { Plus, CreditCard, Calendar, Lock, Unlock, Archive } from 'lucide-react';
import { User } from 'firebase/auth';
import { PWAInstallButton } from './PWAInstallButton';
import { GoogleDriveUserMenu } from './GoogleDriveUserMenu';
import { DriveSyncInfo } from '../services/googleDriveStorage';
import { InvoiceStatement } from '../types/expense';

interface HeaderProps {
  currentTab: 'dashboard' | 'table' | 'report' | 'settings';
  onSelectTab: (tab: 'dashboard' | 'table' | 'report' | 'settings') => void;
  onOpenScanner: () => void;
  selectedMonth: string; // YYYY-MM
  onMonthChange: (month: string) => void;
  user: User | null;
  syncInfo: DriveSyncInfo | null;
  isSyncing: boolean;
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
  onLoginSuccess,
  onLogout,
  onManualSync,
  onOpenLeadsModal,
  invoiceStatus,
  onOpenInvoicesHistory,
  onRequestCloseInvoice,
  onReopenInvoice,
}) => {
  return (
    <header className="border-b border-slate-800 bg-[#0B0F17]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zona 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
                Assistente de Gastos
              </span>
              <span className="text-[11px] text-slate-400 font-medium tracking-wide">
                Cartão Corporativo
              </span>
            </div>
          </div>

          {/* Zona 2: Nav Links / Abas principais */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                currentTab === 'dashboard'
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Painel Geral
            </button>
            <button
              onClick={() => onSelectTab('table')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                currentTab === 'table'
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Mesa de Despesas
            </button>
            <button
              onClick={() => onSelectTab('report')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                currentTab === 'report'
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Relatório Mensal
            </button>
            <button
              onClick={() => onSelectTab('settings')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                currentTab === 'settings'
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Configurações & Backup
            </button>
            <button
              onClick={onOpenInvoicesHistory}
              className="px-3 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
              title="Consultar histórico de faturas fechadas e abertas"
            >
              <Archive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Faturas</span>
            </button>
          </nav>

          {/* Zona 3: Ação Primária & Seletor de Competência & Status de Fatura */}
          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton />

            {/* Status & Ação Rápida de Fechamento da Fatura do Mês */}
            {invoiceStatus?.status === 'fechada' ? (
              <button
                onClick={onOpenInvoicesHistory}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors cursor-pointer"
                title="Fatura deste mês está Fechada. Clique para gerenciar ou reabrir."
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Fatura Fechada</span>
              </button>
            ) : (
              <button
                onClick={onRequestCloseInvoice}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-400 text-xs font-medium transition-colors cursor-pointer"
                title="Concluiu os lançamentos deste mês? Clique para fechar a fatura."
              >
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xl:inline">Fechar Fatura</span>
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => onMonthChange(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-mono focus:outline-none cursor-pointer"
                title="Mês de competência"
              />
            </div>

            <button
              onClick={onOpenScanner}
              disabled={invoiceStatus?.status === 'fechada'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-95 transition-all rounded-lg shadow-sm whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title={
                invoiceStatus?.status === 'fechada'
                  ? 'Fatura fechada. Reabra a fatura para adicionar novos comprovantes.'
                  : 'Escanear novo comprovante'
              }
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Escanear Comprovante</span>
              <span className="sm:hidden">Escanear</span>
            </button>

            {/* Menu do Usuário & Conexão Google Drive */}
            <GoogleDriveUserMenu
              user={user}
              syncInfo={syncInfo}
              isSyncing={isSyncing}
              onLoginSuccess={onLoginSuccess}
              onLogout={onLogout}
              onManualSync={onManualSync}
              onOpenLeadsModal={onOpenLeadsModal}
            />
          </div>
        </div>

        {/* Barra de navegação mobile */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800/80 text-xs">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`px-2 py-1 rounded ${
              currentTab === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            Painel
          </button>
          <button
            onClick={() => onSelectTab('table')}
            className={`px-2 py-1 rounded ${
              currentTab === 'table' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            Despesas
          </button>
          <button
            onClick={() => onSelectTab('report')}
            className={`px-2 py-1 rounded ${
              currentTab === 'report' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            Relatório
          </button>
          <button
            onClick={() => onSelectTab('settings')}
            className={`px-2 py-1 rounded ${
              currentTab === 'settings' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            Ajustes
          </button>
          <button
            onClick={onOpenInvoicesHistory}
            className="px-2 py-1 rounded text-slate-400 hover:text-white"
          >
            Faturas
          </button>
        </div>
      </div>
    </header>
  );
};
