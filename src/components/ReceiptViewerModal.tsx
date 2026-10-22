import React, { useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Calendar,
  Building,
  CreditCard,
  Tag,
  FileText,
  FileCheck,
} from 'lucide-react';
import { CorporateExpense } from '../types/expense';

interface ReceiptViewerModalProps {
  expense: CorporateExpense | null;
  onClose: () => void;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  expense,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!expense) return null;

  const receipt = expense.receipt;
  const isPurePdf =
    Boolean(receipt?.type === 'application/pdf' || receipt?.name?.endsWith('.pdf')) &&
    !receipt?.dataUrl?.startsWith('data:image/');

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleDownload = () => {
    if (!receipt) return;
    const a = document.createElement('a');
    a.href = receipt.originalPdfUrl || receipt.dataUrl;
    a.download = receipt.originalPdfUrl
      ? receipt.name.replace(/\.jpg$/i, '.pdf')
      : receipt.name || `comprovante_${expense.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col transition-colors">
        {/* Cabeçalho */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Comprovante Anexo: {expense.merchant}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {receipt?.name || 'Comprovante digitalizado'} ·{' '}
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  R$ {expense.amount.toFixed(2).replace('.', ',')}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {receipt && (
              <button
                onClick={handleDownload}
                className="p-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer min-h-[38px]"
                title="Baixar comprovante original"
              >
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Download</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo em 2 colunas: Imagem e Dados da Despesa */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Lado Esquerdo: Área de Exibição do Comprovante (8 colunas) */}
          <div className="lg:col-span-8 bg-slate-100 dark:bg-slate-950 flex flex-col relative border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800">
            {/* Controles de Zoom e Rotação */}
            {!isPurePdf && receipt && (
              <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg p-1 shadow-sm backdrop-blur-xs">
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Girar 90 graus"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setZoom(1);
                    setRotation(0);
                  }}
                  className="px-2 py-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-mono rounded cursor-pointer"
                >
                  {(zoom * 100).toFixed(0)}%
                </button>
              </div>
            )}

            {/* Visualizador */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-6 min-h-[340px] max-h-[65vh]">
              {receipt ? (
                isPurePdf ? (
                  <div className="flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md shadow-xs">
                    <FileText className="w-16 h-16 text-emerald-500 mb-3" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      Comprovante em Formato PDF
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-mono">
                      {receipt.name} ({(receipt.size / 1024).toFixed(0)} KB)
                    </p>
                    <a
                      href={receipt.dataUrl}
                      download={receipt.name}
                      className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-xs min-h-[40px]"
                    >
                      <Download className="w-4 h-4" />
                      <span>Baixar e Abrir Arquivo PDF</span>
                    </a>
                  </div>
                ) : (
                  <div className="transition-transform duration-150 ease-out flex items-center justify-center">
                    <img
                      src={receipt.dataUrl}
                      alt="Comprovante da Despesa"
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      }}
                      className="max-h-[60vh] max-w-full object-contain rounded shadow-lg transition-transform"
                    />
                  </div>
                )
              ) : (
                <div className="text-center p-8 text-slate-400 dark:text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">
                    Nenhum comprovante em anexo para esta despesa.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Lado Direito: Resumo de Auditoria da Despesa (4 colunas) */}
          <div className="lg:col-span-4 p-5 sm:p-6 bg-slate-50 dark:bg-slate-900/40 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                DETALHES DO LANÇAMENTO
              </h3>

              <div className="p-4 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Valor da Despesa</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                    R$ {expense.amount.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5 flex items-start gap-2.5">
                  <Building className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Estabelecimento
                    </span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {expense.merchant}
                    </span>
                    {expense.cnpj && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-mono">
                        CNPJ: {expense.cnpj}
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5 flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Data</span>
                    <span className="text-xs text-slate-800 dark:text-white font-mono">
                      {expense.date.split('-').reverse().join('/')}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5 flex items-start gap-2.5">
                  <Tag className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Categoria
                    </span>
                    <span className="text-xs text-slate-800 dark:text-white font-medium">
                      {expense.category}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5 flex items-start gap-2.5">
                  <CreditCard className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Forma de Pagamento
                    </span>
                    <span className="text-xs text-slate-800 dark:text-white font-mono">
                      {expense.paymentMethod}
                    </span>
                  </div>
                </div>
              </div>

              {/* Justificativa / Descrição do Colaborador */}
              <div className="p-4 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-2 mb-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Descrição / Justificativa Corporativa
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {expense.description}
                </p>
                {expense.notes && (
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                    Nota adicional: {expense.notes}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[40px]"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
