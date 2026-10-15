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
} from 'lucide-react';
import { CorporateExpense } from '../types/expense';

interface DashboardViewProps {
  expenses: CorporateExpense[];
  selectedMonth: string; // YYYY-MM
  onOpenScanner: () => void;
  onSelectTab: (tab: 'dashboard' | 'table' | 'report' | 'settings') => void;
  onViewExpense: (expense: CorporateExpense) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  expenses,
  selectedMonth,
  onOpenScanner,
  onSelectTab,
  onViewExpense,
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
    <div className="space-y-6">
      {/* Banner de Boas-Vindas & Ações Rápidas */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Fechamento Mensal · {formatMonthName(selectedMonth)}</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Prestação de Contas do Cartão Corporativo
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Digitalize comprovantes fiscais instantaneamente com IA, organize suas
            justificativas e emita o relatório contábil pronto para impressão ou Excel.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('report')}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Ver Relatório Mensal</span>
          </button>
          <button
            onClick={onOpenScanner}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-95 transition-all rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Escanear Comprovante</span>
          </button>
        </div>
      </div>

      {/* Grid de KPIs Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gasto */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total em Despesas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums tracking-tight">
            R$ {totalAmount.toFixed(2).replace('.', ',')}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold">{totalCount}</span>
            <span>despesas registradas neste mês</span>
          </p>
        </div>

        {/* Comprovantes Anexados */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Comprovantes com Anexo</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums tracking-tight">
            {withReceiptCount} / {totalCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {totalCount > 0
              ? `${((withReceiptCount / totalCount) * 100).toFixed(0)}% com foto/PDF anexado`
              : 'Nenhuma despesa ainda'}
          </p>
        </div>

        {/* Ticket Médio */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Média por Comprovante</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums tracking-tight">
            R$ {averageAmount.toFixed(2).replace('.', ',')}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Ticket médio corporativo do período
          </p>
        </div>

        {/* Maior Despesa */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Maior Despesa Única</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums tracking-tight">
            {highestExpense
              ? `R$ ${highestExpense.amount.toFixed(2).replace('.', ',')}`
              : 'R$ 0,00'}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            {highestExpense ? highestExpense.merchant : 'Sem registros'}
          </p>
        </div>
      </div>

      {/* Seção 2: Distribuição por Categoria e Recibos Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Distribuição por Categorias (5 colunas) */}
        <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">
              Gastos por Categoria
            </h2>
            <span className="text-xs text-slate-400">
              {sortedCategories.length} categorias ativas
            </span>
          </div>

          {sortedCategories.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
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
                      <span className="text-slate-300 font-medium">{cat}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">
                          {data.count} {data.count === 1 ? 'item' : 'itens'}
                        </span>
                        <span className="text-white font-mono font-semibold tabular-nums">
                          R$ {data.total.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>
                    {/* Barra de progresso */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all duration-500"
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
        <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">
                Comprovantes Recentes deste Mês
              </h2>
              <button
                onClick={() => onSelectTab('table')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>Ver todos na mesa</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {monthExpenses.length === 0 ? (
              <div className="py-14 text-center">
                <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-300">
                  Nenhum comprovante adicionado em {formatMonthName(selectedMonth)}
                </p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Envie sua primeira foto ou PDF para preencher a mesa.
                </p>
                <button
                  onClick={onOpenScanner}
                  className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Escanear Primeiro Comprovante
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {monthExpenses.slice(0, 5).map((exp) => (
                  <div
                    key={exp.id}
                    className="py-3 flex items-center justify-between gap-4 hover:bg-slate-800/40 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Miniatura do recibo */}
                      {exp.receipt ? (
                        <div
                          onClick={() => onViewExpense(exp)}
                          className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:border-emerald-500/80 transition-colors"
                          title="Clique para ampliar o comprovante"
                        >
                          <img
                            src={exp.receipt.dataUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                          <Receipt className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white truncate">
                            {exp.merchant}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {exp.date.split('-').reverse().join('/')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate max-w-sm mt-0.5">
                          {exp.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-white font-mono tabular-nums">
                        R$ {exp.amount.toFixed(2).replace('.', ',')}
                      </span>
                      {exp.receipt && (
                        <button
                          onClick={() => onViewExpense(exp)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
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
            <div className="pt-3 border-t border-slate-800 text-center">
              <button
                onClick={() => onSelectTab('table')}
                className="text-xs text-slate-400 hover:text-white transition-colors"
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
