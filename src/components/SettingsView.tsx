import React, { useState, useRef } from 'react';
import {
  Save,
  Download,
  Upload,
  Database,
  Building,
  User,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Flame,
  Info,
  Monitor,
  Sparkles,
  Trash2,
  Sun,
  Moon,
  Palette,
} from 'lucide-react';
import { CompanySettings } from '../types/expense';
import {
  exportDatabaseBackup,
  importDatabaseBackup,
  saveCompanySettings,
} from '../utils/storage';
import { PWAInstallButton } from './PWAInstallButton';
import {
  getStoredOpenRouterKey,
  removeOpenRouterKey,
  saveOpenRouterKey,
  createOpenRouterAuthUrl,
  FREE_VISION_MODELS,
} from '../services/openRouterService';
import { useTheme } from '../context/ThemeContext';

interface SettingsViewProps {
  settings: CompanySettings;
  onUpdateSettings: (newSettings: CompanySettings) => void;
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onRefreshData,
}) => {
  const { theme, toggleTheme, setTheme } = useTheme();
  const [formData, setFormData] = useState<CompanySettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [openRouterKey, setOpenRouterKey] = useState<string | null>(getStoredOpenRouterKey());
  const [isConnectingOpenRouter, setIsConnectingOpenRouter] = useState(false);
  const [manualKeyInput, setManualKeyInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConnectOpenRouter = async () => {
    setIsConnectingOpenRouter(true);
    try {
      const { url } = await createOpenRouterAuthUrl();
      const popup = window.open(
        url,
        'openrouter_auth',
        'width=650,height=750,menubar=no,toolbar=no,location=no'
      );
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Falha ao abrir OpenRouter:', err);
    } finally {
      setIsConnectingOpenRouter(false);
    }
  };

  const handleDisconnectOpenRouter = () => {
    removeOpenRouterKey();
    setOpenRouterKey(null);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveCompanySettings(formData);
    onUpdateSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const jsonBackup = await exportDatabaseBackup();
      const blob = new Blob([jsonBackup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_assistente_gastos_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupMessage('Backup exportado com sucesso!');
      setTimeout(() => setBackupMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setBackupMessage('Falha ao exportar backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const count = await importDatabaseBackup(text);
        setBackupMessage(`Backup restaurado! ${count} despesas carregadas.`);
        onRefreshData();
        setTimeout(() => setBackupMessage(null), 4000);
      } catch (err: any) {
        setBackupMessage(`Erro ao importar: ${err.message || 'Arquivo inválido'}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Seletor de Aparência / Tema Claro & Escuro */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 transition-colors shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Aparência do Sistema
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Alterne entre o Modo Claro e o Modo Escuro conforme sua preferência ou ambiente.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border flex items-center gap-3.5 transition-all text-left cursor-pointer ${
              theme === 'light'
                ? 'bg-amber-500/10 border-amber-500 text-slate-900 ring-2 ring-amber-500/30'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Sun className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Modo Claro</span>
                {theme === 'light' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                    Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Fundo claro, alto contraste para leitura diurna e escritórios iluminados.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border flex items-center gap-3.5 transition-all text-left cursor-pointer ${
              theme === 'dark'
                ? 'bg-emerald-500/10 border-emerald-500 text-white ring-2 ring-emerald-500/30'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Modo Escuro</span>
                {theme === 'dark' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                    Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Fundo escuro profundo, conforto visual para uso prolongado e noturno.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Dados do Colaborador & Cartão Corporativo */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 transition-colors shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Identificação do Colaborador & Empresa
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Esses dados serão utilizados no cabeçalho dos relatórios e planilhas emitidas.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-400 mb-1">
                Seu Nome Completo
              </label>
              <input
                type="text"
                required
                value={formData.employeeName}
                onChange={(e) =>
                  setFormData({ ...formData, employeeName: e.target.value })
                }
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-400 mb-1">
                Cargo / Função
              </label>
              <input
                type="text"
                required
                value={formData.employeeRole}
                onChange={(e) =>
                  setFormData({ ...formData, employeeRole: e.target.value })
                }
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-400 mb-1">
                Nome da Empresa
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-400 mb-1">
                Departamento / Centro de Custo
              </label>
              <input
                type="text"
                required
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-400 mb-1">
                Identificação do Cartão Corporativo
              </label>
              <input
                type="text"
                required
                value={formData.corporateCardNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    corporateCardNumber: e.target.value,
                  })
                }
                placeholder="Ex: Visa Corporativo final 4022"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-400 mb-1">
                Nome do Gestor / Aprovador
              </label>
              <input
                type="text"
                value={formData.approverName}
                onChange={(e) =>
                  setFormData({ ...formData, approverName: e.target.value })
                }
                placeholder="Ex: Diretoria Financeira"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between">
            {saveSuccess && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Configurações salvas com sucesso!
              </span>
            )}
            <div className="ml-auto">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs min-h-[38px]"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Informações</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Gerenciamento de Dados & Backup Local */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 transition-colors shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Banco de Dados Local & Backup
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Seus dados e comprovantes estão salvos localmente no seu navegador via IndexedDB.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          Você pode fazer o download de um arquivo JSON completo contendo todos os
          seus registros e imagens de comprovantes para manter como cópia de segurança
          ou transferir para outro dispositivo.
        </p>

        {backupMessage && (
          <div className="p-3 mb-4 rounded-lg bg-emerald-50 dark:bg-slate-900 border border-emerald-200 dark:border-slate-700 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{backupMessage}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportBackup}
            disabled={isExporting}
            className="px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 min-h-[40px]"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{isExporting ? 'Exportando...' : 'Baixar Arquivo de Backup (.json)'}</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportBackup}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors flex items-center gap-2 cursor-pointer min-h-[40px]"
          >
            <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Restaurar Backup (.json)</span>
          </button>
        </div>
      </div>

      {/* Inteligência Artificial Gratuita (OpenRouter.ai) */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 transition-colors shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Inteligência Artificial Gratuita (OpenRouter.ai)
                </h2>
                {openRouterKey ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                    Conectado & Ativo
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-medium">
                    Não Conectado
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Roteamento de modelos de visão computacional gratuitos para leitura de cupons e faturas.
              </p>
            </div>
          </div>

          <div>
            {!openRouterKey ? (
              <button
                type="button"
                onClick={handleConnectOpenRouter}
                disabled={isConnectingOpenRouter}
                className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[38px]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isConnectingOpenRouter ? 'Conectando...' : 'Conectar com OpenRouter'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDisconnectOpenRouter}
                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-950/40 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer min-h-[38px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Desconectar Chave</span>
              </button>
            )}
          </div>
        </div>

        {!openRouterKey && (
          <div className="p-3 bg-slate-50 dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5 mb-3">
            <span className="text-[11px] text-slate-600 dark:text-slate-400 block font-medium">
              Ou cole uma chave de API do OpenRouter gerada manualmente:
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                placeholder="sk-or-v1-..."
                value={manualKeyInput}
                onChange={(e) => setManualKeyInput(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (manualKeyInput.trim()) {
                    saveOpenRouterKey(manualKeyInput.trim());
                    setOpenRouterKey(manualKeyInput.trim());
                    setManualKeyInput('');
                  }
                }}
                disabled={!manualKeyInput.trim()}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Salvar Chave
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            O OpenRouter permite que cada usuário utilize sua própria cota gratuita de modelos avançados de IA (como <code className="text-emerald-600 dark:text-emerald-400">google/gemini-2.0-flash-exp:free</code> e <code className="text-emerald-600 dark:text-emerald-400">meta-llama/llama-3.2-11b-vision-instruct:free</code>) sem custo algum para a plataforma.
          </p>

          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-white block mb-1">Modelos gratuitos configurados:</span>
            <ul className="list-disc list-inside space-y-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
              {FREE_VISION_MODELS.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Instalação do Aplicativo no Celular / Computador (PWA) */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 transition-colors shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Instalar Aplicativo (PWA / Mobile & Desktop)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transforme esta plataforma em aplicativo para Smartphone, Tablet ou Computador.
              </p>
            </div>
          </div>
          <div>
            <PWAInstallButton />
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p className="font-semibold text-slate-900 dark:text-white">
            Como funciona a versão instalável (Progressive Web App):
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
            <li>Abre em tela cheia com experiência nativa para smartphones, tablets e desktop.</li>
            <li>Cria atalho na Tela de Início do iOS/Android ou na Área de Trabalho do Windows/Mac.</li>
            <li>Funciona 100% offline com persistência de dados local no IndexedDB.</li>
            <li>Sincronização com o Google Drive garantida para você acessar de qualquer aparelho.</li>
          </ul>
        </div>
      </div>

      {/* Prontidão para Hospedagem no GitHub Pages */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 transition-colors shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Hospedagem no GitHub Pages (100% Gratuito)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Passo a passo para publicar seu app online no GitHub Pages sem custo algum.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 inline-flex items-center justify-center text-xs font-bold">1</span>
              Como o GitHub Pages funciona com este App?
            </h3>
            <p>
              O GitHub Pages é uma hospedagem <strong>estática</strong> (roda 100% no navegador do usuário). Toda a interface, os cálculos, a exportação de relatórios em PDF, o gerador de Excel (.xlsx) e o banco de dados (IndexedDB) funcionam nativamente sem precisar de servidor backend.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 inline-flex items-center justify-center text-xs font-bold">2</span>
              Chave da API Gemini (Apenas para o Scanner no GitHub Pages)
            </h3>
            <p>
              Como o GitHub Pages não roda servidor Node.js para guardar segredos, você pode colocar sua própria chave gratuita do Google AI Studio diretamente aqui:
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <input
                type="password"
                placeholder="Cole sua GEMINI_API_KEY aqui (opcional)"
                value={formData.geminiApiKey || ''}
                onChange={(e) =>
                  setFormData({ ...formData, geminiApiKey: e.target.value })
                }
                className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-xs font-semibold cursor-pointer min-h-[38px]"
              >
                Salvar Chave
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
