import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Lock,
  Unlock,
  Calendar,
  FileText,
  DollarSign,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Search,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react';
import { CorporateExpense, CompanySettings, InvoiceStatement } from '../types/expense';
import { formatMonthName } from '../utils/storage';
import { exportExpensesToPdf } from '../utils/pdfExport';
import { exportExpensesToExcel } from '../utils/excelExport';

interface InvoicesHistoryModalProps {
  isOpen: boolean;
  invoices: InvoiceStatement[];
  expenses: CorporateExpense[];
  settings: CompanySettings;
  currentSelectedMonth: string;
  onSelectMonth: (month: string) => void;
  onReopenInvoice: (month: string) => void;
  onRequestCloseInvoice: (month: string) => void;
  onClose: () => void;
}

export const InvoicesHistoryModal: React.FC<InvoicesHistoryModalProps> = ({
  isOpen,
  invoices,
  expenses,
  settings,
  currentSelectedMonth,
  onSelectMonth,
  onReopenInvoice,
  onRequestCloseInvoice,
  onClose,
}) => {
  const [filter, setFilter] = useState<'all' | 'fechada' | 'aberta'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Descobre meses únicos a partir das despesas cadastradas e une com as faturas salvas
  const monthsSet = new Set<string>();
  expenses.forEach((e) => {
    if (e.date && e.date.length >= 7) {
      monthsSet.add(e.date.substring(0, 7));
    }
  });
  invoices.forEach((inv) => monthsSet.add(inv.month));

  const allMonths = Array.from(monthsSet).sort().reverse();

  // Consolida cada ciclo de mês com seu status real
  const consolidatedInvoices = allMonths.map((m) => {
    const existing = invoices.find((inv) => inv.month === m);
    const monthExpenses = expenses.filter((e) => e.date && e.date.startsWith(m));
    const totalAmount = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    if (existing) {
      return {
        ...existing,
        totalAmount: existing.status === 'fechada' ? existing.totalAmount : totalAmount,
        expensesCount: existing.status === 'fechada' ? existing.expensesCount : monthExpenses.length,
      };
    }

    return {
      id: `fatura_${m}`,
      month: m,
      title: `Fatura ${formatMonthName(m)}`,
      status: 'aberta' as const,
      totalAmount,
      expensesCount: monthExpenses.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const filteredInvoices = consolidatedInvoices.filter((inv) => {
    const matchesFilter = filter === 'all' || inv.status === filter;
    const matchesSearch =
      inv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.month.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  const handleExportPdf = async (month: string) => {
    const monthExpenses = expenses.filter((e) => e.date && e.date.startsWith(month));
    await exportExpensesToPdf(monthExpenses, settings, month);
  };

  const handleExportExcel = (month: string) => {
    const monthExpenses = expenses.filter((e) => e.date && e.date.startsWith(month));
    exportExpensesToExcel(monthExpenses, settings, month);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Histórico & Gestão de Faturas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Consulte, feche e reabra faturas de cartão corporativo por competência
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="p-3 sm:p-4 bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por mês ou ano..."
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 font-medium ${
                filter === 'all'
                  ? 'bg-slate-900 dark:bg-slate-800 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              Todas ({consolidatedInvoices.length})
            </button>
            <button
              onClick={() => setFilter('aberta')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 font-medium ${
                filter === 'aberta'
                  ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              Abertas ({consolidatedInvoices.filter((i) => i.status === 'aberta').length})
            </button>
            <button
              onClick={() => setFilter('fechada')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 font-medium ${
                filter === 'fechada'
                  ? 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              Fechadas ({consolidatedInvoices.filter((i) => i.status === 'fechada').length})
            </button>
          </div>
        </div>

        {/* Lista de Faturas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
          {filteredInvoices.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>Nenhuma fatura encontrada com os filtros selecionados.</p>
            </div>
          ) : (
            filteredInvoices.map((inv) => {
              const isCurrent = inv.month === currentSelectedMonth;
              const isClosed = inv.status === 'fechada';

              return (
                <div
                  key={inv.id || inv.month}
                  className={`p-4 sm:p-5 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-emerald-50/50 dark:bg-slate-900/90 border-emerald-500/60 shadow-md shadow-emerald-500/5'
                      : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Informações da Fatura */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {inv.title}
                        </h3>
                        {isClosed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            <Lock className="w-3 h-3" />
                            <span>Fechada</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <Clock className="w-3 h-3" />
                            <span>Em Aberto</span>
                          </span>
                        )}

                        {isCurrent && (
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                            Selecionada
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>
                          Total:{' '}
                          <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm font-bold">
                            R$ {inv.totalAmount.toFixed(2).replace('.', ',')}
                          </strong>
                        </span>
                        <span>·</span>
                        <span>
                          Lançamentos:{' '}
                          <strong className="text-slate-800 dark:text-slate-200 font-mono">
                            {inv.expensesCount}
                          </strong>
                        </span>
                        {isClosed && inv.closedAt && (
                          <>
                            <span>·</span>
                            <span>
                              Fechada em:{' '}
                              <strong className="text-slate-700 dark:text-slate-300 font-mono">
                                {new Date(inv.closedAt).toLocaleDateString('pt-BR')}
                              </strong>
                            </span>
                          </>
                        )}
                      </div>

                      {inv.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1">
                          "{inv.notes}"
                        </p>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex flex-wrap items-center gap-2 self-start md:self-auto pt-2 md:pt-0">
                      {/* Botão Ver Lançamentos */}
                      <button
                        onClick={() => {
                          onSelectMonth(inv.month);
                          onClose();
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[38px]"
                        title="Abrir este mês na mesa de despesas"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span>Ver Lançamentos</span>
                      </button>

                      {/* Exportar PDF e Excel */}
                      <button
                        onClick={() => handleExportPdf(inv.month)}
                        disabled={inv.expensesCount === 0}
                        className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-40 min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title="Baixar Relatório em PDF"
                        aria-label="Exportar PDF"
                      >
                        <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </button>

                      <button
                        onClick={() => handleExportExcel(inv.month)}
                        disabled={inv.expensesCount === 0}
                        className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-40 min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title="Exportar para Excel (.xlsx)"
                        aria-label="Exportar Excel"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>

                      {/* Ação de Fechar ou Reabrir Fatura */}
                      {isClosed ? (
                        <button
                          onClick={() => onReopenInvoice(inv.month)}
                          className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[38px]"
                          title="Reabrir esta fatura para permitir adicionar ou editar despesas"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Reabrir</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onClose();
                            onRequestCloseInvoice(inv.month);
                          }}
                          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs min-h-[38px]"
                          title="Encerrar lançamentos desta fatura"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Fechar Fatura</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
