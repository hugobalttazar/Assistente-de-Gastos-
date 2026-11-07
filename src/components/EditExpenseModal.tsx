import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calendar,
  Building,
  DollarSign,
  Tag,
  CreditCard,
  FileCheck,
  FileText,
  Upload,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { CorporateExpense, ReceiptFile } from '../types/expense';
import {
  getCustomCategories,
  saveCustomCategory,
  formatMonthName,
  getExpenseInvoiceMonth,
} from '../utils/storage';
import { convertPdfFirstPageToImage } from '../utils/pdfToImage';
import { DuplicateExpenseAlertModal } from './DuplicateExpenseAlertModal';

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: CorporateExpense | null;
  onUpdateExpense: (expense: CorporateExpense) => void;
  currentSelectedMonth?: string;
  existingExpenses?: CorporateExpense[];
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  isOpen,
  onClose,
  expense,
  onUpdateExpense,
  currentSelectedMonth,
  existingExpenses = [],
}) => {
  const [date, setDate] = useState('');
  const [targetInvoiceMonth, setTargetInvoiceMonth] = useState('');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [status, setStatus] = useState<'conferido' | 'pendente'>('conferido');
  const [receiptsList, setReceiptsList] = useState<ReceiptFile[]>([]);

  // Categorias
  const [categoriesList, setCategoriesList] = useState<string[]>(() => getCustomCategories());
  const [isCustomCategoryInputOpen, setIsCustomCategoryInputOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Erro / Validação
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [duplicateConflict, setDuplicateConflict] = useState<{ existing: CorporateExpense; pending: CorporateExpense } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializa o formulário com os dados da despesa
  useEffect(() => {
    if (expense) {
      setDate(expense.date || '');
      setTargetInvoiceMonth(getExpenseInvoiceMonth(expense));
      setAmount(expense.amount ? String(expense.amount) : '');
      setMerchant(expense.merchant || '');
      setCategory(expense.category || 'Alimentação');
      setDescription(expense.description || '');
      setCnpj(expense.cnpj || '');
      setPaymentMethod(expense.paymentMethod || 'Visa Corporativo');
      setStatus(expense.status || 'conferido');

      // Coleta todas as fotos anexadas
      if (expense.receipts && expense.receipts.length > 0) {
        setReceiptsList([...expense.receipts]);
      } else if (expense.receipt) {
        setReceiptsList([expense.receipt]);
      } else {
        setReceiptsList([]);
      }

      setCategoriesList(getCustomCategories());
      setErrorMessage(null);
    }
  }, [expense]);

  if (!isOpen || !expense) return null;

  // Gerador de lista de faturas para o select (últimos 12 meses + próximos 3 meses)
  const generateInvoiceMonthOptions = () => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    // 3 meses para frente até 12 meses para trás
    for (let i = 3; i >= -12; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      options.push({
        value: val,
        label: `Fatura ${formatMonthName(val)}`,
      });
    }

    // Se a fatura atual não estiver na lista, adiciona
    if (targetInvoiceMonth && !options.some((o) => o.value === targetInvoiceMonth)) {
      options.push({
        value: targetInvoiceMonth,
        label: `Fatura ${formatMonthName(targetInvoiceMonth)}`,
      });
    }

    return options;
  };

  const handleAddNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const updated = saveCustomCategory(trimmed);
    setCategoriesList(updated);
    setCategory(trimmed);
    setNewCategoryName('');
    setIsCustomCategoryInputOpen(false);
  };

  // Upload de fotos adicionais
  const handleFilesUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessingFile(true);
    setErrorMessage(null);

    try {
      const newFiles: ReceiptFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        let dataUrl = base64;
        let effectiveType = file.type || (isPdf ? 'application/pdf' : 'image/jpeg');

        if (isPdf) {
          try {
            const converted = await convertPdfFirstPageToImage(base64);
            dataUrl = converted.dataUrl;
            effectiveType = 'image/jpeg';
          } catch (pdfErr) {
            console.warn('Erro ao converter PDF:', pdfErr);
          }
        }

        newFiles.push({
          dataUrl,
          name: file.name,
          type: effectiveType,
          size: file.size,
        });
      }

      setReceiptsList((prev) => [...prev, ...newFiles]);
    } catch (err) {
      console.error('Falha ao adicionar fotos:', err);
      setErrorMessage('Erro ao carregar arquivos selecionados.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setReceiptsList((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetPrimaryPhoto = (indexToPrimary: number) => {
    if (indexToPrimary === 0) return;
    setReceiptsList((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(indexToPrimary, 1);
      return [item, ...copy];
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Por favor, informe um valor monetário válido maior que zero.');
      return;
    }

    if (!merchant.trim()) {
      setErrorMessage('Por favor, informe o estabelecimento ou fornecedor.');
      return;
    }

    if (!date) {
      setErrorMessage('Por favor, selecione a data da transação.');
      return;
    }

    if (!targetInvoiceMonth) {
      setErrorMessage('Por favor, selecione a fatura de destino.');
      return;
    }

    const updated: CorporateExpense = {
      ...expense,
      date,
      invoiceId: targetInvoiceMonth,
      amount: numericAmount,
      merchant: merchant.trim(),
      category: category.trim() || 'Outros',
      description: description.trim() || `Despesa corporativa em ${merchant.trim()}`,
      cnpj: cnpj.trim() || undefined,
      paymentMethod: paymentMethod.trim() || 'Visa Corporativo',
      status,
      receipt: receiptsList[0] || undefined,
      receipts: receiptsList.length > 0 ? receiptsList : undefined,
      updatedAt: new Date().toISOString(),
    };

    // Verificação de duplicação: compara com outras despesas excluindo a que está sendo editada
    const conflict = existingExpenses.find((e) => {
      if (e.id === expense.id) return false;
      const sameMerchant = e.merchant.trim().toLowerCase() === updated.merchant.toLowerCase();
      const sameDate = e.date === updated.date;
      const sameAmount = Math.abs(e.amount - updated.amount) < 0.01;
      return sameMerchant && sameDate && sameAmount;
    });

    if (conflict) {
      setDuplicateConflict({ existing: conflict, pending: updated });
      return;
    }

    onUpdateExpense(updated);
    onClose();
  };

  const handleConfirmDuplicateSave = () => {
    if (!duplicateConflict) return;
    onUpdateExpense(duplicateConflict.pending);
    setDuplicateConflict(null);
    onClose();
  };

  const invoiceOptions = generateInvoiceMonthOptions();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col transition-colors">
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Editar Dados do Comprovante
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Altere qualquer campo ou mova esta despesa para outra fatura/mês
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Bloco 1: Fatura de Destino & Data da Compra */}
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Vínculo de Fatura Contábil
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Permite mover o comprovante para qualquer fatura
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fatura de Destino */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fatura / Mês de Fechamento *
                </label>
                <select
                  value={targetInvoiceMonth}
                  onChange={(e) => setTargetInvoiceMonth(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-emerald-500/50 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {invoiceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  A despesa será somada e exibida no relatório desta fatura.
                </p>
              </div>

              {/* Data da Transação Real */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Data da Transação no Comprovante *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Data impressa no cupom fiscal ou recibo físico.
                </p>
              </div>
            </div>
          </div>

          {/* Bloco 2: Dados Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Estabelecimento */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                Estabelecimento / Fornecedor *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Restaurante Fasano, Posto Shell"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Valor */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                Valor Total (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Bloco 3: Categoria & Forma de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Categoria */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Categoria Contábil *
              </label>

              {isCustomCategoryInputOpen ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Nova categoria"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewCategory();
                      } else if (e.key === 'Escape') {
                        setIsCustomCategoryInputOpen(false);
                      }
                    }}
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddNewCategory}
                    disabled={!newCategoryName.trim()}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategoryInputOpen(false);
                      setNewCategoryName('');
                    }}
                    className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setIsCustomCategoryInputOpen(true);
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__NEW__">+ Criar Nova Categoria...</option>
                  </select>
                </div>
              )}
            </div>

            {/* Forma de Pagamento */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                Forma de Pagamento
              </label>
              <input
                type="text"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="Ex: Visa Corporativo Final 4022"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Bloco 4: Descrição & Justificativa */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Descrição / Justificativa Corporativa *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Descreva o motivo corporativo da despesa..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Bloco 5: CNPJ & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                CNPJ do Emissor (opcional)
              </label>
              <input
                type="text"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Status da Prestação
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('conferido')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                    status === 'conferido'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Conferido</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('pendente')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                    status === 'pendente'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Pendente</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bloco 6: Gerenciador de Fotos e Comprovantes Anexados */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  Fotos e Comprovantes Anexados ({receiptsList.length})
                </label>
                <p className="text-[11px] text-slate-500">
                  Todas as fotos anexadas aparecem no relatório mensal e na exportação em PDF.
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingFile}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isProcessingFile ? 'Processando...' : 'Adicionar Foto'}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => handleFilesUpload(e.target.files)}
              />
            </div>

            {receiptsList.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nenhum comprovante anexado
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Clique aqui para adicionar fotos ou documentos em PDF
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {receiptsList.map((rec, idx) => (
                  <div
                    key={`photo-${idx}`}
                    className="relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 group"
                  >
                    <div className="aspect-square bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
                      {rec.dataUrl?.startsWith('data:image/') ? (
                        <img
                          src={rec.dataUrl}
                          alt={rec.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText className="w-10 h-10 text-emerald-500" />
                      )}
                    </div>

                    {/* Badge da Foto */}
                    <div className="p-2 bg-white dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="truncate max-w-[90px] font-medium text-slate-700 dark:text-slate-300">
                        {idx === 0 ? 'Foto 1 (Principal)' : `Foto ${idx + 1}`}
                      </span>

                      <div className="flex items-center gap-1">
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryPhoto(idx)}
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                            title="Tornar esta a 1ª foto"
                          >
                            Tornar 1ª
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                          title="Remover anexo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rodapé com botões de ação */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-md inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Alerta de Comprovante Duplicado */}
      <DuplicateExpenseAlertModal
        isOpen={!!duplicateConflict}
        existingExpense={duplicateConflict?.existing || null}
        pendingExpense={duplicateConflict?.pending || null}
        onCancel={() => setDuplicateConflict(null)}
        onConfirmSave={handleConfirmDuplicateSave}
      />
    </div>
  );
};
