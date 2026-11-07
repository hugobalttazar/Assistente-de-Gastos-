import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Sparkles,
  FileText,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building,
  DollarSign,
  Tag,
  CreditCard,
  FileCheck,
  Key,
  ExternalLink,
  Layers,
  Plus,
  Trash2,
} from 'lucide-react';
import { CorporateExpense, ExpenseCategory, ReceiptFile } from '../types/expense';
import { convertPdfFirstPageToImage } from '../utils/pdfToImage';
import {
  getStoredOpenRouterKey,
  scanReceiptWithOpenRouter,
  createOpenRouterAuthUrl,
  saveOpenRouterKey,
} from '../services/openRouterService';
import {
  getCustomCategories,
  saveCustomCategory,
  formatMonthName,
  getStoredExpenses,
} from '../utils/storage';
import { DuplicateExpenseAlertModal } from './DuplicateExpenseAlertModal';
import { findDuplicateExpense } from '../utils/duplicateDetector';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (expense: CorporateExpense) => void;
  selectedMonth: string; // YYYY-MM
  defaultCardNumber?: string;
  existingExpenses?: CorporateExpense[];
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onSaveExpense,
  selectedMonth,
  defaultCardNumber = 'Visa Corporativo final 4022',
  existingExpenses = [],
}) => {
  // Lista de arquivos/fotos anexadas
  const [selectedFiles, setSelectedFiles] = useState<ReceiptFile[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [confidenceNote, setConfidenceNote] = useState<string | null>(null);
  const [duplicateConflict, setDuplicateConflict] = useState<{ existing: CorporateExpense; pending: CorporateExpense } | null>(null);

  // Lista dinâmica de categorias (persiste categorias padrão + criadas pela IA ou usuário)
  const [categoriesList, setCategoriesList] = useState<string[]>(() => getCustomCategories());
  const [isCustomCategoryInputOpen, setIsCustomCategoryInputOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [detectedCategoryBadge, setDetectedCategoryBadge] = useState<string | null>(null);

  // Campos do formulário
  const today = new Date().toISOString().split('T')[0];
  const [targetInvoiceMonth, setTargetInvoiceMonth] = useState<string>(
    selectedMonth || today.substring(0, 7)
  );
  const [date, setDate] = useState<string>(
    selectedMonth ? `${selectedMonth}-15` : today
  );
  const [amount, setAmount] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [category, setCategory] = useState<string>('Alimentação');
  const [description, setDescription] = useState<string>('');
  const [cnpj, setCnpj] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>(defaultCardNumber);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  const [showOpenRouterModal, setShowOpenRouterModal] = useState(false);
  const [manualOpenRouterKey, setManualOpenRouterKey] = useState('');
  const [isConnectingOpenRouter, setIsConnectingOpenRouter] = useState(false);

  // Atualiza a fatura de destino quando selectedMonth mudar
  useEffect(() => {
    if (selectedMonth) {
      setTargetInvoiceMonth(selectedMonth);
    }
  }, [selectedMonth]);

  // Gerador de lista de faturas para o select (últimos 12 meses + próximos 3 meses)
  const generateInvoiceMonthOptions = () => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 3; i >= -12; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      options.push({
        value: val,
        label: `Fatura ${formatMonthName(val)}`,
      });
    }

    if (targetInvoiceMonth && !options.some((o) => o.value === targetInvoiceMonth)) {
      options.push({
        value: targetInvoiceMonth,
        label: `Fatura ${formatMonthName(targetInvoiceMonth)}`,
      });
    }

    return options;
  };

  const processFileList = async (files: FileList | File[]): Promise<ReceiptFile[]> => {
    const results: ReceiptFile[] = [];

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

      // Se for PDF, converte a primeira folha para imagem de alta resolução
      if (isPdf) {
        try {
          const converted = await convertPdfFirstPageToImage(dataUrl);
          dataUrl = converted.dataUrl;
          effectiveType = 'image/jpeg';
        } catch (pdfErr) {
          console.warn('Falha na conversão de PDF para imagem:', pdfErr);
        }
      }

      results.push({
        dataUrl,
        name: file.name,
        type: effectiveType,
        size: file.size,
      });
    }

    return results;
  };

  const handleInitialFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setScanError(null);
    setConfidenceNote(null);
    setIsProcessingFiles(true);

    try {
      const processed = await processFileList(files);
      if (processed.length === 0) return;

      setSelectedFiles(processed);

      // Dispara automaticamente a leitura inteligente com o OpenRouter SOMENTE na 1ª foto
      triggerAiScan(processed[0]);
    } catch (err) {
      console.error('Erro ao processar arquivos:', err);
      setScanError('Não foi possível ler os arquivos selecionados.');
    } finally {
      setIsProcessingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddMoreFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessingFiles(true);

    try {
      const processed = await processFileList(files);
      setSelectedFiles((prev) => [...prev, ...processed]);
    } catch (err) {
      console.error('Erro ao adicionar arquivos adicionais:', err);
      setScanError('Erro ao carregar fotos adicionais.');
    } finally {
      setIsProcessingFiles(false);
      if (addMoreInputRef.current) addMoreInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (selectedFiles.length === 0) {
        handleInitialFilesSelected(e.dataTransfer.files);
      } else {
        handleAddMoreFiles(e.dataTransfer.files);
      }
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetPrimaryPhoto = (indexToPrimary: number) => {
    if (indexToPrimary === 0) return;
    setSelectedFiles((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(indexToPrimary, 1);
      return [item, ...copy];
    });
  };

  // Escuta autenticação do OpenRouter em tempo real para fechar modal e disparar o scan
  useEffect(() => {
    const handleAuthChange = () => {
      const key = getStoredOpenRouterKey();
      if (key) {
        setShowOpenRouterModal(false);
        setScanError(null);
        if (selectedFiles.length > 0 && !isScanning) {
          triggerAiScan(selectedFiles[0]);
        }
      }
    };
    window.addEventListener('openrouter-auth-changed', handleAuthChange);
    return () => window.removeEventListener('openrouter-auth-changed', handleAuthChange);
  }, [selectedFiles, isScanning]);

  const handleConnectOpenRouter = async () => {
    try {
      setIsConnectingOpenRouter(true);
      const { url } = await createOpenRouterAuthUrl();
      const popup = window.open(
        url,
        'openrouter_auth',
        'width=650,height=750,menubar=no,toolbar=no,location=no'
      );
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = url;
      } else {
        const timer = setInterval(() => {
          if (popup.closed) {
            clearInterval(timer);
            setIsConnectingOpenRouter(false);
            const key = getStoredOpenRouterKey();
            if (key) {
              setShowOpenRouterModal(false);
              setScanError(null);
              if (selectedFiles.length > 0 && !isScanning) {
                triggerAiScan(selectedFiles[0]);
              }
            }
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Falha ao iniciar autenticação OpenRouter:', err);
      setIsConnectingOpenRouter(false);
    }
  };

  const handleSaveOpenRouterKeyAndRescan = () => {
    if (!manualOpenRouterKey.trim()) return;
    saveOpenRouterKey(manualOpenRouterKey.trim());
    setShowOpenRouterModal(false);
    setScanError(null);
    setManualOpenRouterKey('');
    if (selectedFiles.length > 0) {
      triggerAiScan(selectedFiles[0]);
    }
  };

  // Chama exclusivamente a IA gratuita do OpenRouter na 1ª imagem
  const triggerAiScan = async (fileToScan: ReceiptFile) => {
    const openRouterKey = getStoredOpenRouterKey();
    if (!openRouterKey) {
      setShowOpenRouterModal(true);
      setIsScanning(false);
      setScanError(
        'Para ativar a leitura inteligente automática, conecte sua conta gratuita do OpenRouter ou cole sua chave de API abaixo:'
      );
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setConfidenceNote(null);

    try {
      const data = await scanReceiptWithOpenRouter(fileToScan.dataUrl, fileToScan.type);

      if (!data) {
        throw new Error('Não foi possível extrair os dados do comprovante via OpenRouter.');
      }

      // Preenche os campos automaticamente com o que foi extraído
      if (data.date) setDate(data.date);
      if (data.amount !== undefined && data.amount !== null) {
        setAmount(String(data.amount));
      }
      if (data.merchant) setMerchant(data.merchant);
      if (data.category && typeof data.category === 'string') {
        const rawCat = data.category.trim();
        if (rawCat) {
          const updated = saveCustomCategory(rawCat);
          setCategoriesList(updated);
          setCategory(rawCat);
          setDetectedCategoryBadge(rawCat);
        }
      }
      if (data.description) setDescription(data.description);
      if (data.cnpj) setCnpj(data.cnpj);
      if (data.paymentMethod) {
        setPaymentMethod(data.paymentMethod);
      } else {
        setPaymentMethod(defaultCardNumber);
      }

      setConfidenceNote(
        data.confidenceNotes || '1ª foto lida com sucesso via IA do OpenRouter!'
      );
    } catch (err: any) {
      console.error('Erro na leitura via OpenRouter:', err);
      const errMsg = err?.message || '';
      if (
        errMsg.includes('401') ||
        errMsg.includes('Unauthorized') ||
        errMsg.includes('Chave do OpenRouter') ||
        errMsg.includes('inválida') ||
        errMsg.includes('expirada') ||
        errMsg.includes('não encontrada')
      ) {
        setShowOpenRouterModal(true);
      }
      setScanError(
        errMsg ||
          'A leitura automática encontrou dificuldade no momento. Você pode clicar em Reconectar OpenRouter ou preencher os campos manualmente abaixo.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanAmountStr = String(amount).replace(/[^\d.,]/g, '').trim();
    let numericAmount = 0;
    if (cleanAmountStr.includes(',') && cleanAmountStr.includes('.')) {
      numericAmount = parseFloat(cleanAmountStr.replace(/\./g, '').replace(',', '.'));
    } else if (cleanAmountStr.includes(',')) {
      numericAmount = parseFloat(cleanAmountStr.replace(',', '.'));
    } else {
      numericAmount = parseFloat(cleanAmountStr);
    }

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setScanError('Por favor, informe um valor monetário válido.');
      return;
    }

    if (!merchant.trim()) {
      setScanError('Por favor, informe o estabelecimento ou fornecedor.');
      return;
    }

    if (!date) {
      setScanError('Por favor, informe a data da transação.');
      return;
    }

    if (!targetInvoiceMonth) {
      setScanError('Por favor, selecione a fatura de destino.');
      return;
    }

    const newExpense: CorporateExpense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date: date || today,
      invoiceId: targetInvoiceMonth,
      amount: numericAmount,
      merchant: merchant.trim(),
      category: category.trim() || 'Outros',
      description: description.trim() || `Despesa corporativa em ${merchant.trim()}`,
      cnpj: cnpj.trim() || undefined,
      paymentMethod: paymentMethod.trim() || defaultCardNumber,
      receipt: selectedFiles[0] || undefined,
      receipts: selectedFiles.length > 0 ? selectedFiles : undefined,
      status: 'conferido',
      createdAt: new Date().toISOString(),
      notes: confidenceNote || undefined,
    };

    // 1. Obtém lista combinada de despesas para verificação (prop + cache local atualizado)
    let candidateExpenses: CorporateExpense[] = [...existingExpenses];
    try {
      const stored = await getStoredExpenses();
      if (stored && stored.length > 0) {
        const idMap = new Map<string, CorporateExpense>();
        for (const item of candidateExpenses) idMap.set(item.id, item);
        for (const item of stored) idMap.set(item.id, item);
        candidateExpenses = Array.from(idMap.values());
      }
    } catch {
      // ignore
    }

    // 2. Verificação de duplicação inteligente: compara Estabelecimento (fuzzy), Valor e Data
    const conflict = findDuplicateExpense(newExpense, candidateExpenses);

    if (conflict) {
      setDuplicateConflict({ existing: conflict, pending: newExpense });
      return;
    }

    onSaveExpense(newExpense);
    handleResetAndClose();
  };

  const handleConfirmDuplicateSave = () => {
    if (!duplicateConflict) return;
    onSaveExpense(duplicateConflict.pending);
    setDuplicateConflict(null);
    handleResetAndClose();
  };

  const handleAddNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const updated = saveCustomCategory(trimmed);
    setCategoriesList(updated);
    setCategory(trimmed);
    setDetectedCategoryBadge(null);
    setNewCategoryName('');
    setIsCustomCategoryInputOpen(false);
  };

  const handleResetAndClose = () => {
    setSelectedFiles([]);
    setIsScanning(false);
    setIsProcessingFiles(false);
    setScanError(null);
    setConfidenceNote(null);
    setDetectedCategoryBadge(null);
    setDuplicateConflict(null);
    setDate(selectedMonth ? `${selectedMonth}-15` : today);
    setTargetInvoiceMonth(selectedMonth || today.substring(0, 7));
    setAmount('');
    setMerchant('');
    setCategory('Alimentação');
    setDescription('');
    setCnpj('');
    setPaymentMethod(defaultCardNumber);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (addMoreInputRef.current) addMoreInputRef.current.value = '';
    onClose();
  };

  const primaryFile = selectedFiles[0] || null;
  const isPrimaryPdf = primaryFile?.type === 'application/pdf' || primaryFile?.name.endsWith('.pdf');
  const invoiceOptions = generateInvoiceMonthOptions();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col transition-colors">
        {/* Cabeçalho do Modal */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Digitalizar Comprovante com IA
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Envie 1 ou mais fotos/páginas do cupom para leitura automática e prestação de contas
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal em 2 Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6 overflow-y-auto flex-1">
          {/* Coluna Esquerda: Upload e Fotos Anexadas (5 colunas) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-500" />
                Fotos do Comprovante ({selectedFiles.length})
              </label>

              {selectedFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => addMoreInputRef.current?.click()}
                  disabled={isProcessingFiles || isScanning}
                  className="px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-emerald-500/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Foto</span>
                </button>
              )}

              <input
                ref={addMoreInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => handleAddMoreFiles(e.target.files)}
              />
            </div>

            {selectedFiles.length === 0 ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500/60 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-all cursor-pointer min-h-[260px] group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleInitialFilesSelected(e.target.files)}
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:scale-110 transition-all mb-3 shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Arraste os comprovantes aqui
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Você pode selecionar mais de 1 foto (JPG, PNG ou PDF)
                </p>
                <span className="px-3 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-md border border-slate-200 dark:border-slate-700 font-medium">
                  Selecionar do dispositivo
                </span>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-3 max-w-[260px]">
                  ✨ A IA fará a leitura da 1ª foto, e todas as fotos serão anexadas no relatório.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Visualizador da 1ª Foto (Principal analisada pela IA) */}
                <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col">
                  <div className="p-2.5 bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Foto 1 (Principal · Lida pela IA)
                    </span>
                    <button
                      onClick={() => {
                        setSelectedFiles([]);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-red-500 hover:text-red-600 dark:text-red-400 text-xs font-medium cursor-pointer"
                    >
                      Remover todas
                    </button>
                  </div>

                  <div className="p-3 flex items-center justify-center min-h-[220px] max-h-[300px] overflow-hidden relative">
                    {isScanning && (
                      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center z-10 p-4 text-center">
                        <div className="relative w-16 h-16 mb-3">
                          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
                          <div className="w-16 h-16 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-emerald-400 mb-1">
                          Lendo 1ª Foto com IA (OpenRouter)...
                        </p>
                        <p className="text-xs text-slate-400 max-w-xs">
                          Extraindo data, valor, fornecedor, itens e forma de pagamento
                        </p>
                      </div>
                    )}

                    {isPrimaryPdf && !primaryFile.dataUrl.startsWith('data:image/') ? (
                      <div className="flex flex-col items-center justify-center text-center py-8">
                        <FileText className="w-14 h-14 text-emerald-500 mb-2" />
                        <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                          {primaryFile.name}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={primaryFile.dataUrl}
                        alt="Comprovante Principal"
                        className="max-h-[280px] w-auto object-contain rounded shadow-xs"
                      />
                    )}
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => triggerAiScan(primaryFile)}
                      disabled={isScanning}
                      className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-medium cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Reescanear 1ª foto com IA</span>
                    </button>
                    <span className="text-[11px] text-slate-500">
                      {(primaryFile.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                </div>

                {/* Carrossel / Miniaturas de Todas as Fotos Anexadas */}
                {selectedFiles.length > 1 && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Todas as {selectedFiles.length} fotos anexadas:
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Somente a 1ª é lida pela IA
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {selectedFiles.map((file, idx) => (
                        <div
                          key={`file-${idx}`}
                          className={`relative rounded-lg overflow-hidden border ${
                            idx === 0
                              ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                              : 'border-slate-200 dark:border-slate-800'
                          } bg-white dark:bg-slate-950 flex flex-col group`}
                        >
                          <div className="aspect-square flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-900">
                            {file.dataUrl.startsWith('data:image/') ? (
                              <img
                                src={file.dataUrl}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FileText className="w-6 h-6 text-emerald-500" />
                            )}
                          </div>
                          <div className="p-1 text-[10px] flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                            <span className="truncate font-semibold text-slate-700 dark:text-slate-300">
                              {idx === 0 ? '1ª (IA)' : `${idx + 1}ª foto`}
                            </span>
                            <div className="flex items-center gap-1">
                              {idx !== 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimaryPhoto(idx)}
                                  className="text-[9px] text-emerald-600 hover:underline cursor-pointer"
                                  title="Tornar esta a 1ª foto"
                                >
                                  Tornar 1ª
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(idx)}
                                className="text-slate-400 hover:text-red-500 cursor-pointer"
                                title="Remover esta foto"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Aviso explicativo amigável sobre múltiplas fotos */}
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
              📌 <strong>Fotos adicionais:</strong> Você pode anexar comprovante de maquininha, cupom fiscal e recibos adicionais. Todas as fotos serão salvas e constarão no relatório impresso / PDF.
            </div>

            {confidenceNote && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Extração Concluída: </span>
                  <span>{confidenceNote}</span>
                </div>
              </div>
            )}

            {scanError && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-700 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{scanError}</span>
                </div>
                {!showOpenRouterModal && (
                  <button
                    type="button"
                    onClick={() => setShowOpenRouterModal(true)}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 dark:text-amber-100 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-800/80 rounded-lg transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Conectar / Trocar Chave</span>
                  </button>
                )}
              </div>
            )}

            {showOpenRouterModal && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-emerald-500/50 text-xs text-slate-700 dark:text-slate-200 space-y-3 shadow-lg">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Sparkles className="w-4 h-4" />
                  <span>Conectar IA do OpenRouter (100% Gratuito)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  A leitura inteligente de notas e recibos utiliza os modelos gratuitos de visão do OpenRouter. Conecte sua conta em 1 clique ou informe sua chave:
                </p>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleConnectOpenRouter}
                    disabled={isConnectingOpenRouter}
                    className="w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isConnectingOpenRouter ? 'Conectando ao OpenRouter...' : 'Conectar OpenRouter em 1 Clique'}</span>
                  </button>

                  <div className="flex items-center gap-2 my-1">
                    <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
                    <span className="text-[10px] uppercase font-semibold text-slate-400">ou cole a chave manual</span>
                    <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      placeholder="sk-or-v1-..."
                      value={manualOpenRouterKey}
                      onChange={(e) => setManualOpenRouterKey(e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveOpenRouterKeyAndRescan}
                      disabled={!manualOpenRouterKey.trim()}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      Salvar & Ler
                    </button>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                  >
                    <Key className="w-3 h-3" />
                    <span>Criar chave gratuita em openrouter.ai/keys</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowOpenRouterModal(false)}
                    className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-400 cursor-pointer"
                  >
                    Dispensar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita: Formulário de Revisão e Seleção de Fatura (7 colunas) */}
          <form onSubmit={handleSave} className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Dados da Despesa Corporativa
              </span>
              <span className="text-[11px] text-slate-500">
                Verifique e ajuste conforme necessário
              </span>
            </div>

            {/* SELETOR DE FATURA DE DESTINO / COMPETÊNCIA */}
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/30">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  Fatura / Mês de Destino *
                </label>
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Competência do Cartão
                </span>
              </div>
              <select
                value={targetInvoiceMonth}
                onChange={(e) => setTargetInvoiceMonth(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-emerald-500/60 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
              >
                {invoiceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                💡 <strong>Dica de conciliação:</strong> Mesmo que o cupom tenha data de novembro, você pode selecionar <em>Fatura Outubro</em> caso o ciclo do cartão corporativo ainda pertença a outubro.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Data da Compra */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Data da Transação *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Valor Total */}
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

              {/* Categoria */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    Categoria Contábil *
                  </label>
                  {detectedCategoryBadge && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      IA definiu: {detectedCategoryBadge}
                    </span>
                  )}
                </div>

                {isCustomCategoryInputOpen ? (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Nova categoria (ex: Pedágio, Estacionamento)"
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
                          setDetectedCategoryBadge(null);
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
            </div>

            {/* Justificativa / Descrição */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                Descrição / Justificativa Corporativa *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Ex: Almoço de negócios com diretor de operações do cliente para alinhamento do contrato."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Esta descrição aparecerá diretamente no relatório mensal para prestação de contas.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Forma de Pagamento */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  Forma de Pagamento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Visa Corporativo Final 4022"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* CNPJ */}
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
            </div>

            {/* Ações do Rodapé */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isScanning || isProcessingFiles}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Despesa na Fatura</span>
              </button>
            </div>
          </form>
        </div>
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
