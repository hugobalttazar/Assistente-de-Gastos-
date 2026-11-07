import React from 'react';
import {
  AlertTriangle,
  Calendar,
  Building,
  DollarSign,
  Tag,
  FileCheck,
  X,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { CorporateExpense } from '../types/expense';

interface DuplicateExpenseAlertModalProps {
  isOpen: boolean;
  existingExpense: CorporateExpense | null;
  pendingExpense: CorporateExpense | null;
  onCancel: () => void;
  onConfirmSave: () => void;
}

export const DuplicateExpenseAlertModal: React.FC<DuplicateExpenseAlertModalProps> = ({
  isOpen,
  existingExpense,
  pendingExpense,
  onCancel,
  onConfirmSave,
}) => {
  if (!isOpen || !existingExpense || !pendingExpense) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111827] border border-amber-500/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col transition-colors">
        {/* Cabeçalho do Alerta */}
        <div className="p-4 sm:p-5 bg-amber-500/10 border-b border-amber-500/20 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Possível Comprovante Duplicado</span>
                <span className="text-[10px] font-semibold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Atenção
                </span>
              </h2>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Já existe um comprovante cadastrado com o mesmo estabelecimento, data e valor.
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo Comparativo */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Para evitar que você registre o mesmo comprovante duas vezes por engano, confira a comparação entre o lançamento que já está no sistema e o que você está tentando inserir:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lado Esquerdo: Comprovante Já Existente */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    Comprovante Já no Sistema
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Cadastrado
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Estabelecimento:</span>
                    <span className="font-semibold text-slate-900 dark:text-white block truncate">
                      {existingExpense.merchant}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Data da Compra:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {existingExpense.date.split('-').reverse().join('/')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">Valor:</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        R$ {existingExpense.amount.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">Categoria:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {existingExpense.category}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">Justificativa:</span>
                    <span className="text-slate-600 dark:text-slate-400 italic text-[11px] line-clamp-2">
                      "{existingExpense.description}"
                    </span>
                  </div>
                </div>
              </div>

              {existingExpense.receipt && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Possui comprovante anexo</span>
                </div>
              )}
            </div>

            {/* Lado Direito: Novo Comprovante Sendo Inserido */}
            <div className="p-4 rounded-xl border-2 border-amber-500/40 bg-amber-500/5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-amber-500/20 mb-2">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Novo Lançamento que Você Enviou
                  </span>
                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                    Pendente
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Estabelecimento:</span>
                    <span className="font-semibold text-slate-900 dark:text-white block truncate">
                      {pendingExpense.merchant}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Data da Compra:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {pendingExpense.date.split('-').reverse().join('/')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">Valor:</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        R$ {pendingExpense.amount.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">Categoria:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {pendingExpense.category}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">Justificativa:</span>
                    <span className="text-slate-600 dark:text-slate-400 italic text-[11px] line-clamp-2">
                      "{pendingExpense.description}"
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                Conflito exato: Fornecedor + Data + Valor idênticos
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            💡 Se você realizou duas compras com o mesmo valor no mesmo dia e no mesmo local, você pode clicar em <strong>"Salvar Mesmo Assim"</strong> para registrar normalmente. Caso contrário, clique em <strong>"Cancelar / Revisar"</strong> para evitar lançar duas vezes.
          </div>
        </div>

        {/* Rodapé com Decisão do Usuário */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar / Voltar e Revisar
          </button>

          <button
            type="button"
            onClick={onConfirmSave}
            className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Salvar Mesmo Assim (Confirmar)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
