import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ExpenseTableView } from './components/ExpenseTableView';
import { MonthlyReportView } from './components/MonthlyReportView';
import { SettingsView } from './components/SettingsView';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { ReceiptViewerModal } from './components/ReceiptViewerModal';
import { LeadRegistrationModal } from './components/LeadRegistrationModal';
import { AdminLeadsModal } from './components/AdminLeadsModal';
import { CorporateExpense, CompanySettings } from './types/expense';
import {
  getStoredExpenses,
  saveStoredExpense,
  deleteStoredExpense,
  getCompanySettings,
} from './utils/storage';
import { initAuth, getAccessToken } from './services/googleAuth';
import {
  DriveSyncInfo,
  loadExpensesFromDrive,
  saveExpensesToDrive,
} from './services/googleDriveStorage';
import { getLocalLeadProfile, LeadRegistration } from './services/leadsService';
import { exchangeCodeForApiKey } from './services/openRouterService';

export default function App() {
  const [currentTab, setCurrentTab] = useState<
    'dashboard' | 'table' | 'report' | 'settings'
  >('dashboard');

  // Mês de competência selecionado (padrão: mês atual YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const [expenses, setExpenses] = useState<CorporateExpense[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(getCompanySettings());
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Usuário e Google Drive
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState<DriveSyncInfo | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotification, setSyncNotification] = useState<string | null>(null);

  // Modais
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<CorporateExpense | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isAdminLeadsModalOpen, setIsAdminLeadsModalOpen] = useState(false);

  // Carrega despesas locais ao montar
  useEffect(() => {
    loadLocalData();
  }, []);

  const loadLocalData = async () => {
    try {
      setIsLoading(true);
      const data = await getStoredExpenses();
      setExpenses(data);
      const savedSettings = getCompanySettings();
      setSettings(savedSettings);
    } catch (err) {
      console.error('Erro ao carregar dados locais:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Captura automática de autorização do OpenRouter (via redirect ou popup)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const openRouterCode = urlParams.get('code');
    if (openRouterCode) {
      exchangeCodeForApiKey(openRouterCode)
        .then((key) => {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          flashNotification('IA Gratuita do OpenRouter conectada com sucesso!');

          if (window.opener) {
            window.opener.postMessage({ type: 'OPENROUTER_KEY_OBTAINED', key }, '*');
            window.close();
          }
        })
        .catch((err) => {
          console.error('Falha ao processar autorização do OpenRouter:', err);
        });
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OPENROUTER_KEY_OBTAINED') {
        flashNotification('IA Gratuita do OpenRouter conectada e pronta para uso!');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Inicializa a autenticação Google e sincronização com Google Drive
  useEffect(() => {
    const unsubscribe = initAuth(
      async (authUser, token) => {
        setUser(authUser);
        if (token) {
          setAccessToken(token);
          checkLeadAndSync(authUser, token);
        }
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setSyncInfo(null);
      }
    );

    return () => unsubscribe();
  }, []);

  // Verifica se o lead já completou o cadastro e termo de consentimento
  const checkLeadAndSync = async (authUser: User, token: string) => {
    const lead = getLocalLeadProfile();
    if (!lead || !lead.phone || !lead.consentAccepted) {
      setIsLeadModalOpen(true);
    } else {
      await syncFromDrive(token);
    }
  };

  // Sincroniza dados a partir da pasta 'Assistente de Gastos' do Google Drive
  const syncFromDrive = async (token: string) => {
    setIsSyncing(true);
    try {
      const driveData = await loadExpensesFromDrive(token);
      if (driveData) {
        setSyncInfo(driveData.syncInfo);
        if (driveData.expenses && driveData.expenses.length > 0) {
          // Mescla despesas do Drive com as locais
          setExpenses(driveData.expenses);
          for (const exp of driveData.expenses) {
            await saveStoredExpense(exp);
          }
          flashNotification('Sincronizado com a pasta Assistente de Gastos no Google Drive!');
        } else {
          // Se o arquivo do Drive for novo ou vazio, sobe os dados locais atuais
          const localData = await getStoredExpenses();
          if (localData.length > 0) {
            await saveExpensesToDrive(token, localData);
            flashNotification('Despesas salvas na sua nova pasta do Google Drive!');
          }
        }
      }
    } catch (err) {
      console.warn('Falha na sincronização inicial com Google Drive:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Notificação temporária de sincronização
  const flashNotification = (msg: string) => {
    setSyncNotification(msg);
    setTimeout(() => {
      setSyncNotification(null);
    }, 4000);
  };

  // Login com Google bem-sucedido
  const handleLoginSuccess = async (authUser: User, token: string) => {
    setUser(authUser);
    setAccessToken(token);
    await checkLeadAndSync(authUser, token);
  };

  // Desconexão
  const handleLogout = () => {
    setUser(null);
    setAccessToken(null);
    setSyncInfo(null);
    flashNotification('Conta desconectada.');
  };

  // Cadastro de lead concluído com consentimento
  const handleLeadSuccess = async (lead: LeadRegistration) => {
    setIsLeadModalOpen(false);
    flashNotification('Cadastro concluído com sucesso!');
    const token = accessToken || (await getAccessToken());
    if (token) {
      await syncFromDrive(token);
    }
  };

  // Sincronização manual acionada pelo usuário
  const handleManualSync = async () => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      flashNotification('Conecte sua conta Google para sincronizar.');
      return;
    }
    setIsSyncing(true);
    try {
      const updatedSync = await saveExpensesToDrive(token, expenses);
      setSyncInfo(updatedSync);
      flashNotification('Todas as despesas foram salvas no seu Google Drive!');
    } catch (err: any) {
      flashNotification('Erro ao salvar no Google Drive: ' + (err.message || 'Tente novamente.'));
    } finally {
      setIsSyncing(false);
    }
  };

  // Salvar nova despesa (grava localmente e no Google Drive)
  const handleSaveExpense = async (newExpense: CorporateExpense) => {
    await saveStoredExpense(newExpense);
    const updatedExpenses = [newExpense, ...expenses.filter((e) => e.id !== newExpense.id)];
    setExpenses(updatedExpenses);

    if (newExpense.date && newExpense.date.length >= 7) {
      setSelectedMonth(newExpense.date.substring(0, 7));
    }

    // Grava automaticamente no Google Drive se autenticado
    const token = accessToken || (await getAccessToken());
    if (token) {
      saveExpensesToDrive(token, updatedExpenses)
        .then((info) => setSyncInfo(info))
        .catch((e) => console.warn('Erro ao sincronizar despesa no Drive:', e));
    }
  };

  // Atualizar despesa existente (grava localmente e no Google Drive)
  const handleUpdateExpense = async (updatedExpense: CorporateExpense) => {
    await saveStoredExpense(updatedExpense);
    const updatedExpenses = expenses.map((e) =>
      e.id === updatedExpense.id ? updatedExpense : e
    );
    setExpenses(updatedExpenses);

    const token = accessToken || (await getAccessToken());
    if (token) {
      saveExpensesToDrive(token, updatedExpenses)
        .then((info) => setSyncInfo(info))
        .catch((e) => console.warn('Erro ao atualizar despesa no Drive:', e));
    }
  };

  // Excluir despesa (remove localmente e atualiza Google Drive)
  const handleDeleteExpense = async (id: string) => {
    await deleteStoredExpense(id);
    const updatedExpenses = expenses.filter((e) => e.id !== id);
    setExpenses(updatedExpenses);

    const token = accessToken || (await getAccessToken());
    if (token) {
      saveExpensesToDrive(token, updatedExpenses)
        .then((info) => setSyncInfo(info))
        .catch((e) => console.warn('Erro ao remover despesa no Drive:', e));
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Barra de Notificação de Sincronização */}
      {syncNotification && (
        <div className="bg-emerald-500/90 text-slate-950 font-semibold text-xs py-1.5 px-4 text-center z-50 animate-in fade-in slide-in-from-top-1 flex items-center justify-center gap-2 shadow-md">
          <span>{syncNotification}</span>
        </div>
      )}

      {/* Barra de Navegação Principal */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenScanner={() => setIsScannerOpen(true)}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        user={user}
        syncInfo={syncInfo}
        isSyncing={isSyncing}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        onManualSync={handleManualSync}
        onOpenLeadsModal={() => setIsAdminLeadsModalOpen(true)}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-mono">Carregando painel financeiro...</p>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                expenses={expenses}
                selectedMonth={selectedMonth}
                onOpenScanner={() => setIsScannerOpen(true)}
                onSelectTab={setCurrentTab}
                onViewExpense={(exp) => setViewingExpense(exp)}
              />
            )}

            {currentTab === 'table' && (
              <ExpenseTableView
                expenses={expenses}
                selectedMonth={selectedMonth}
                onOpenScanner={() => setIsScannerOpen(true)}
                onViewExpense={(exp) => setViewingExpense(exp)}
                onUpdateExpense={handleUpdateExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {currentTab === 'report' && (
              <MonthlyReportView
                expenses={expenses}
                settings={settings}
                selectedMonth={selectedMonth}
                onViewExpense={(exp) => setViewingExpense(exp)}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                settings={settings}
                onUpdateSettings={setSettings}
                onRefreshData={loadLocalData}
              />
            )}
          </>
        )}
      </main>

      {/* Rodapé Executivo Mínimo */}
      <footer className="print:hidden border-t border-slate-900 bg-[#070A10] py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Assistente de Gastos</span>
            <span aria-hidden="true">·</span>
            <span>Gestão & Prestação de Contas de Cartão Corporativo</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>
              {user ? (
                <span className="text-emerald-400">
                  Google Drive Privado: /Assistente de Gastos
                </span>
              ) : (
                'Armazenamento Seguro Local (IndexedDB)'
              )}
            </span>
            <span aria-hidden="true">·</span>
            <span>Leitura Multimodal via Gemini IA</span>
          </div>
        </div>
      </footer>

      {/* Modal de Digitalização & Extração com Gemini */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSaveExpense={handleSaveExpense}
        selectedMonth={selectedMonth}
        defaultCardNumber={settings.corporateCardNumber}
      />

      {/* Modal de Visualização de Comprovante em Alta Resolução */}
      <ReceiptViewerModal
        expense={viewingExpense}
        onClose={() => setViewingExpense(null)}
      />

      {/* Modal de Cadastro de Lead & Consentimento de Termos */}
      {user && (
        <LeadRegistrationModal
          isOpen={isLeadModalOpen}
          user={user}
          onSuccess={handleLeadSuccess}
          onCancel={() => setIsLeadModalOpen(false)}
        />
      )}

      {/* Painel Administrativo de Leads (Exclusivo Criador) */}
      <AdminLeadsModal
        isOpen={isAdminLeadsModalOpen}
        onClose={() => setIsAdminLeadsModalOpen(false)}
      />
    </div>
  );
}
