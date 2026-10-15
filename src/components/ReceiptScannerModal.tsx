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

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const receiptFile: ReceiptFile = {
        dataUrl,
        name: file.name,
        type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
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

      // 1. Tenta chamar o endpoint backend local (/api/scan-receipt)
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

          // Modelos modernos oficiais com o gemini-flash-latest como prioritário
          const modelsToTry = [
            'gemini-flash-latest',
            'gemini-3.8-flash',
            'gemini-3.7-flash',
            'gemini-3.5-flash',
          ];
          let lastDirectError: any = null;

          for (const modelToCall of modelsToTry) {
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
                  // Limpa eventuais crases de markdown
                  const cleanedText = textResponse.replace(/^```json/i, '').replace(/```$/i, '').trim();
                  data = JSON.parse(cleanedText);
                  break;
                }
              } else {
                const errBody = await resDirect.json().catch(() => ({}));
                lastDirectError = new Error(errBody.error?.message || `Erro ${resDirect.status} ao consultar modelo ${modelToCall}`);
              }
            } catch (netErr: any) {
              lastDirectError = netErr;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Digitalizar Comprovante com IA
              </h2>
              <p className="text-xs text-slate-400">
                Envie o recibo, cupom ou fatura para extração automática de dados.
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal em 2 Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto">
          {/* Coluna Esquerda: Upload e Prévia do Arquivo (5 colunas) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <label className="text-xs font-semibold text-slate-300">
              Arquivo do Comprovante (Imagem ou PDF)
            </label>

            {!selectedFile ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-900/40 hover:bg-slate-900/80 transition-all cursor-pointer min-h-[260px] group"
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
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:scale-110 transition-all mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-200 mb-1">
                  Arraste o comprovante aqui
                </p>
                <p className="text-xs text-slate-400 mb-3">
                  JPG, PNG, WebP ou PDF (até 50MB)
                </p>
                <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-md border border-slate-700">
                  Ou selecione do dispositivo
                </span>
              </div>
            ) : (
              <div className="relative border border-slate-800 rounded-xl overflow-hidden bg-slate-950 flex flex-col">
                <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <span className="truncate max-w-[200px] font-mono">
                    {selectedFile.name}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-red-400 hover:text-red-300 text-xs font-medium cursor-pointer"
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

                  {isPdf ? (
                    <div className="flex flex-col items-center justify-center text-center py-8">
                      <FileText className="w-16 h-16 text-emerald-400 mb-2" />
                      <span className="text-xs font-mono text-slate-300">
                        Documento PDF Carregado
                      </span>
                    </div>
                  ) : (
                    <img
                      src={selectedFile.dataUrl}
                      alt="Comprovante"
                      className="max-h-[300px] w-auto object-contain rounded"
                    />
                  )}
                </div>

                <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => triggerAiScan(selectedFile)}
                    disabled={isScanning}
                    className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer disabled:opacity-50"
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
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Extração Concluída: </span>
                  <span>{confidenceNote}</span>
                </div>
              </div>
            )}

            {scanError && (
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{scanError}</span>
              </div>
            )}

            {showApiKeyModal && (
              <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/50 text-xs text-slate-200 space-y-3 shadow-lg">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <Sparkles className="w-4 h-4" />
                  <span>Configurar Chave da IA (Gemini)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  No app instalado no seu computador ou no GitHub Pages, informe sua chave gratuita do Google AI Studio para ativar a extração inteligente:
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    placeholder="Cole sua chave aqui (AIzaSy...)"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveApiKeyAndRescan}
                    className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Salvar & Ler
                  </button>
                </div>
                <div className="pt-1 border-t border-slate-800 flex items-center justify-between">
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>→ Obter chave gratuita no Google AI Studio (30s)</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowApiKeyModal(false)}
                    className="text-[11px] text-slate-500 hover:text-slate-400 cursor-pointer"
                  >
                    Dispensar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita: Formulário de Revisão e Inserção da Descrição (7 colunas) */}
          <form onSubmit={handleSave} className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-300">
                Dados da Despesa Corporativa
              </span>
              <span className="text-[11px] text-slate-500">
                Verifique e ajuste conforme necessário
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Data da Compra */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Data da Transação *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Valor Total */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                  Valor Total (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-emerald-400 font-mono font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Estabelecimento */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  Estabelecimento / Fornecedor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Restaurante Fasano, Posto Shell"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  Categoria Contábil *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Descrição / Justificativa Corporativa (Item solicitado pelo usuário) */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-slate-500" />
                Descrição / Justificativa Corporativa *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Ex: Almoço de negócios com diretor de operações do cliente para alinhamento do contrato."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
              <span className="text-[11px] text-slate-500">
                Esta descrição aparecerá diretamente no relatório mensal para prestação de contas.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Meio de Pagamento */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  Forma de Pagamento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Visa Corporativo final 4022"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
              </div>

              {/* CNPJ */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  CNPJ do Emissor (opcional)
                </label>
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
              </div>
            </div>

            {/* Ações do Formulário */}
            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-95 transition-all rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
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
