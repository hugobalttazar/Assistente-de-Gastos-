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
  createOpenRouterAuthUrl,
  FREE_VISION_MODELS,
} from '../services/openRouterService';

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
  const [formData, setFormData] = useState<CompanySettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [openRouterKey, setOpenRouterKey] = useState<string | null>(getStoredOpenRouterKey());
  const [isConnectingOpenRouter, setIsConnectingOpenRouter] = useState(false);

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
      {/* Dados do Colaborador & Cartão Corporativo */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800 mb-6">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              Identificação do Colaborador & Empresa
            </h2>
            <p className="text-xs text-slate-400">
              Esses dados serão utilizados no cabeçalho dos relatórios e planilhas emitidas.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Seu Nome Completo
              </label>
              <input
                type="text"
                required
                value={formData.employeeName}
                onChange={(e) =>
                  setFormData({ ...formData, employeeName: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Cargo / Função
              </label>
              <input
                type="text"
                required
                value={formData.employeeRole}
                onChange={(e) =>
                  setFormData({ ...formData, employeeRole: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Nome da Empresa
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Departamento / Centro de Custo
              </label>
              <input
                type="text"
                required
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
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
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Nome do Gestor / Aprovador
              </label>
              <input
                type="text"
                value={formData.approverName}
                onChange={(e) =>
                  setFormData({ ...formData, approverName: e.target.value })
                }
                placeholder="Ex: Diretoria Financeira"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Configurações salvas com sucesso!
              </span>
            )}
            <div className="ml-auto">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Informações</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Gerenciamento de Dados & Backup Local */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              Banco de Dados Local & Backup
            </h2>
            <p className="text-xs text-slate-400">
              Seus dados e comprovantes estão salvos localmente no seu navegador via IndexedDB.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Você pode fazer o download de um arquivo JSON completo contendo todos os
          seus registros e imagens de comprovantes para manter como cópia de segurança
          ou transferir para outro computador.
        </p>

        {backupMessage && (
          <div className="p-3 mb-4 rounded-lg bg-slate-900 border border-slate-700 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{backupMessage}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportBackup}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-emerald-400" />
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
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-blue-400" />
            <span>Restaurar Backup (.json)</span>
          </button>
        </div>
      </div>

      {/* Inteligência Artificial Gratuita (OpenRouter.ai) */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">
                  Inteligência Artificial Gratuita (OpenRouter.ai)
                </h2>
                {openRouterKey ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                    Conectado & Ativo
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-medium">
                    Não Conectado
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
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
                className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isConnectingOpenRouter ? 'Conectando...' : 'Conectar com OpenRouter'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDisconnectOpenRouter}
                className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Desconectar Chave</span>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            O OpenRouter permite que cada usuário utilize sua própria cota gratuita de modelos avançados de IA (como <code className="text-emerald-400">google/gemini-2.0-flash-exp:free</code> e <code className="text-emerald-400">meta-llama/llama-3.2-11b-vision-instruct:free</code>) sem custo algum para a plataforma.
          </p>

          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-400">
            <span className="font-semibold text-white block mb-1">Modelos gratuitos configurados:</span>
            <ul className="list-disc list-inside space-y-0.5 font-mono text-[10px] text-emerald-400">
              {FREE_VISION_MODELS.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Instalação do Aplicativo no Computador (PWA) */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Instalar Aplicativo no Computador (PWA)
              </h2>
              <p className="text-xs text-slate-400">
                Transforme esta aplicação em um programa nativo com ícone na Área de Trabalho do Windows.
              </p>
            </div>
          </div>
          <div>
            <PWAInstallButton />
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs text-slate-300 leading-relaxed">
          <p className="font-semibold text-white">
            Como funciona a versão instalável (Progressive Web App):
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
            <li>Abre em uma janela limpa e dedicada, sem a barra de navegação do browser.</li>
            <li>Cria automaticamente um atalho na sua Área de Trabalho e no Menu Iniciar do Windows.</li>
            <li>Funciona 100% offline com persistência local de dados no IndexedDB.</li>
            <li>No Chrome ou Edge, você também pode clicar no ícone de instalação que aparece na barra de endereços (lado direito).</li>
          </ul>
        </div>
      </div>

      {/* Prontidão para Hospedagem no GitHub Pages & Firebase */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              Hospedagem no GitHub Pages (100% Gratuito)
            </h2>
            <p className="text-xs text-slate-400">
              Passo a passo para publicar seu app online no GitHub Pages sem custo algum.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 inline-flex items-center justify-center text-xs font-bold">1</span>
              Como o GitHub Pages funciona com este App?
            </h3>
            <p>
              O GitHub Pages é uma hospedagem <strong>estática</strong> (roda 100% no navegador do usuário). Toda a interface, os cálculos, a exportação de relatórios em PDF, o gerador de Excel (.xlsx) e o banco de dados (IndexedDB) funcionam nativamente sem precisar de servidor.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 inline-flex items-center justify-center text-xs font-bold">2</span>
              Chave da API Gemini (Apenas para o Scanner no GitHub Pages)
            </h3>
            <p>
              Como o GitHub Pages não roda servidor Node.js para guardar segredos, você pode colocar sua própria chave gratuita do Google AI Studio diretamente aqui. Ela fica salva apenas no seu próprio navegador:
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="password"
                placeholder="Cole sua GEMINI_API_KEY aqui (opcional)"
                value={formData.geminiApiKey || ''}
                onChange={(e) =>
                  setFormData({ ...formData, geminiApiKey: e.target.value })
                }
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Salvar Chave
              </button>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 inline-flex items-center justify-center text-xs font-bold">3</span>
              Comandos para publicar no GitHub Pages
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 font-mono text-[11px] bg-slate-950 p-3 rounded border border-slate-800">
              <li>npm run build</li>
              <li># Envie a pasta dist gerada para a branch gh-pages do seu repositório</li>
              <li># No GitHub, vá em Settings &gt; Pages &gt; Source: Deploy from a branch (gh-pages)</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
