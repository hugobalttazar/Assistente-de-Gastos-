import { CorporateExpense, CompanySettings, InvoiceStatement } from '../types/expense';

const DB_NAME = 'AssistenteGastosCorporateDB';
const DB_VERSION = 2;
const STORE_NAME = 'expenses';
const SETTINGS_KEY = 'meu_assessor_company_settings';
const BACKUP_KEY = 'assistente_gastos_expenses_backup_v2';
const INVOICES_STORAGE_KEY = 'assistente_gastos_invoices_v1';

const DEFAULT_SETTINGS: CompanySettings = {
  employeeName: 'Hugo Baltazar',
  employeeRole: 'Gerente Executivo',
  department: 'Operações e Negócios',
  companyName: 'Empresa Corporativa S.A.',
  corporateCardNumber: 'Visa Corporativo final 4022',
  approverName: 'Diretoria Financeira',
  currency: 'BRL',
};

// Abre ou inicializa o banco IndexedDB (apenas para cache offline transitório)
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste navegador'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Helper para ler dados do cache de contingência
function getLocalStorageExpenses(): CorporateExpense[] {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Remove qualquer resquício de dados de demonstração
      return Array.isArray(parsed) ? parsed.filter((e) => !e.id?.startsWith('exp-sample-')) : [];
    }
  } catch (e) {
    console.warn('Erro ao ler cache local:', e);
  }
  return [];
}

// Helper para salvar no cache de contingência
function saveLocalStorageExpenses(expenses: CorporateExpense[]) {
  try {
    // Nunca persiste dados de amostra
    const clean = expenses.filter((e) => !e.id?.startsWith('exp-sample-'));
    localStorage.setItem(BACKUP_KEY, JSON.stringify(clean));
  } catch (e) {
    console.warn('Aviso ao atualizar cache local:', e);
  }
}

/**
 * Obtém todas as despesas armazenadas no cache local.
 * IMPORTANTE: Nunca mais injeta dados falsos/amostra.
 * A fonte real da verdade é 100% a NUVEM.
 */
export async function getStoredExpenses(): Promise<CorporateExpense[]> {
  try {
    const db = await openDB();
    const idbExpenses = await new Promise<CorporateExpense[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    if (idbExpenses && idbExpenses.length > 0) {
      // Filtra qualquer despesa de teste residual
      const clean = idbExpenses.filter((e) => !e.id?.startsWith('exp-sample-'));
      return clean;
    }

    return getLocalStorageExpenses();
  } catch (err) {
    return getLocalStorageExpenses();
  }
}

// Salva ou atualiza uma despesa individual no cache
export async function saveStoredExpense(expense: CorporateExpense): Promise<void> {
  const currentList = getLocalStorageExpenses().filter((e) => e.id !== expense.id);
  currentList.unshift(expense);
  saveLocalStorageExpenses(currentList);

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(expense);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Cache IndexedDB inacessível:', err);
  }
}

// Substitui todo o cache pelas despesas vindas da Nuvem
export async function saveAllExpenses(expenses: CorporateExpense[]): Promise<void> {
  // Limpa despesas falsas de teste
  const cleanExpenses = expenses.filter((e) => !e.id?.startsWith('exp-sample-'));
  saveLocalStorageExpenses(cleanExpenses);

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        if (cleanExpenses.length === 0) {
          resolve();
          return;
        }

        let completed = 0;
        let hasError = false;

        for (const exp of cleanExpenses) {
          const putReq = store.put(exp);
          putReq.onsuccess = () => {
            completed++;
            if (completed === cleanExpenses.length && !hasError) {
              resolve();
            }
          };
          putReq.onerror = (e) => {
            hasError = true;
            reject(e);
          };
        }
      };

      clearReq.onerror = () => reject(clearReq.error);
    });
  } catch (err) {
    console.warn('Erro ao atualizar cache local com dados da nuvem:', err);
  }
}

// Exclui uma despesa pelo ID
export async function deleteStoredExpense(id: string): Promise<void> {
  const currentList = getLocalStorageExpenses().filter((e) => e.id !== id);
  saveLocalStorageExpenses(currentList);

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Erro ao excluir do cache local:', err);
  }
}

// Limpa completamente quaisquer dados residuais de exemplo do navegador
export async function clearAllLocalSampleData(): Promise<void> {
  try {
    localStorage.removeItem('assistente_gastos_db_seeded_v2');
    const expenses = await getStoredExpenses();
    const realExpenses = expenses.filter((e) => !e.id?.startsWith('exp-sample-'));
    await saveAllExpenses(realExpenses);
  } catch {
    // ignore
  }
}

// Lê configurações corporativas
export function getCompanySettings(): CompanySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Erro ao ler configurações:', e);
  }
  return DEFAULT_SETTINGS;
}

// Salva configurações corporativas
export function saveCompanySettings(settings: CompanySettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Erro ao salvar configurações:', e);
  }
}

// Exporta backup completo em JSON
export async function exportDatabaseBackup(): Promise<string> {
  const expenses = await getStoredExpenses();
  const settings = getCompanySettings();
  const invoices = getStoredInvoices();

  const backupData = {
    version: 3,
    exportedAt: new Date().toISOString(),
    totalExpenses: expenses.length,
    settings,
    invoices,
    expenses,
  };

  return JSON.stringify(backupData, null, 2);
}

// Importa backup a partir de JSON
export async function importDatabaseBackup(jsonString: string): Promise<number> {
  try {
    const data = JSON.parse(jsonString);
    let importedExpenses: CorporateExpense[] = [];

    if (Array.isArray(data)) {
      importedExpenses = data;
    } else if (data.expenses && Array.isArray(data.expenses)) {
      importedExpenses = data.expenses;
      if (data.settings) {
        saveCompanySettings(data.settings);
      }
      if (data.invoices && Array.isArray(data.invoices)) {
        saveStoredInvoices(data.invoices);
      }
    } else {
      throw new Error('Formato de backup inválido.');
    }

    await saveAllExpenses(importedExpenses);
    return importedExpenses.length;
  } catch (err: any) {
    throw new Error(`Falha ao restaurar backup: ${err.message || 'Arquivo corrompido'}`);
  }
}

// Lê o histórico de faturas
export function getStoredInvoices(): InvoiceStatement[] {
  try {
    const raw = localStorage.getItem(INVOICES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Erro ao ler histórico de faturas:', err);
  }
  return [];
}

// Salva o histórico de faturas
export function saveStoredInvoices(invoices: InvoiceStatement[]): void {
  try {
    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(invoices));
  } catch (err) {
    console.warn('Erro ao salvar histórico de faturas:', err);
  }
}

// Obtém os dados da fatura para um mês específico
export function getInvoiceForMonth(month: string): InvoiceStatement | null {
  const invoices = getStoredInvoices();
  return invoices.find((inv) => inv.month === month) || null;
}

// Formata o nome do mês (ex: 2026-10 -> Outubro de 2026)
export function formatMonthName(monthStr: string): string {
  try {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const formatted = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return monthStr;
  }
}

// Fecha a fatura de um mês
export function closeInvoice(
  month: string,
  expenses: CorporateExpense[],
  notes?: string,
  closedBy?: string
): InvoiceStatement {
  const invoices = getStoredInvoices();
  const monthExpenses = expenses.filter((e) => e.date && e.date.startsWith(month));
  const totalAmount = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const existingIndex = invoices.findIndex((inv) => inv.month === month);

  const newInvoice: InvoiceStatement = {
    id: existingIndex >= 0 ? invoices[existingIndex].id : `fatura_${month}_${Date.now()}`,
    month,
    title: `Fatura ${formatMonthName(month)}`,
    status: 'fechada',
    totalAmount,
    expensesCount: monthExpenses.length,
    closedAt: new Date().toISOString(),
    closedBy: closedBy || 'Colaborador',
    notes: notes || undefined,
    createdAt: existingIndex >= 0 ? invoices[existingIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    invoices[existingIndex] = newInvoice;
  } else {
    invoices.push(newInvoice);
  }

  saveStoredInvoices(invoices);
  return newInvoice;
}

// Reabre a fatura de um mês
export function reopenInvoice(month: string): InvoiceStatement | null {
  const invoices = getStoredInvoices();
  const existingIndex = invoices.findIndex((inv) => inv.month === month);

  if (existingIndex >= 0) {
    invoices[existingIndex] = {
      ...invoices[existingIndex],
      status: 'aberta',
      updatedAt: new Date().toISOString(),
    };
    saveStoredInvoices(invoices);
    return invoices[existingIndex];
  }

  return null;
}
