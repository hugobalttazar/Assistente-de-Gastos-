import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { CorporateExpense, ExpenseCategory, ReceiptFile } from '../types/expense';
import { convertPdfFirstPageToImage } from '../utils/pdfToImage';
import {
  getStoredOpenRouterKey,
  scanReceiptWithOpenRouter,
  createOpenRouterAuthUrl,
} from '../services/openRouterService';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (expense: CorporateExpense) => void;
  selectedMonth: string; // YYYY-MM
  defaultCardNumber?: string;
}

const CATEGORIES: ExpenseCategory[] = [
  'Alimentação',
  'Transporte / Táxi / Uber',
  'Combustível',
  'Hospedagem',
  'Passagens',
  'Material de Escritório',
  'Software & Serviços',
  'Outros',
];

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onSaveExpense,
  selectedMonth,
  defaultCardNumber = 'Visa Corporativo final 4022',
}) => {
  const [selectedFile, setSelectedFile] = useState<ReceiptFile | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [confidenceNote, setConfidenceNote] = useState<string | null>(null);

  // Campos do formulário
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(
    selectedMonth ? `${selectedMonth}-15` : today
  );
  const [amount, setAmount] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('Alimentação');
  const [description, setDescription] = useState<string>('');
  const [cnpj, setCnpj] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>(defaultCardNumber);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const handleFileChange = (file: File) => {
    setScanError(null);
    setConfidenceNote(null);

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    const reader = new FileReader();
    reader.onload = async (e) => {
      let dataUrl = e.target?.result as string;
      let effectiveType = file.type || (isPdf ? 'application/pdf' : 'image/jpeg');

      // Converte a folha do PDF em imagem JPEG de alta resolução para exibição no relatório
      if (isPdf) {
        try {
          setIsScanning(true);
          const converted = await convertPdfFirstPageToImage(dataUrl);
          dataUrl = converted.dataUrl;
          effectiveType = 'image/jpeg';
        } catch (pdfErr) {
          console.warn('Falha na conversão de PDF para imagem:', pdfErr);
        } finally {
          setIsScanning(false);
        }
      }

      const receiptFile: ReceiptFile = {
        dataUrl,
        name: file.name,
        type: effectiveType,
        size: file.size,
      };
      setSelectedFile(receiptFile);
      // Dispara automaticamente a leitura inteligente com a IA
      triggerAiScan(receiptFile);
    };
    reader.onerror = () => {
      setScanError('Não foi possível ler o arquivo selecionado.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Salva a chave da API do Gemini localmente e reexecuta o escaneamento
  const handleSaveApiKeyAndRescan = () => {
    if (!tempApiKey.trim()) return;
    const rawSettings = localStorage.getItem('meu_assessor_company_settings');
    const parsed = rawSettings ? JSON.parse(rawSettings) : {};
    parsed.geminiApiKey = tempApiKey.trim();
    localStorage.setItem('meu_assessor_company_settings', JSON.stringify(parsed));
    setShowApiKeyModal(false);
    setScanError(null);
    if (selectedFile) {
      triggerAiScan(selectedFile);
    }
  };

  // Chama o backend para extração via Gemini API
  const triggerAiScan = async (fileToScan: ReceiptFile) => {
    setIsScanning(true);
    setScanError(null);
    setConfidenceNote(null);

    try {
      let data: any = null;

      // 1. Prioridade: Usa a conta OpenRouter conectada pelo usuário (IA Gratuita)
      const openRouterKey = getStoredOpenRouterKey();
      if (openRouterKey) {
        try {
          data = await scanReceiptWithOpenRouter(fileToScan.dataUrl, fileToScan.type);
          if (data) {
            setConfidenceNote('Lido com sucesso via IA Gratuita do OpenRouter!');
          }
        } catch (orErr) {
          console.warn('OpenRouter retornou erro, tentando fallback:', orErr);
        }
      }

      // 2. Se OpenRouter não estiver configurado ou falhou, tenta o endpoint backend local (/api/scan-receipt)
      if (!data) {
        try {
          const response = await fetch('/api/scan-receipt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileBase64: fileToScan.dataUrl,
              mimeType: fileToScan.type,
              filename: fileToScan.name,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              data = result.data;
            }
          }
        } catch (backendErr) {
          console.warn('Backend /api/scan-receipt não respondeu (ambiente estático/PWA/GitHub Pages):', backendErr);
        }
      }

      // 2. Se backend falhou (ex: app instalado no PC ou GitHub Pages), usa chamada direta via cliente
      if (!data) {
        const rawSettings = localStorage.getItem('meu_assessor_company_settings');
        const parsedSettings = rawSettings ? JSON.parse(rawSettings) : {};
        const clientApiKey = parsedSettings.geminiApiKey;

        if (clientApiKey && clientApiKey.trim()) {
          const cleanBase64 = fileToScan.dataUrl.includes(',')
            ? fileToScan.dataUrl.split(',')[1]
            : fileToScan.dataUrl;

          const promptText = `Você é um especialista contábil em prestação de contas de cartão corporativo no Brasil.
Analise a imagem ou PDF deste recibo, nota fiscal (NFC-e, NF-e, SAT), fatura ou cupom fiscal.
Extraia em JSON estrito:
{
  "date": "YYYY-MM-DD",
  "amount": 0.00,
  "merchant": "Nome do Estabelecimento",
  "category": "Alimentação" ou "Transporte / Táxi / Uber" ou "Combustível" ou "Hospedagem" ou "Passagens" ou "Material de Escritório" ou "Software & Serviços" ou "Outros",
  "description": "descrição concisa do que foi comprado",
  "cnpj": "00.000.000/0000-00",
  "paymentMethod": "Forma de pagamento",
  "confidenceNotes": "observação de leitura"
}`;

          // Modelos modernos de alta disponibilidade, priorizando Flash Lite (imune a picos de alta demanda)
          const modelsToTry = [
            'gemini-flash-lite-latest',
            'gemini-3.1-flash-lite',
            'gemini-3.5-flash-lite',
            'gemini-flash-latest',
            'gemini-3.8-flash',
          ];
          let parsedResult: any = null;
          let lastDirectError: any = null;

          for (const modelToCall of modelsToTry) {
            for (let attempt = 1; attempt <= 2; attempt++) {
              try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToCall}:generateContent?key=${clientApiKey.trim()}`;
                const resDirect = await fetch(geminiUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [
                      {
                        parts: [
                          {
                            inlineData: {
                              mimeType: fileToScan.type || 'image/jpeg',
                              data: cleanBase64,
                            },
                          },
                          { text: promptText },
                        ],
                      },
                    ],
                    generationConfig: {
                      responseMimeType: 'application/json',
                    },
                  }),
                });

                if (resDirect.ok) {
                  const directJson = await resDirect.json();
                  const textResponse = directJson.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (textResponse) {
                    const cleanedText = textResponse.replace(/^```json/i, '').replace(/```$/i, '').trim();
                    const parsed = JSON.parse(cleanedText);
                    parsedResult = Array.isArray(parsed) ? parsed[0] : parsed;
                    break;
                  }
                } else {
                  const errBody = await resDirect.json().catch(() => ({}));
                  const errMsg = errBody.error?.message || `Erro ${resDirect.status}`;
                  lastDirectError = new Error(errMsg);
                  // Se for 503 (alta demanda temporária), aguarda 1.2s antes de tentar novamente
                  if (resDirect.status === 503 || errMsg.includes('demand')) {
                    await new Promise((r) => setTimeout(r, 1200));
                  }
                }
              } catch (netErr: any) {
                lastDirectError = netErr;
              }
            }
            if (parsedResult) {
              data = parsedResult;
              break;
            }
          }

          if (!data) {
            throw lastDirectError || new Error('Não foi possível ler o comprovante com a chave do Gemini.');
          }
        } else {
          // Solicita a chave diretamente no modal para o usuário não ficar perdido!
          setShowApiKeyModal(true);
          setIsScanning(false);
          setScanError('Como este app está instalado no seu computador, informe sua chave gratuita do Gemini para ativar a leitura com IA:');
          return;
        }
      }

      if (!data) {
        throw new Error('Não foi possível extrair os dados do comprovante.');
      }

      // Preenche os campos automaticamente com o que foi extraído
      if (data.date) setDate(data.date);
      if (data.amount !== undefined && data.amount !== null) {
        setAmount(String(data.amount));
      }
      if (data.merchant) setMerchant(data.merchant);
      if (data.category && CATEGORIES.includes(data.category as ExpenseCategory)) {
        setCategory(data.category as ExpenseCategory);
      }
      if (data.description) {
        setDescription(data.description);
      }
      if (data.cnpj) setCnpj(data.cnpj);
      if (data.paymentMethod) {
        setPaymentMethod(data.paymentMethod);
      } else {
        setPaymentMethod(defaultCardNumber);
      }

      if (data.confidenceNotes) {
        setConfidenceNote(data.confidenceNotes);
      }
    } catch (err: any) {
      console.error('Erro na leitura com IA:', err);
      setScanError(err.message || 'A leitura automática encontrou dificuldade, mas você pode preencher os campos manualmente abaixo.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setScanError('Por favor, informe um valor monetário válido.');
      return;
    }

    if (!merchant.trim()) {
      setScanError('Por favor, informe o estabelecimento ou fornecedor.');
      return;
    }

    const newExpense: CorporateExpense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date: date || today,
      amount: numericAmount,
      merchant: merchant.trim(),
      category,
      description: description.trim() || `Despesa corporativa em ${merchant.trim()}`,
      cnpj: cnpj.trim() || undefined,
      paymentMethod: paymentMethod.trim() || defaultCardNumber,
      receipt: selectedFile || undefined,
      status: 'conferido',
      createdAt: new Date().toISOString(),
      notes: confidenceNote || undefined,
    };

    onSaveExpense(newExpense);
    handleResetAndClose();
  };

  const handleResetAndClose = () => {
    setSelectedFile(null);
    setIsScanning(false);
    setScanError(null);
    setConfidenceNote(null);
    setAmount('');
    setMerchant('');
    setDescription('');
    setCnpj('');
    onClose();
  };

  const isPdf = selectedFile?.type === 'application/pdf' || selectedFile?.name.endsWith('.pdf');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col transition-colors">
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
                Envie o recibo, cupom ou fatura para extração automática de dados
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
          {/* Coluna Esquerda: Upload e Prévia do Arquivo (5 colunas) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Arquivo do Comprovante (Imagem ou PDF)
            </label>

            {!selectedFile ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500/60 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-all cursor-pointer min-h-[260px] group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:scale-110 transition-all mb-3 shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Arraste o comprovante aqui
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  JPG, PNG, WebP ou PDF (até 50MB)
                </p>
                <span className="px-3 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-md border border-slate-200 dark:border-slate-700 font-medium">
                  Ou selecione do dispositivo
                </span>
              </div>
            ) : (
              <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col">
                <div className="p-3 bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                  <span className="truncate max-w-[200px] font-mono">
                    {selectedFile.name}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-red-500 hover:text-red-600 dark:text-red-400 text-xs font-medium cursor-pointer"
                  >
                    Trocar arquivo
                  </button>
                </div>

                {/* Exibição da imagem ou ícone de PDF */}
                <div className="p-4 flex items-center justify-center min-h-[240px] max-h-[340px] overflow-hidden relative">
                  {isScanning && (
                    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center z-10 p-4 text-center">
                      <div className="relative w-16 h-16 mb-3">
                        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
                        <div className="w-16 h-16 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-emerald-400 mb-1">
                        Lendo Comprovante com Gemini IA...
                      </p>
                      <p className="text-xs text-slate-400 max-w-xs">
                        Extraindo data, valor, fornecedor, itens e forma de pagamento
                      </p>
                    </div>
                  )}

                  {isPdf && !selectedFile.dataUrl.startsWith('data:image/') ? (
                    <div className="flex flex-col items-center justify-center text-center py-8">
                      <FileText className="w-16 h-16 text-emerald-500 mb-2" />
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                        Documento PDF Carregado
                      </span>
                    </div>
                  ) : (
                    <img
                      src={selectedFile.dataUrl}
                      alt="Comprovante"
                      className="max-h-[300px] w-auto object-contain rounded shadow-xs"
                    />
                  )}
                </div>

                <div className="p-3 bg-white dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => triggerAiScan(selectedFile)}
                    disabled={isScanning}
                    className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-medium cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Reescanear com IA</span>
                  </button>
                  <span className="text-[11px] text-slate-500">
                    {(selectedFile.size / 1024).toFixed(0)} KB
                  </span>
                </div>
              </div>
            )}

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
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{scanError}</span>
              </div>
            )}

            {showApiKeyModal && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-emerald-500/50 text-xs text-slate-700 dark:text-slate-200 space-y-3 shadow-lg">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Sparkles className="w-4 h-4" />
                  <span>Configurar Chave da IA (Gemini)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  No app instalado ou no GitHub Pages, informe sua chave gratuita do Google AI Studio para ativar a extração inteligente:
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    placeholder="Cole sua chave aqui (AIzaSy...)"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveApiKeyAndRescan}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Salvar & Ler
                  </button>
                </div>
                <div className="pt-1 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>→ Obter chave gratuita no Google AI Studio (30s)</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowApiKeyModal(false)}
                    className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-400 cursor-pointer"
                  >
                    Dispensar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita: Formulário de Revisão e Inserção da Descrição (7 colunas) */}
          <form onSubmit={handleSave} className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Dados da Despesa Corporativa
              </span>
              <span className="text-[11px] text-slate-500">
                Verifique e ajuste conforme necessário
              </span>
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
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  Categoria Contábil *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Descrição / Justificativa Corporativa */}
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
              <span className="text-[11px] text-slate-500">
                Esta descrição aparecerá diretamente no relatório mensal para prestação de contas.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Meio de Pagamento */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  Forma de Pagamento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Visa Corporativo final 4022"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
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
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
              </div>
            </div>

            {/* Ações do Formulário */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer min-h-[38px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer min-h-[38px]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Despesa no Mês</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
