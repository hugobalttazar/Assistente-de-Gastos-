import React, { useState } from 'react';
import {
  Search,
  Filter,
  Eye,
  Trash2,
  Edit3,
  Receipt,
  Plus,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Check,
  X,
  Lock,
  Unlock,
  Archive,
  Calendar,
} from 'lucide-react';
import { CorporateExpense, ExpenseCategory, InvoiceStatement } from '../types/expense';
import { formatMonthName } from '../utils/storage';

interface ExpenseTableViewProps {
  expenses: CorporateExpense[];
  selectedMonth: string;
  onOpenScanner: () => void;
  onViewExpense: (expense: CorporateExpense) => void;
  onUpdateExpense: (expense: CorporateExpense) => void;
  onDeleteExpense: (id: string) => void;
  invoiceStatus: InvoiceStatement | null;
  onRequestCloseInvoice: () => void;
  onReopenInvoice: () => void;
  onOpenInvoicesHistory: () => void;
}

export const ExpenseTableView: React.FC<ExpenseTableViewProps> = ({
  expenses,
  selectedMonth,
  onOpenScanner,
  onViewExpense,
  onUpdateExpense,
  onDeleteExpense,
  invoiceStatus,
  onRequestCloseInvoice,
  onReopenInvoice,
  onOpenInvoicesHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Estado para edição rápida da justificativa
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');

  // Estado para exclusão com confirmação segura
  const [expenseToDelete, setExpenseToDelete] = useState<CorporateExpense | null>(null);

  // Estado para visualização de todos os meses
  const [showAllMonths, setShowAllMonths] = useState(false);

  // Filtra por mês (ou todos)
  const targetExpenses = showAllMonths
    ? expenses
    : expenses.filter((e) => e.date.startsWith(selectedMonth));

  // Aplica filtros de texto e categoria
  const filteredExpenses = targetExpenses.filter((e) => {
    const matchesSearch =
      e.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.cnpj && e.cnpj.includes(searchTerm));
    const matchesCategory =
      categoryFilter === 'all' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Ordenação
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    if (sortField === 'date') {
      const cmp = a.date.localeCompare(b.date);
      return sortDirection === 'asc' ? cmp : -cmp;
    } else {
      return sortDirection === 'asc'
        ? a.amount - b.amount
        : b.amount - a.amount;
    }
  });

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleStartEdit = (exp: CorporateExpense) => {
    setEditingExpenseId(exp.id);
    setEditDescription(exp.description);
    setEditAmount(String(exp.amount));
  };

  const handleSaveEdit = (exp: CorporateExpense) => {
    const numAmount = parseFloat(editAmount.replace(',', '.'));
    onUpdateExpense({
      ...exp,
      description: editDescription.trim() || exp.description,
      amount: !isNaN(numAmount) && numAmount > 0 ? numAmount : exp.amount,
      updatedAt: new Date().toISOString(),
    });
    setEditingExpenseId(null);
  };

  const toggleStatus = (exp: CorporateExpense) => {
    onUpdateExpense({
      ...exp,
      status: exp.status === 'conferido' ? 'pendente' : 'conferido',
      updatedAt: new Date().toISOString(),
    });
  };

  const totalFiltered = sortedExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-4">
      {/* Barra de Filtros e Busca Responsiva */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 shadow-xs dark:shadow-none transition-colors">
        {/* Campo de Busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar fornecedor, justificativa ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filtros e Ações */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer w-full sm:w-auto"
            >
              <option value="all">Todas as Categorias</option>
              <option value="Alimentação">Alimentação</option>
              <option value="Transporte / Táxi / Uber">Transporte / Táxi / Uber</option>
              <option value="Combustível">Combustível</option>
              <option value="Hospedagem">Hospedagem</option>
              <option value="Passagens">Passagens</option>
              <option value="Material de Escritório">Material de Escritório</option>
              <option value="Software & Serviços">Software & Serviços</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          {/* Toggle de Mês / Todos */}
          <button
            onClick={() => setShowAllMonths(!showAllMonths)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex-1 sm:flex-initial text-center ${
              showAllMonths
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700'
            }`}
          >
            {showAllMonths ? 'Todos os Meses' : `Mês (${formatMonthName(selectedMonth)})`}
          </button>

          {/* Botão Novo Comprovante */}
          <button
            onClick={onOpenScanner}
            disabled={invoiceStatus?.status === 'fechada'}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all rounded-lg shadow-xs cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed flex-1 sm:flex-initial"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VISÃO EM CARDS PARA SMARTPHONES (md:hidden) - 100% Usabilidade Móvel */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {sortedExpenses.length === 0 ? (
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-500">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="font-medium text-slate-700 dark:text-slate-300 text-sm">
              Nenhuma despesa encontrada
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Adicione novos comprovantes tocando no botão Novo acima.
            </p>
          </div>
        ) : (
          sortedExpenses.map((exp, index) => {
            const isEditing = editingExpenseId === exp.id;

            return (
              <div
                key={exp.id}
                className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs dark:shadow-none space-y-3 transition-colors"
              >
                {/* Linha Superior: Miniatura + Fornecedor + Data */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {exp.receipt ? (
                      <button
                        onClick={() => onViewExpense(exp)}
                        className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                        title="Ver foto do comprovante"
                      >
                        <img
                          src={exp.receipt.dataUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                        <Receipt className="w-5 h-5" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <span className="text-xs font-mono text-slate-400 dark:text-slate-500 block leading-none mb-1">
                        Item #{String(index + 1).padStart(2, '0')}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {exp.merchant}
                      </h3>
                      {exp.cnpj && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block truncate">
                          {exp.cnpj}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono block">
                      R$ {exp.amount.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {exp.date.split('-').reverse().join('/')}
                    </span>
                  </div>
                </div>

                {/* Categoria e Forma de Pagamento */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    {exp.category}
                  </span>
                  {exp.paymentMethod && (
                    <span className="text-slate-500 font-mono text-[10px] truncate max-w-[180px]">
                      {exp.paymentMethod}
                    </span>
                  )}
                </div>

                {/* Descrição / Justificativa com Edição */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-0.5">
                    Justificativa Corporativa:
                  </span>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-emerald-500 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          placeholder="Valor R$"
                          className="w-24 bg-white dark:bg-slate-900 border border-emerald-500 rounded px-2 py-1 text-xs text-slate-900 dark:text-white font-mono"
                        />
                        <button
                          onClick={() => handleSaveEdit(exp)}
                          className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold rounded text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvar</span>
                        </button>
                        <button
                          onClick={() => setEditingExpenseId(null)}
                          className="px-2 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      onClick={() => handleStartEdit(exp)}
                      className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                      title="Toque para editar a justificativa"
                    >
                      {exp.description}
                    </p>
                  )}
                </div>

                {/* Rodapé do Card: Status Toggle + Ações com área de toque mínima 44px */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => toggleStatus(exp)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[40px] ${
                      exp.status === 'conferido'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {exp.status === 'conferido' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Conferido</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span>Pendente</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    {exp.receipt && (
                      <button
                        onClick={() => onViewExpense(exp)}
                        className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Ver foto"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleStartEdit(exp)}
                      className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExpenseToDelete(exp)}
                      className="p-2.5 text-red-500 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. TABELA EXECUTIVA PARA DESKTOP E TABLET (hidden md:block) */}
      {/* ========================================================================= */}
      <div className="hidden md:block bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs dark:shadow-xl w-full transition-colors">
        <div className="w-full overflow-hidden">
          <table className="w-full text-left border-collapse table-fixed">
            <colgroup>
              <col style={{ width: '42px' }} />
              <col style={{ width: '48px' }} />
              <col style={{ width: '84px' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '15%' }} />
              <col />
              <col style={{ width: '104px' }} />
              <col style={{ width: '92px' }} />
              <col style={{ width: '104px' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                <th className="py-3 px-2 text-center">Item</th>
                <th className="py-3 px-2 text-center">Anexo</th>
                <th
                  onClick={() => toggleSort('date')}
                  className="py-3 px-2 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Data</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3">Estabelecimento / Fornecedor</th>
                <th className="py-3 px-2">Categoria</th>
                <th className="py-3 px-3">Descrição / Justificativa</th>
                <th
                  onClick={() => toggleSort('amount')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Valor (R$)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-2 text-center">Status</th>
                <th className="py-3 pr-4 sm:pr-5 pl-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {sortedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-slate-600 dark:text-slate-400">
                      Nenhuma despesa encontrada para {showAllMonths ? 'os filtros selecionados' : 'o mês selecionado'}.
                    </p>
                    {expenses.length > 0 && !showAllMonths && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setShowAllMonths(true)}
                          className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Ver Despesas de Todos os Meses ({expenses.length})
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                sortedExpenses.map((exp, index) => {
                  const isEditing = editingExpenseId === exp.id;

                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Índice */}
                      <td className="py-3 px-2 text-center font-mono text-[11px] text-slate-400 dark:text-slate-500">
                        {String(index + 1).padStart(2, '0')}
                      </td>

                      {/* Miniatura do Anexo */}
                      <td className="py-2 px-2 text-center">
                        {exp.receipt ? (
                          <button
                            onClick={() => onViewExpense(exp)}
                            className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-emerald-500 overflow-hidden inline-flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                            title="Ver comprovante original ampliado"
                          >
                            <img
                              src={exp.receipt.dataUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ) : (
                          <span
                            className="text-slate-400 dark:text-slate-600 text-[10px]"
                            title="Sem anexo"
                          >
                            -
                          </span>
                        )}
                      </td>

                      {/* Data */}
                      <td className="py-3 px-2 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap text-xs">
                        {exp.date.split('-').reverse().join('/')}
                      </td>

                      {/* Fornecedor */}
                      <td className="py-3 px-3 overflow-hidden min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate" title={exp.merchant}>
                          {exp.merchant}
                        </div>
                        {exp.cnpj && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate" title={exp.cnpj}>
                            {exp.cnpj}
                          </div>
                        )}
                      </td>

                      {/* Categoria */}
                      <td className="py-3 px-2 overflow-hidden min-w-0">
                        <span className="text-slate-700 dark:text-slate-300 font-medium text-[11px] truncate block" title={exp.category}>
                          {exp.category}
                        </span>
                      </td>

                      {/* Descrição / Justificativa */}
                      <td className="py-3 px-3 overflow-hidden min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <input
                              type="text"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className="w-full min-w-0 bg-white dark:bg-slate-900 border border-emerald-500 rounded px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(exp)}
                              className="p-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 cursor-pointer shrink-0"
                              title="Salvar"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingExpenseId(null)}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer shrink-0"
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleStartEdit(exp)}
                            className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer group/desc flex items-center justify-between gap-1.5 overflow-hidden min-w-0"
                            title={`Justificativa:\n${exp.description}\n\n(Clique para editar)`}
                          >
                            <span className="truncate block font-normal text-xs min-w-0">
                              {exp.description.length > 40
                                ? `${exp.description.slice(0, 40)}...`
                                : exp.description}
                            </span>
                            <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover/desc:opacity-100 transition-opacity shrink-0" />
                          </div>
                        )}
                      </td>

                      {/* Valor */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap text-xs tabular-nums">
                        R$ {exp.amount.toFixed(2).replace('.', ',')}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => toggleStatus(exp)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                            exp.status === 'conferido'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                          }`}
                          title="Clique para alternar status"
                        >
                          {exp.status === 'conferido' ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Conferido</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-2.5 h-2.5" />
                              <span>Pendente</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="py-3 pr-4 sm:pr-5 pl-2 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {exp.receipt && (
                            <button
                              onClick={() => onViewExpense(exp)}
                              className="w-7 h-7 inline-flex items-center justify-center text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Visualizar Comprovante"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleStartEdit(exp)}
                            className="w-7 h-7 inline-flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Editar Justificativa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setExpenseToDelete(exp)}
                            className="w-7 h-7 inline-flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Lançamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {sortedExpenses.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-900 dark:text-white">
                  <td colSpan={6} className="py-3 px-3 text-right">
                    Total Filtrado ({sortedExpenses.length} itens):
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap tabular-nums">
                    R$ {totalFiltered.toFixed(2).replace('.', ',')}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal de Exclusão Segura */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Excluir Lançamento?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta ação removerá a despesa e o comprovante da sua mesa.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-5 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Estabelecimento:</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                  {expenseToDelete.merchant}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Data:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {expenseToDelete.date.split('-').reverse().join('/')}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-1.5 mt-1">
                <span className="text-slate-500 dark:text-slate-400">Valor a Excluir:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm tabular-nums">
                  R$ {expenseToDelete.amount.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteExpense(expenseToDelete.id);
                  setExpenseToDelete(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 active:scale-95 rounded-lg transition-all cursor-pointer shadow-xs"
              >
                Sim, Excluir Despesa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
