import React from 'react';
import {
  TrendingUp,
  Receipt,
  FileCheck,
  CreditCard,
  ArrowUpRight,
  Eye,
  Plus,
  FileSpreadsheet,
  Lock,
  Unlock,
  Archive,
  Cloud,
  FolderOpen,
  ExternalLink,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { CorporateExpense, InvoiceStatement } from '../types/expense';
import { DriveSyncInfo } from '../services/googleDriveStorage';
import { googleSignIn } from '../services/googleAuth';

interface DashboardViewProps {
  expenses: CorporateExpense[];
  selectedMonth: string; // YYYY-MM
  onOpenScanner: () => void;
  onSelectTab: (tab: 'dashboard' | 'table' | 'report' | 'settings') => void;
  onViewExpense: (expense: CorporateExpense) => void;
  invoiceStatus: InvoiceStatement | null;
  onRequestCloseInvoice: () => void;
  onReopenInvoice: () => void;
  onOpenInvoicesHistory: () => void;
  user?: User | null;
  syncInfo?: DriveSyncInfo | null;
  onLoginSuccess?: (user: User, accessToken: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  expenses,
  selectedMonth,
  onOpenScanner,
  onSelectTab,
  onViewExpense,
  invoiceStatus,
  onRequestCloseInvoice,
  onReopenInvoice,
  onOpenInvoicesHistory,
  user,
  syncInfo,
  onLoginSuccess,
}) => {
  // Filtra as despesas pelo mês selecionado
  const monthExpenses = expenses.filter((e) => e.date.startsWith(selectedMonth));

  const totalAmount = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalCount = monthExpenses.length;
  const withReceiptCount = monthExpenses.filter((e) => e.receipt).length;
  const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;

  // Maior despesa
  const highestExpense = monthExpenses.reduce<CorporateExpense | null>(
    (max, e) => (!max || e.amount > max.amount ? e : max),
    null
  );

  // Agrupamento por categoria
  const categoryStats: Record<string, { count: number; total: number }> = {};
  for (const exp of monthExpenses) {
    const cat = exp.category || 'Outros';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { count: 0, total: 0 };
    }
    categoryStats[cat].count += 1;
    categoryStats[cat].total += exp.amount;
  }

  const sortedCategories = Object.entries(categoryStats).sort(
    (a, b) => b[1].total - a[1].total
  );

  const formatMonthName = (mStr: string) => {
    try {
      const [year, month] = mStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } catch {
      return mStr;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Banner de Boas-Vindas & Ações Rápidas */}
      <div className="bg-gradient-to-r from-emerald-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs dark:shadow-none transition-colors">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Fechamento Mensal · {formatMonthName(selectedMonth)}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Prestação de Contas do Cartão Corporativo
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
            Digitalize comprovantes fiscais com IA, gerencie justificativas corporativas e
            acompanhe seu fechamento com sincronização contínua na nuvem.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('report')}
            className="flex-1 sm:flex-initial h-9 px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Relatório Mensal</span>
          </button>
          <button
            onClick={onOpenScanner}
            disabled={invoiceStatus?.status === 'fechada'}
            className="flex-1 sm:flex-initial h-9 px-4 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all rounded-lg shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Escanear Comprovante</span>
          </button>
        </div>
      </div>

      {/* Card Informativo de Sincronização em Nuvem (Multi-Dispositivos & Google Drive) */}
      {!user ? (
        <div className="bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-transparent border border-blue-200 dark:border-blue-900/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Acessando do Celular ou de outro computador?
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  Nuvem Ativa
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                Conecte sua Conta Google para sincronizar e carregar instantaneamente todas as suas despesas e comprovantes salvos na nuvem.
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                const res = await googleSignIn();
                if (res && onLoginSuccess) {
                  onLoginSuccess(res.user, res.accessToken);
                }
              } catch (e) {
                console.warn('Erro ao conectar Google:', e);
              }
            }}
            className="h-9 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all rounded-lg flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs"
          >
            <Cloud className="w-4 h-4" />
            <span>Conectar Conta Google</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Cloud className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Nuvem Ativa & Sincronizada
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {user.email}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Seus lançamentos estão sincronizados na nuvem central e na sua pasta do Google Drive (<span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">Assistente de Gastos</span>).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 pt-1 md:pt-0">
            {syncInfo?.folderUrl && (
              <a
                href={syncInfo.folderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-3 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Pasta Google Drive</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            )}
            {syncInfo?.reportDocUrl && (
              <a
                href={syncInfo.reportDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-3 text-[11px] font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <FileCheck className="w-3.5 h-3.5 text-blue-500" />
                <span>Documento Google Docs</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Card de Gestão do Ciclo de Fatura (Aberta / Fechada) */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-xs dark:shadow-none ${
          invoiceStatus?.status === 'fechada'
            ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/30'
            : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              invoiceStatus?.status === 'fechada'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {invoiceStatus?.status === 'fechada' ? (
              <Lock className="w-4 h-4" />
            ) : (
              <Unlock className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                Fatura de {formatMonthName(selectedMonth)}
              </span>
              {invoiceStatus?.status === 'fechada' ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>
                    Fechada{' '}
                    {invoiceStatus.closedAt &&
                      `em ${new Date(invoiceStatus.closedAt).toLocaleDateString('pt-BR')}`}
                  </span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Aberta · Lançamentos em Andamento</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-tight">
              {invoiceStatus?.status === 'fechada'
                ? 'Esta fatura foi encerrada. Seus relatórios contábeis estão consolidados. Deseja fazer alterações? Reabra para edição.'
                : 'Quando finalizar a inclusão de todos os comprovantes deste mês, clique em "Fechar Fatura" para consolidar a prestação de contas.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenInvoicesHistory}
            className="h-8 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Ver todas as faturas anteriores"
          >
            <Archive className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Histórico</span>
          </button>

          {invoiceStatus?.status === 'fechada' ? (
            <button
              onClick={onReopenInvoice}
              className="h-8 px-3.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Permite incluir ou alterar notas desta fatura"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Reabrir</span>
            </button>
          ) : (
            <button
              onClick={onRequestCloseInvoice}
              className="h-8 px-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Concluir lançamentos desta fatura"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Fechar Fatura</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid de KPIs Financeiros - 1 coluna no mobile, 2 no tablet, 4 no desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Gasto */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Total em Despesas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
            R$ {totalAmount.toFixed(2).replace('.', ',')}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{totalCount}</span>
            <span>despesas registradas neste mês</span>
          </p>
        </div>

        {/* Comprovantes Anexados */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Comprovantes com Anexo</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
            {withReceiptCount} / {totalCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            {totalCount > 0
              ? `${((withReceiptCount / totalCount) * 100).toFixed(0)}% com foto/PDF anexado`
              : 'Nenhuma despesa ainda'}
          </p>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Média por Comprovante</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
            R$ {averageAmount.toFixed(2).replace('.', ',')}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Ticket médio corporativo do período
          </p>
        </div>

        {/* Maior Despesa */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Maior Despesa Única</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
            {highestExpense
              ? `R$ ${highestExpense.amount.toFixed(2).replace('.', ',')}`
              : 'R$ 0,00'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 truncate">
            {highestExpense ? highestExpense.merchant : 'Sem registros'}
          </p>
        </div>
      </div>

      {/* Seção 2: Distribuição por Categoria e Recibos Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Distribuição por Categorias (5 colunas) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-xs dark:shadow-none transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Gastos por Categoria
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {sortedCategories.length} categorias ativas
            </span>
          </div>

          {sortedCategories.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              Nenhuma despesa registrada para o mês selecionado.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedCategories.map(([cat, data]) => {
                const percent =
                  totalAmount > 0 ? (data.total / totalAmount) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{cat}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                          {data.count} {data.count === 1 ? 'item' : 'itens'}
                        </span>
                        <span className="text-slate-900 dark:text-white font-mono font-semibold tabular-nums">
                          R$ {data.total.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>
                    {/* Barra de progresso */}
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mesa de Comprovantes Recentes (7 colunas) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 flex flex-col justify-between shadow-xs dark:shadow-none transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Comprovantes Recentes deste Mês
              </h2>
              <button
                onClick={() => onSelectTab('table')}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Ver todos na mesa</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {monthExpenses.length === 0 ? (
              <div className="py-12 text-center">
                <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nenhum comprovante adicionado em {formatMonthName(selectedMonth)}
                </p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Envie sua primeira foto ou PDF para preencher a mesa.
                </p>
                <button
                  onClick={onOpenScanner}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Escanear Primeiro Comprovante
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {monthExpenses.slice(0, 5).map((exp) => (
                  <div
                    key={exp.id}
                    className="py-3 flex items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Miniatura do recibo */}
                      {exp.receipt ? (
                        <div
                          onClick={() => onViewExpense(exp)}
                          className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:border-emerald-500 transition-colors"
                          title="Clique para ampliar o comprovante"
                        >
                          <img
                            src={exp.receipt.dataUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center shrink-0">
                          <Receipt className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {exp.merchant}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {exp.date.split('-').reverse().join('/')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm mt-0.5">
                          {exp.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                        R$ {exp.amount.toFixed(2).replace('.', ',')}
                      </span>
                      {exp.receipt && (
                        <button
                          onClick={() => onViewExpense(exp)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          title="Visualizar Comprovante"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {monthExpenses.length > 5 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <button
                onClick={() => onSelectTab('table')}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                + Mais {monthExpenses.length - 5} despesas na mesa de conferência
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
