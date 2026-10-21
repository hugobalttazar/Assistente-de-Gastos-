import { CorporateExpense, CompanySettings, InvoiceStatement } from '../types/expense';

const DB_NAME = 'AssistenteGastosCorporateDB';
const DB_VERSION = 2;
const STORE_NAME = 'expenses';
const SETTINGS_KEY = 'meu_assessor_company_settings';
const SEED_KEY = 'assistente_gastos_db_seeded_v2';
const BACKUP_KEY = 'assistente_gastos_expenses_backup_v2';

const DEFAULT_SETTINGS: CompanySettings = {
  employeeName: 'Hugo Baltazar',
  employeeRole: 'Gerente Executivo',
  department: 'Operações e Negócios',
  companyName: 'Empresa Corporativa S.A.',
  corporateCardNumber: 'Visa Corporativo final 4022',
  approverName: 'Diretoria Financeira',
  currency: 'BRL',
};

// Abre ou inicializa o banco IndexedDB
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

// Dados de demonstração (carregados APENAS na primeira vez que o app for aberto)
export const SAMPLE_EXPENSES: CorporateExpense[] = [
  {
    id: 'exp-sample-1',
    date: '2026-10-05',
    amount: 142.8,
    merchant: 'Restaurante Fogo de Chão',
    category: 'Alimentação',
    description: 'Almoço de alinhamento com diretoria do cliente parceiro',
    cnpj: '01.234.567/0001-89',
    paymentMethod: 'Visa Corporativo final 4022',
    status: 'conferido',
    createdAt: '2026-10-05T14:30:00.000Z',
    notes: 'Aprovado pelo gestor de contas',
    receipt: {
      name: 'recibo_fogo_de_chao.png',
      type: 'image/svg+xml',
      size: 4200,
      dataUrl:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" fill="%23ffffff"><rect width="400" height="600" fill="%23f8fafc"/><path d="M0,0 L400,0 L400,580 L380,600 L360,580 L340,600 L320,580 L300,600 L280,580 L260,600 L240,580 L220,600 L200,580 L180,600 L160,580 L140,600 L120,580 L100,600 L80,580 L60,600 L40,580 L20,600 L0,580 Z" fill="%23ffffff" stroke="%23cbd5e1"/><text x="200" y="50" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle" fill="%230f172a">FOGO DE CHÃO RESTAURANTE</text><text x="200" y="75" font-family="sans-serif" font-size="11" text-anchor="middle" fill="%2364748b">CNPJ: 01.234.567/0001-89</text><line x1="30" y1="95" x2="370" y2="95" stroke="%23cbd5e1" stroke-dasharray="4"/><text x="30" y="130" font-family="sans-serif" font-size="12" fill="%23334155">DATA: 05/10/2026 13:42</text><text x="30" y="155" font-family="sans-serif" font-size="12" fill="%23334155">DOC FISCAL: NFC-e 048291</text><line x1="30" y1="180" x2="370" y2="180" stroke="%23e2e8f0"/><text x="30" y="215" font-family="sans-serif" font-size="13" font-weight="600" fill="%230f172a">1x ALMOCO EXECUTIVO</text><text x="370" y="215" font-family="sans-serif" font-size="13" font-weight="600" text-anchor="end" fill="%230f172a">R$ 119,00</text><text x="30" y="245" font-family="sans-serif" font-size="13" font-weight="600" fill="%230f172a">1x BEBIDA / AGUA</text><text x="370" y="245" font-family="sans-serif" font-size="13" font-weight="600" text-anchor="end" fill="%230f172a">R$ 10,00</text><text x="30" y="275" font-family="sans-serif" font-size="13" font-weight="600" fill="%230f172a">1x TAXA SERVICO</text><text x="370" y="275" font-family="sans-serif" font-size="13" font-weight="600" text-anchor="end" fill="%230f172a">R$ 13,80</text><line x1="30" y1="310" x2="370" y2="310" stroke="%23cbd5e1" stroke-dasharray="4"/><text x="30" y="350" font-family="sans-serif" font-size="16" font-weight="bold" fill="%230f172a">TOTAL PAGO:</text><text x="370" y="350" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="end" fill="%23059669">R$ 142,80</text><text x="30" y="390" font-family="sans-serif" font-size="12" fill="%2364748b">FORMA PAGAMENTO:</text><text x="370" y="390" font-family="sans-serif" font-size="12" text-anchor="end" fill="%23334155">CARTÃO CORP. VISA (**** 4022)</text></svg>',
    },
  },
  {
    id: 'exp-sample-2',
    date: '2026-10-08',
    amount: 58.45,
    merchant: 'Uber do Brasil Tecnologia',
    category: 'Transporte / Táxi / Uber',
    description: 'Deslocamento aeroporto de Congonhas até sede do cliente',
    cnpj: '17.895.646/0001-87',
    paymentMethod: 'Visa Corporativo final 4022',
    status: 'conferido',
    createdAt: '2026-10-08T09:15:00.000Z',
    notes: 'Recibo eletrônico Uber for Business',
    receipt: {
      name: 'recibo_uber_viagem.png',
      type: 'image/svg+xml',
      size: 3800,
      dataUrl:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" fill="%23ffffff"><rect width="400" height="600" fill="%23000000"/><text x="200" y="60" font-family="sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="%23ffffff">Uber</text><text x="200" y="90" font-family="sans-serif" font-size="13" text-anchor="middle" fill="%23a3a3a3">Recibo de Viagem Corporativa</text><line x1="40" y1="120" x2="360" y2="120" stroke="%23333333"/><text x="40" y="160" font-family="sans-serif" font-size="13" fill="%23e5e5e5">Quinta-feira, 8 de Outubro de 2026</text><text x="40" y="210" font-family="sans-serif" font-size="14" font-weight="600" fill="%23a3a3a3">Preço da Viagem</text><text x="360" y="210" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="end" fill="%2310b981">R$ 58,45</text></svg>',
    },
  },
  {
    id: 'exp-sample-3',
    date: '2026-10-10',
    amount: 195.0,
    merchant: 'Posto Ipiranga Rodofer',
    category: 'Combustível',
    description: 'Abastecimento veículo locado para visita a filial em Campinas',
    cnpj: '04.821.993/0001-12',
    paymentMethod: 'Visa Corporativo final 4022',
    status: 'conferido',
    createdAt: '2026-10-10T11:45:00.000Z',
    notes: 'Gasolina Comum - 33.62 litros',
  },
];

// Helper para ler dados do localStorage de fallback
function getLocalStorageExpenses(): CorporateExpense[] {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Erro ao ler do localStorage:', e);
  }
  return [];
}

// Helper para salvar no localStorage
function saveLocalStorageExpenses(expenses: CorporateExpense[]) {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(expenses));
  } catch (e) {
    console.warn('localStorage cheio para mídias grandes, preservado no IndexedDB:', e);
  }
}

// Obtém todas as despesas armazenadas
export async function getStoredExpenses(): Promise<CorporateExpense[]> {
  const isAlreadySeeded = localStorage.getItem(SEED_KEY) === 'true';

  try {
    const db = await openDB();
    const idbExpenses = await new Promise<CorporateExpense[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    // Se temos itens no IndexedDB, usa eles
    if (idbExpenses && idbExpenses.length > 0) {
      localStorage.setItem(SEED_KEY, 'true');
      saveLocalStorageExpenses(idbExpenses);
      return idbExpenses;
    }

    // Se IndexedDB está vazio mas o usuário JÁ inicializou no passado (apagou tudo de propósito)
    if (isAlreadySeeded) {
      const localBackup = getLocalStorageExpenses();
      return localBackup; // Pode ser vazio [] se o usuário deletou tudo, e NÃO deve repovoar com demonstração!
    }

    // PRIMEIRA EXECUÇÃO ABSOLUTA: Popula os dados de exemplo UMA ÚNICA VEZ
    localStorage.setItem(SEED_KEY, 'true');
    const seeded = [...SAMPLE_EXPENSES];
    await saveAllExpenses(seeded);
    return seeded;
  } catch (err) {
    console.warn('IndexedDB inacessível, utilizando camada localStorage:', err);
    if (!isAlreadySeeded) {
      localStorage.setItem(SEED_KEY, 'true');
      saveLocalStorageExpenses(SAMPLE_EXPENSES);
      return SAMPLE_EXPENSES;
    }
    return getLocalStorageExpenses();
  }
}

// Salva ou atualiza uma despesa individual
export async function saveStoredExpense(expense: CorporateExpense): Promise<void> {
  // Marca como inicializado para nunca mais repovoar com dados de demonstração
  localStorage.setItem(SEED_KEY, 'true');

  // 1. Atualiza imediatamente a camada de contingência localStorage
  const currentList = getLocalStorageExpenses().filter((e) => e.id !== expense.id);
  currentList.unshift(expense);
  saveLocalStorageExpenses(currentList);

  // 2. Salva no banco de alta fidelidade IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(expense);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('Falha gravando no IndexedDB, mantido em localStorage:', e);
  }
}

// Salva uma lista completa de despesas
export async function saveAllExpenses(expenses: CorporateExpense[]): Promise<void> {
  localStorage.setItem(SEED_KEY, 'true');
  saveLocalStorageExpenses(expenses);

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      for (const exp of expenses) {
        store.put(exp);
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.warn('Falha gravando lista no IndexedDB, mantido em localStorage:', e);
  }
}

// Exclui uma despesa pelo ID
export async function deleteStoredExpense(id: string): Promise<void> {
  localStorage.setItem(SEED_KEY, 'true');

  // 1. Remove do localStorage
  const currentList = getLocalStorageExpenses().filter((e) => e.id !== id);
  saveLocalStorageExpenses(currentList);

  // 2. Remove do IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('Falha deletando do IndexedDB, removido do localStorage:', e);
  }
}

// Configurações da Empresa / Usuário
export function getCompanySettings(): CompanySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Erro ao ler configurações:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveCompanySettings(settings: CompanySettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Exporta dados completos para download de backup em arquivo JSON
export async function exportDatabaseBackup(): Promise<string> {
  const expenses = await getStoredExpenses();
  const settings = getCompanySettings();
  const backupObject = {
    exportedAt: new Date().toISOString(),
    version: '2.0',
    app: 'Assistente de Gastos Corporativo',
    settings,
    expenses,
  };
  return JSON.stringify(backupObject, null, 2);
}

// Importa dados de arquivo JSON
export async function importDatabaseBackup(jsonString: string): Promise<number> {
  const parsed = JSON.parse(jsonString);
  if (parsed.settings) {
    saveCompanySettings(parsed.settings);
  }
  if (Array.isArray(parsed.expenses)) {
    await saveAllExpenses(parsed.expenses);
    return parsed.expenses.length;
  }
  throw new Error('Arquivo de backup inválido ou sem lista de despesas.');
}

// ==========================================
// GESTÃO DO CICLO DE FATURAS CORPORATIVAS
// ==========================================
const INVOICES_KEY = 'assistente_gastos_invoices_v1';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function formatMonthName(monthStr: string): string {
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [year, month] = monthStr.split('-');
  const idx = parseInt(month, 10) - 1;
  const name = MONTH_NAMES[idx] || month;
  return `${name}/${year}`;
}

export function getStoredInvoices(): InvoiceStatement[] {
  try {
    const raw = localStorage.getItem(INVOICES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Erro ao ler faturas:', e);
    return [];
  }
}

export function saveStoredInvoices(invoices: InvoiceStatement[]): void {
  try {
    localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
  } catch (e) {
    console.error('Erro ao salvar faturas:', e);
  }
}

export function getInvoiceForMonth(month: string): InvoiceStatement | null {
  const invoices = getStoredInvoices();
  return invoices.find((inv) => inv.month === month) || null;
}

export function closeInvoice(
  month: string,
  expenses: CorporateExpense[],
  notes?: string,
  closedBy?: string
): InvoiceStatement {
  const invoices = getStoredInvoices();
  const existingIdx = invoices.findIndex((inv) => inv.month === month);

  const monthExpenses = expenses.filter((e) => e.date && e.date.startsWith(month));
  const totalAmount = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const invoiceData: InvoiceStatement = {
    id: existingIdx >= 0 ? invoices[existingIdx].id : `fatura_${month}`,
    month,
    title: `Fatura ${formatMonthName(month)}`,
    status: 'fechada',
    closedAt: new Date().toISOString(),
    closedBy: closedBy || 'Hugo Baltazar',
    notes: notes || '',
    totalAmount,
    expensesCount: monthExpenses.length,
    createdAt: existingIdx >= 0 ? invoices[existingIdx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    invoices[existingIdx] = invoiceData;
  } else {
    invoices.unshift(invoiceData);
  }

  saveStoredInvoices(invoices);
  return invoiceData;
}

export function reopenInvoice(month: string): InvoiceStatement {
  const invoices = getStoredInvoices();
  const existingIdx = invoices.findIndex((inv) => inv.month === month);

  if (existingIdx >= 0) {
    invoices[existingIdx] = {
      ...invoices[existingIdx],
      status: 'aberta',
      updatedAt: new Date().toISOString(),
    };
    saveStoredInvoices(invoices);
    return invoices[existingIdx];
  }

  const newOpenInvoice: InvoiceStatement = {
    id: `fatura_${month}`,
    month,
    title: `Fatura ${formatMonthName(month)}`,
    status: 'aberta',
    totalAmount: 0,
    expensesCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  invoices.unshift(newOpenInvoice);
  saveStoredInvoices(invoices);
  return newOpenInvoice;
}

