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
  ChevronLeft,
  ChevronRight,
  Edit3,
  Layers,
} from 'lucide-react';
import { CorporateExpense, ReceiptFile } from '../types/expense';
import { formatMonthName, getExpenseInvoiceMonth } from '../utils/storage';

interface ReceiptViewerModalProps {
  expense: CorporateExpense | null;
  onClose: () => void;
  onEditExpense?: (expense: CorporateExpense) => void;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  expense,
  onClose,
  onEditExpense,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  if (!expense) return null;

  const receiptsList: ReceiptFile[] =
    expense.receipts && expense.receipts.length > 0
      ? expense.receipts
      : expense.receipt
      ? [expense.receipt]
      : [];

  const currentReceipt: ReceiptFile | undefined = receiptsList[activePhotoIndex] || receiptsList[0];

  const isPurePdf =
    Boolean(currentReceipt?.type === 'application/pdf' || currentReceipt?.name?.endsWith('.pdf')) &&
    !currentReceipt?.dataUrl?.startsWith('data:image/');

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleDownload = () => {
    if (!currentReceipt) return;
    const a = document.createElement('a');
    a.href = currentReceipt.originalPdfUrl || currentReceipt.dataUrl;
    a.download = currentReceipt.originalPdfUrl
      ? currentReceipt.name.replace(/\.jpg$/i, '.pdf')
      : currentReceipt.name || `comprovante_${expense.id}_foto${activePhotoIndex + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const invoiceMonth = getExpenseInvoiceMonth(expense);

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
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Comprovante: {expense.merchant}</span>
                {receiptsList.length > 1 && (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Foto {activePhotoIndex + 1} de {receiptsList.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentReceipt?.name || 'Comprovante digitalizado'} ·{' '}
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  R$ {expense.amount.toFixed(2).replace('.', ',')}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEditExpense && (
              <button
                onClick={() => {
                  onClose();
                  onEditExpense(expense);
                }}
                className="px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                title="Editar todas as informações desta despesa"
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Editar Despesa</span>
              </button>
            )}

            {currentReceipt && (
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
            {!isPurePdf && currentReceipt && (
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

            {/* Setas de Navegação entre Fotos */}
            {receiptsList.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setActivePhotoIndex((prev) =>
                      prev > 0 ? prev - 1 : receiptsList.length - 1
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs cursor-pointer shadow-md transition-all hover:scale-105"
                  title="Foto anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() =>
                    setActivePhotoIndex((prev) =>
                      prev < receiptsList.length - 1 ? prev + 1 : 0
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs cursor-pointer shadow-md transition-all hover:scale-105"
                  title="Próxima foto"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Visualizador Principal */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-6 min-h-[340px] max-h-[60vh]">
              {currentReceipt ? (
                isPurePdf ? (
                  <div className="flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md shadow-xs">
                    <FileText className="w-16 h-16 text-emerald-500 mb-3" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      Comprovante em Formato PDF
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-mono">
                      {currentReceipt.name} ({(currentReceipt.size / 1024).toFixed(0)} KB)
                    </p>
                    <a
                      href={currentReceipt.dataUrl}
                      download={currentReceipt.name}
                      className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-xs min-h-[40px]"
                    >
                      <Download className="w-4 h-4" />
                      <span>Baixar e Abrir Arquivo PDF</span>
                    </a>
                  </div>
                ) : (
                  <div className="transition-transform duration-150 ease-out flex items-center justify-center">
                    <img
                      src={currentReceipt.dataUrl}
                      alt={`Comprovante da Despesa ${activePhotoIndex + 1}`}
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      }}
                      className="max-h-[55vh] max-w-full object-contain rounded shadow-lg transition-transform"
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

            {/* Miniaturas de Fotos Anexadas na Barra Inferior */}
            {receiptsList.length > 1 && (
              <div className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 overflow-x-auto">
                {receiptsList.map((rec, idx) => (
                  <button
                    key={`thumb-${idx}`}
                    onClick={() => {
                      setActivePhotoIndex(idx);
                      setZoom(1);
                      setRotation(0);
                    }}
                    className={`w-12 h-12 rounded-lg border-2 overflow-hidden shrink-0 cursor-pointer transition-all ${
                      idx === activePhotoIndex
                        ? 'border-emerald-500 ring-2 ring-emerald-500/40 scale-105'
                        : 'border-slate-300 dark:border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {rec.dataUrl.startsWith('data:image/') ? (
                      <img
                        src={rec.dataUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-emerald-500" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lado Direito: Resumo de Auditoria da Despesa (4 colunas) */}
          <div className="lg:col-span-4 p-5 sm:p-6 bg-slate-50 dark:bg-slate-900/40 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  DETALHES DO LANÇAMENTO
                </h3>
                {onEditExpense && (
                  <button
                    onClick={() => {
                      onClose();
                      onEditExpense(expense);
                    }}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Editar</span>
                  </button>
                )}
              </div>

              <div className="p-4 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                {/* Fatura Vinculada */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-emerald-500" />
                    Fatura Contábil
                  </span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Fatura {formatMonthName(invoiceMonth)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Valor Total</span>
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
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Data da Transação</span>
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

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4 space-y-2">
              {onEditExpense && (
                <button
                  onClick={() => {
                    onClose();
                    onEditExpense(expense);
                  }}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs min-h-[40px]"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Editar Todos os Dados</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[38px]"
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
