import React, { useState } from 'react';
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  DollarSign,
  FileText,
  Calendar,
  X,
  ArrowRight,
} from 'lucide-react';
import { CorporateExpense, InvoiceStatement } from '../types/expense';
import { formatMonthName } from '../utils/storage';

interface CloseInvoiceModalProps {
  isOpen: boolean;
  month: string;
  expenses: CorporateExpense[];
  onConfirmClose: (notes: string) => void;
  onClose: () => void;
}

export const CloseInvoiceModal: React.FC<CloseInvoiceModalProps> = ({
  isOpen,
  month,
  expenses,
  onConfirmClose,
  onClose,
}) => {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const monthExpenses = expenses.filter((e) => e.date && e.date.startsWith(month));
  const totalAmount = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const receiptsCount = monthExpenses.filter((e) => e.receipt).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      onConfirmClose(notes.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col transition-colors">
        {/* Cabeçalho */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Fechar Fatura de {formatMonthName(month)}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Conclua os lançamentos e encerre este ciclo de prestação de contas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário & Resumo */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 text-xs">
          {/* Cards de Resumo */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Total Faturado
              </span>
              <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                R$ {totalAmount.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Lançamentos
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono">
                {monthExpenses.length}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Comprovantes
              </span>
              <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
                {receiptsCount}
              </span>
            </div>
          </div>

          {/* Observações de Encerramento */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Observações do Fechamento (Opcional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Todas as notas conferidas com o extrato bancário do cartão corporativo."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Aviso Informativo sobre Reabertura */}
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-xl text-[11px] text-blue-900 dark:text-blue-200/90 leading-relaxed flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 dark:text-white block mb-0.5">Fatura Segura e Editável:</strong>
              Ao fechar esta fatura, seus relatórios e arquivos são consolidados. Caso precise incluir ou corrigir qualquer nota depois, você poderá <strong>reabrir esta fatura para edição a qualquer momento</strong> no Histórico de Faturas.
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Lock className="w-4 h-4" />
              <span>Confirmar & Fechar Fatura</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
