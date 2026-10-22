import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { CloseInvoiceModal } from './components/CloseInvoiceModal';
import { InvoicesHistoryModal } from './components/InvoicesHistoryModal';
import { CorporateExpense, CompanySettings, InvoiceStatement } from './types/expense';
import {
  getStoredExpenses,
  saveStoredExpense,
  saveAllExpenses,
  deleteStoredExpense,
  getCompanySettings,
  saveCompanySettings,
  getStoredInvoices,
  saveStoredInvoices,
  getInvoiceForMonth,
  closeInvoice,
  reopenInvoice,
  formatMonthName,
} from './utils/storage';
import { initAuth, getAccessToken } from './services/googleAuth';
import {
  DriveSyncInfo,
  loadExpensesFromDrive,
  saveExpensesToDrive,
  syncExpensesWithDrive,
  saveToCloudApi,
  loadFromCloudApi,
} from './services/googleDriveStorage';
import { getLocalLeadProfile, fetchAllLeads, LeadRegistration } from './services/leadsService';
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
  const expensesRef = useRef<CorporateExpense[]>(expenses);
  useEffect(() => {
    expensesRef.current = expenses;
  }, [expenses]);

  const [settings, setSettings] = useState<CompanySettings>(getCompanySettings());
  const settingsRef = useRef<CompanySettings>(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const [isLoading, setIsLoading] = useState(true);

  // Estados de Usuário e Google Drive
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState<DriveSyncInfo | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const [syncNotification, setSyncNotification] = useState<string | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<Date | null>(null);
  const [secondsUntilSync, setSecondsUntilSync] = useState<number>(60);

  // Modais
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<CorporateExpense | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isAdminLeadsModalOpen, setIsAdminLeadsModalOpen] = useState(false);

  // Estados de Gestão de Faturas Corporativas
  const [invoices, setInvoices] = useState<InvoiceStatement[]>(() => getStoredInvoices());
  const invoicesRef = useRef<InvoiceStatement[]>(invoices);
  useEffect(() => {
    invoicesRef.current = invoices;
  }, [invoices]);

  const [isCloseInvoiceModalOpen, setIsCloseInvoiceModalOpen] = useState(false);
  const [isInvoicesHistoryModalOpen, setIsInvoicesHistoryModalOpen] = useState(false);
  const [targetMonthForClosing, setTargetMonthForClosing] = useState<string>(selectedMonth);

  const currentInvoice = invoices.find((inv) => inv.month === selectedMonth) || null;

  // Notificação temporária de sincronização
  const flashNotification = useCallback((msg: string) => {
    setSyncNotification(msg);
    setTimeout(() => {
      setSyncNotification(null);
    }, 4000);
  }, []);

  // Envio imediato das alterações para a Nuvem Central e Google Drive
  const triggerDriveSync = async (
    targetExpenses: CorporateExpense[],
    targetInvoices: InvoiceStatement[],
    targetSettings: CompanySettings
  ) => {
    // 1. Grava na Nuvem Central imediatamente para sincronizar instantaneamente entre celular e PC
    const userKey = userRef.current?.email || localStorage.getItem('meu_assessor_last_user_email') || 'default';
    saveToCloudApi(userKey, targetExpenses, targetInvoices, targetSettings);

    // 2. Grava no Google Drive (JSON + Relatório Google Docs formatado)
    const token = accessToken || (await getAccessToken());
    if (token) {
      try {
        const info = await saveExpensesToDrive(token, targetExpenses, targetInvoices, targetSettings);
        setSyncInfo(info);
        setLastSyncedTime(new Date());
      } catch (e: any) {
        console.warn('Erro ao sincronizar dados com o Google Drive:', e);
      }
    }
  };

  const handleRequestCloseInvoice = (month?: string) => {
    setTargetMonthForClosing(month || selectedMonth);
    setIsCloseInvoiceModalOpen(true);
  };

  const handleConfirmCloseInvoice = (notes: string) => {
    closeInvoice(targetMonthForClosing, expensesRef.current, notes, user?.displayName || settingsRef.current.employeeName);
    const updatedInvoices = getStoredInvoices();
    setInvoices(updatedInvoices);
    invoicesRef.current = updatedInvoices;
    setIsCloseInvoiceModalOpen(false);
    flashNotification(`Fatura de ${formatMonthName(targetMonthForClosing)} fechada com sucesso!`);
    triggerDriveSync(expensesRef.current, updatedInvoices, settingsRef.current);
  };

  const handleReopenInvoice = (month?: string) => {
    const m = month || selectedMonth;
    reopenInvoice(m);
    const updatedInvoices = getStoredInvoices();
    setInvoices(updatedInvoices);
    invoicesRef.current = updatedInvoices;
    flashNotification(`Fatura de ${formatMonthName(m)} reaberta para edição.`);
    triggerDriveSync(expensesRef.current, updatedInvoices, settingsRef.current);
  };

  const handleUpdateSettings = (newSettings: CompanySettings) => {
    setSettings(newSettings);
    settingsRef.current = newSettings;
    saveCompanySettings(newSettings);
    triggerDriveSync(expensesRef.current, invoicesRef.current, newSettings);
  };

  // Carrega despesas locais e nuvem ao montar
  useEffect(() => {
    loadLocalData();
  }, []);

  const loadLocalData = async () => {
    try {
      setIsLoading(true);
      // 1. Carrega dados do cache local offline
      const data = await getStoredExpenses();
      setExpenses(data);
      expensesRef.current = data;
      const savedSettings = getCompanySettings();
      setSettings(savedSettings);
      settingsRef.current = savedSettings;

      // 2. Se houver usuário salvo anteriormente, puxa imediatamente da Nuvem Central
      const lastEmail = localStorage.getItem('meu_assessor_last_user_email');
      if (lastEmail) {
        const cloudData = await loadFromCloudApi(lastEmail);
        if (cloudData && cloudData.exists) {
          if (cloudData.expenses) {
            setExpenses(cloudData.expenses);
            expensesRef.current = cloudData.expenses;
            await saveAllExpenses(cloudData.expenses);
          }
          if (cloudData.invoices) {
            setInvoices(cloudData.invoices);
            invoicesRef.current = cloudData.invoices;
            saveStoredInvoices(cloudData.invoices);
          }
          if (cloudData.settings) {
            setSettings(cloudData.settings);
            settingsRef.current = cloudData.settings;
            saveCompanySettings(cloudData.settings);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
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
  }, [flashNotification]);

  // Sincroniza dados com a pasta 'Assistente de Gastos' do Google Drive
  const syncFromDrive = useCallback(async (token: string, isSilent = false) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const result = await syncExpensesWithDrive(
        token,
        expensesRef.current,
        invoicesRef.current,
        settingsRef.current
      );
      setSyncInfo(result.syncInfo);
      setLastSyncedTime(new Date());

      if (result.updatedLocal) {
        if (result.expenses) {
          setExpenses(result.expenses);
          expensesRef.current = result.expenses;
          await saveAllExpenses(result.expenses);
        }
        if (result.invoices) {
          setInvoices(result.invoices);
          invoicesRef.current = result.invoices;
          saveStoredInvoices(result.invoices);
        }
        if (result.settings) {
          setSettings(result.settings);
          settingsRef.current = result.settings;
          saveCompanySettings(result.settings);
        }
      }

      if (!isSilent) {
        flashNotification('Sincronizado com a nuvem do Google Drive!');
      }
    } catch (err: any) {
      console.warn('Falha na sincronização com Google Drive:', err);
      if (err?.code === 'AUTH_EXPIRED') {
        setAccessToken(null);
        if (!isSilent) {
          flashNotification('Sessão do Google Drive expirada. Clique em Realizar Login para reconectar.');
        }
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
      setSecondsUntilSync(60);
    }
  }, [flashNotification]);

  // Inicializa a autenticação Google e sincronização com Google Drive
  useEffect(() => {
    const unsubscribe = initAuth(
      async (authUser, token) => {
        setUser(authUser);
        if (authUser?.email) {
          localStorage.setItem('meu_assessor_last_user_email', authUser.email);
        }
        const currentToken = token || (await getAccessToken());
        if (currentToken) {
          setAccessToken(currentToken);
          checkLeadAndSync(authUser, currentToken);
        } else if (authUser?.email) {
          // Mesmo se o token OAuth do Drive ainda não estiver ativo, carrega os dados da Nuvem Central
          const cloudData = await loadFromCloudApi(authUser.email);
          if (cloudData && cloudData.exists) {
            if (cloudData.expenses) {
              setExpenses(cloudData.expenses);
              expensesRef.current = cloudData.expenses;
              await saveAllExpenses(cloudData.expenses);
            }
            if (cloudData.invoices) {
              setInvoices(cloudData.invoices);
              invoicesRef.current = cloudData.invoices;
              saveStoredInvoices(cloudData.invoices);
            }
            if (cloudData.settings) {
              setSettings(cloudData.settings);
              settingsRef.current = cloudData.settings;
              saveCompanySettings(cloudData.settings);
            }
          }
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

  // Verifica o lead e sincroniza Nuvem e Drive
  const checkLeadAndSync = async (authUser: User, token: string) => {
    if (authUser.email) {
      localStorage.setItem('meu_assessor_last_user_email', authUser.email);
      // Puxa instantaneamente da Nuvem Central primeiro para evitar delay
      try {
        const cloudData = await loadFromCloudApi(authUser.email);
        if (cloudData && cloudData.exists) {
          if (cloudData.expenses) {
            setExpenses(cloudData.expenses);
            expensesRef.current = cloudData.expenses;
            await saveAllExpenses(cloudData.expenses);
          }
          if (cloudData.invoices) {
            setInvoices(cloudData.invoices);
            invoicesRef.current = cloudData.invoices;
            saveStoredInvoices(cloudData.invoices);
          }
          if (cloudData.settings) {
            setSettings(cloudData.settings);
            settingsRef.current = cloudData.settings;
            saveCompanySettings(cloudData.settings);
          }
        }
      } catch (e) {
        console.warn('Aviso: falha na recuperação rápida cloud-sync:', e);
      }
    }

    // 1. SEMPRE sincroniza o Drive (atualiza banco JSON e Documento Google Docs na pasta do Drive)
    await syncFromDrive(token, false);

    // 2. Verifica se o usuário já possui cadastro
    const lead = getLocalLeadProfile();
    if (!lead || !lead.phone || !lead.consentAccepted) {
      try {
        const leads = await fetchAllLeads();
        const found = leads.find((l) => l.email?.toLowerCase() === authUser.email?.toLowerCase());
        if (found && found.phone && found.consentAccepted) {
          localStorage.setItem('meu_assessor_lead_profile', JSON.stringify(found));
          return;
        }
      } catch (err) {
        console.warn('Erro ao consultar leads salvos:', err);
      }
      setIsLeadModalOpen(true);
    }
  };

  // Sincronização automática constante a cada 1 minuto (60 segundos)
  useEffect(() => {
    if (!user) return;

    const runSync = async () => {
      const token = accessToken || (await getAccessToken());
      if (!token || isSyncingRef.current) return;
      await syncFromDrive(token, true);
    };

    // Sincroniza imediatamente na primeira vez
    runSync();

    // Contador regressivo de 60 segundos
    const countdownInterval = setInterval(() => {
      setSecondsUntilSync((prev) => {
        if (prev <= 1) {
          runSync();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    // Re-sincronização imediata ao retornar para a aba (ex: editou no celular ou outro computador)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runSync();
        setSecondsUntilSync(60);
      }
    };

    const handleWindowFocus = () => {
      runSync();
      setSecondsUntilSync(60);
    };

    const handleOnline = () => {
      runSync();
      setSecondsUntilSync(60);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(countdownInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [user, accessToken, syncFromDrive]);

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
      await syncFromDrive(token, false);
    }
  };

  // Sincronização manual acionada pelo usuário
  const handleManualSync = async () => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      flashNotification('Conecte sua conta Google para sincronizar.');
      return;
    }
    await syncFromDrive(token, false);
  };

  // Salvar nova despesa (grava localmente e no Google Drive)
  const handleSaveExpense = async (newExpense: CorporateExpense) => {
    const withTimestamp: CorporateExpense = {
      ...newExpense,
      updatedAt: new Date().toISOString(),
    };

    await saveStoredExpense(withTimestamp);
    const updatedExpenses = [withTimestamp, ...expenses.filter((e) => e.id !== withTimestamp.id)];
    setExpenses(updatedExpenses);
    expensesRef.current = updatedExpenses;

    if (withTimestamp.date && withTimestamp.date.length >= 7) {
      setSelectedMonth(withTimestamp.date.substring(0, 7));
    }

    triggerDriveSync(updatedExpenses, invoicesRef.current, settingsRef.current);
  };

  // Atualizar despesa existente (grava localmente e no Google Drive)
  const handleUpdateExpense = async (updatedExpense: CorporateExpense) => {
    const withTimestamp: CorporateExpense = {
      ...updatedExpense,
      updatedAt: new Date().toISOString(),
    };

    await saveStoredExpense(withTimestamp);
    const updatedExpenses = expenses.map((e) =>
      e.id === withTimestamp.id ? withTimestamp : e
    );
    setExpenses(updatedExpenses);
    expensesRef.current = updatedExpenses;

    triggerDriveSync(updatedExpenses, invoicesRef.current, settingsRef.current);
  };

  // Excluir despesa (remove localmente e atualiza Google Drive)
  const handleDeleteExpense = async (id: string) => {
    await deleteStoredExpense(id);
    const updatedExpenses = expenses.filter((e) => e.id !== id);
    setExpenses(updatedExpenses);
    expensesRef.current = updatedExpenses;

    triggerDriveSync(updatedExpenses, invoicesRef.current, settingsRef.current);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-500 transition-colors duration-200">
      {/* Barra de Notificação de Sincronização */}
      {syncNotification && (
        <div className="bg-emerald-500 text-slate-950 font-semibold text-xs py-1.5 px-4 text-center z-50 animate-in fade-in slide-in-from-top-1 flex items-center justify-center gap-2 shadow-md">
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
        lastSyncedTime={lastSyncedTime}
        secondsUntilSync={secondsUntilSync}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        onManualSync={handleManualSync}
        onOpenLeadsModal={() => setIsAdminLeadsModalOpen(true)}
        invoiceStatus={currentInvoice}
        onOpenInvoicesHistory={() => setIsInvoicesHistoryModalOpen(true)}
        onRequestCloseInvoice={() => handleRequestCloseInvoice()}
        onReopenInvoice={() => handleReopenInvoice()}
      />

      {/* Conteúdo Principal com espaço para Bottom Nav no Mobile e alinhamento em esquadro */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">Carregando painel financeiro...</p>
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
                invoiceStatus={currentInvoice}
                onRequestCloseInvoice={() => handleRequestCloseInvoice()}
                onReopenInvoice={() => handleReopenInvoice()}
                onOpenInvoicesHistory={() => setIsInvoicesHistoryModalOpen(true)}
                user={user}
                syncInfo={syncInfo}
                onLoginSuccess={handleLoginSuccess}
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
                invoiceStatus={currentInvoice}
                onRequestCloseInvoice={() => handleRequestCloseInvoice()}
                onReopenInvoice={() => handleReopenInvoice()}
                onOpenInvoicesHistory={() => setIsInvoicesHistoryModalOpen(true)}
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
                onUpdateSettings={handleUpdateSettings}
                onRefreshData={loadLocalData}
              />
            )}
          </>
        )}
      </main>

      {/* Rodapé Executivo Mínimo com suporte a modo claro/escuro e margem mobile */}
      <footer className="print:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070A10] py-6 text-xs text-slate-500 mb-16 md:mb-0 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Assistente de Gastos</span>
            <span aria-hidden="true">·</span>
            <span>Gestão & Prestação de Contas de Cartão Corporativo</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>
              {user ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Google Drive Privado: /Assistente de Gastos
                </span>
              ) : (
                'Armazenamento em Nuvem (Google Drive & Central)'
              )}
            </span>
            <span aria-hidden="true">·</span>
            <span>Leitura Multimodal via Gemini IA</span>
          </div>
        </div>
      </footer>

      {/* Modal de Fechamento de Fatura */}
      <CloseInvoiceModal
        isOpen={isCloseInvoiceModalOpen}
        month={targetMonthForClosing}
        expenses={expenses}
        onConfirmClose={handleConfirmCloseInvoice}
        onClose={() => setIsCloseInvoiceModalOpen(false)}
      />

      {/* Modal de Histórico e Gestão de Faturas */}
      <InvoicesHistoryModal
        isOpen={isInvoicesHistoryModalOpen}
        invoices={invoices}
        expenses={expenses}
        settings={settings}
        currentSelectedMonth={selectedMonth}
        onSelectMonth={(month) => setSelectedMonth(month)}
        onReopenInvoice={handleReopenInvoice}
        onRequestCloseInvoice={(month) => handleRequestCloseInvoice(month)}
        onClose={() => setIsInvoicesHistoryModalOpen(false)}
      />

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
