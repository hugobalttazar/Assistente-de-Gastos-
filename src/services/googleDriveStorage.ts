import { CorporateExpense, CompanySettings, InvoiceStatement } from '../types/expense';
import { clearPersistedAccessToken } from './googleAuth';

const FOLDER_NAME = 'Assistente de Gastos';
const DB_FILE_NAME = 'banco_de_dados_despesas.json';

export interface DriveSyncInfo {
  folderId: string;
  fileId: string;
  folderUrl: string;
  lastSynced: string;
}

export interface DriveDatabasePayload {
  version: number;
  updatedAt: string;
  totalExpenses: number;
  expenses: CorporateExpense[];
  invoices?: InvoiceStatement[];
  settings?: CompanySettings;
}

function handleAuthError(status: number) {
  if (status === 401) {
    clearPersistedAccessToken();
    const err = new Error('Sessão do Google Drive expirada. Por favor, reconecte sua conta.');
    (err as any).code = 'AUTH_EXPIRED';
    throw err;
  }
}

/**
 * Busca ou cria a pasta 'Assistente de Gastos' na raiz do Google Drive do usuário
 */
export async function getOrCreateAppFolder(accessToken: string): Promise<{ folderId: string; folderUrl: string }> {
  // 1. Busca se a pasta já existe
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  )}&fields=files(id, name, webViewLink)&orderBy=createdTime desc`;

  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  handleAuthError(searchRes.status);

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Falha ao consultar pasta no Google Drive: ${errText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const existing = searchData.files[0];
    return {
      folderId: existing.id,
      folderUrl: existing.webViewLink || `https://drive.google.com/drive/folders/${existing.id}`,
    };
  }

  // 2. Se não existir, cria a pasta na raiz
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Pasta oficial criada pelo Assistente de Gastos para armazenamento seguro de despesas e comprovantes.',
    }),
  });

  handleAuthError(createRes.status);

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Erro ao criar pasta no Google Drive: ${errText}`);
  }

  const newFolder = await createRes.json();
  return {
    folderId: newFolder.id,
    folderUrl: newFolder.webViewLink || `https://drive.google.com/drive/folders/${newFolder.id}`,
  };
}

/**
 * Busca ou cria o arquivo JSON de banco de dados dentro da pasta 'Assistente de Gastos'
 * Garante sempre o arquivo mais recente via orderBy=modifiedTime desc
 */
export async function getOrCreateDatabaseFile(accessToken: string, folderId: string): Promise<string> {
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    `'${folderId}' in parents and name = '${DB_FILE_NAME}' and trashed = false`
  )}&fields=files(id, name, modifiedTime)&orderBy=modifiedTime desc`;

  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  handleAuthError(searchRes.status);

  if (!searchRes.ok) {
    throw new Error('Falha ao verificar arquivo de despesas no Google Drive.');
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Cria o arquivo inicial vazio
  const initialPayload: DriveDatabasePayload = {
    version: 3,
    updatedAt: new Date().toISOString(),
    totalExpenses: 0,
    expenses: [],
    invoices: [],
  };

  const initialContent = JSON.stringify(initialPayload, null, 2);
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: DB_FILE_NAME,
    parents: [folderId],
    mimeType: 'application/json',
    description: 'Banco de dados de despesas, faturas e comprovantes sincronizado com o Assistente de Gastos',
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    initialContent +
    closeDelimiter;

  const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  handleAuthError(createRes.status);

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Erro ao criar arquivo de banco de dados no Google Drive: ${errText}`);
  }

  const createdFile = await createRes.json();
  return createdFile.id;
}

/**
 * Lê todas as despesas e faturas salvas no Google Drive do usuário
 */
export async function loadExpensesFromDrive(
  accessToken: string
): Promise<{
  expenses: CorporateExpense[];
  invoices?: InvoiceStatement[];
  settings?: CompanySettings;
  syncInfo: DriveSyncInfo;
} | null> {
  try {
    const { folderId, folderUrl } = await getOrCreateAppFolder(accessToken);
    const fileId = await getOrCreateDatabaseFile(accessToken, folderId);

    const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    handleAuthError(downloadRes.status);

    if (!downloadRes.ok) {
      throw new Error(`Erro ao baixar despesas do Drive: ${downloadRes.statusText}`);
    }

    const fileContent = await downloadRes.json();
    const expenses: CorporateExpense[] = Array.isArray(fileContent)
      ? fileContent
      : Array.isArray(fileContent.expenses)
      ? fileContent.expenses
      : [];

    const invoices: InvoiceStatement[] = Array.isArray(fileContent?.invoices)
      ? fileContent.invoices
      : [];

    const settings: CompanySettings | undefined = fileContent?.settings || undefined;

    return {
      expenses,
      invoices,
      settings,
      syncInfo: {
        folderId,
        fileId,
        folderUrl,
        lastSynced: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Erro ao carregar despesas do Google Drive:', error);
    throw error;
  }
}

/**
 * Salva as despesas e faturas atualizadas diretamente no arquivo do Google Drive
 */
export async function saveExpensesToDrive(
  accessToken: string,
  expenses: CorporateExpense[],
  invoices?: InvoiceStatement[],
  settings?: CompanySettings
): Promise<DriveSyncInfo> {
  const { folderId, folderUrl } = await getOrCreateAppFolder(accessToken);
  const fileId = await getOrCreateDatabaseFile(accessToken, folderId);

  const payloadData: DriveDatabasePayload = {
    version: 3,
    updatedAt: new Date().toISOString(),
    totalExpenses: expenses.length,
    expenses,
    invoices: invoices || [],
    settings: settings || undefined,
  };

  const payload = JSON.stringify(payloadData, null, 2);

  const updateRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: payload,
  });

  handleAuthError(updateRes.status);

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Falha ao gravar no Google Drive: ${errText}`);
  }

  return {
    folderId,
    fileId,
    folderUrl,
    lastSynced: new Date().toISOString(),
  };
}

/**
 * Sincronização inteligente bidirecional:
 * - Baixa os dados mais recentes do Google Drive e mescla com os locais.
 * - Desconsidera dados de demonstração (exp-sample-*) quando já houver base na nuvem.
 * - Atualiza edições de despesas baseando-se no timestamp mais recente (updatedAt).
 * - Sincroniza faturas fechadas e configurações de empresa entre múltiplos aparelhos.
 */
export async function syncExpensesWithDrive(
  accessToken: string,
  localExpenses: CorporateExpense[],
  localInvoices?: InvoiceStatement[],
  localSettings?: CompanySettings
): Promise<{
  expenses: CorporateExpense[];
  invoices?: InvoiceStatement[];
  settings?: CompanySettings;
  syncInfo: DriveSyncInfo;
  updatedLocal: boolean;
  updatedRemote: boolean;
}> {
  const { folderId, folderUrl } = await getOrCreateAppFolder(accessToken);
  const fileId = await getOrCreateDatabaseFile(accessToken, folderId);

  const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  handleAuthError(downloadRes.status);

  if (!downloadRes.ok) {
    throw new Error(`Falha ao verificar despesas no Drive: ${downloadRes.statusText}`);
  }

  const fileContent = await downloadRes.json();
  const remoteExpenses: CorporateExpense[] = Array.isArray(fileContent)
    ? fileContent
    : Array.isArray(fileContent.expenses)
    ? fileContent.expenses
    : [];

  const remoteInvoices: InvoiceStatement[] = Array.isArray(fileContent?.invoices)
    ? fileContent.invoices
    : [];

  const remoteSettings: CompanySettings | undefined = fileContent?.settings || undefined;

  const isSampleId = (id: string) => id.startsWith('exp-sample-');
  const realLocalExpenses = localExpenses.filter((e) => !isSampleId(e.id));
  const hasRealLocal = realLocalExpenses.length > 0;
  const hasRemote = remoteExpenses.length > 0;

  // 1. Caso 1: Drive está vazio, mas local tem despesas reais criadas pelo usuário
  if (!hasRemote && hasRealLocal) {
    const syncInfo = await saveExpensesToDrive(accessToken, localExpenses, localInvoices, localSettings);
    return {
      expenses: localExpenses,
      invoices: localInvoices,
      settings: localSettings,
      syncInfo,
      updatedLocal: false,
      updatedRemote: true,
    };
  }

  // 2. Caso 2: Novo dispositivo (apenas dados de amostra ou vazio local) e Drive já tem despesas do usuário
  if (hasRemote && (!hasRealLocal || localExpenses.every((e) => isSampleId(e.id)))) {
    return {
      expenses: remoteExpenses,
      invoices: remoteInvoices.length > 0 ? remoteInvoices : localInvoices,
      settings: remoteSettings || localSettings,
      syncInfo: {
        folderId,
        fileId,
        folderUrl,
        lastSynced: new Date().toISOString(),
      },
      updatedLocal: true,
      updatedRemote: false,
    };
  }

  // 3. Caso 3: Ambos possuem dados ou precisam de mesclagem inteligente
  let updatedLocal = false;
  let updatedRemote = false;

  // Mapa remoto
  const remoteMap = new Map<string, CorporateExpense>();
  remoteExpenses.forEach((e) => remoteMap.set(e.id, e));

  // Mapa local (ignorando samples se remote tem itens reais)
  const localMap = new Map<string, CorporateExpense>();
  localExpenses.forEach((e) => {
    if (!isSampleId(e.id) || !hasRemote) {
      localMap.set(e.id, e);
    }
  });

  const mergedExpenseMap = new Map<string, CorporateExpense>();

  // Analisa itens locais
  for (const [id, lExp] of localMap.entries()) {
    const rExp = remoteMap.get(id);
    if (!rExp) {
      // Item local novo que ainda não está no Drive
      mergedExpenseMap.set(id, lExp);
      updatedRemote = true;
    } else {
      // Item existe em ambos -> verificar qual é mais recente
      const lTime = lExp.updatedAt ? new Date(lExp.updatedAt).getTime() : 0;
      const rTime = rExp.updatedAt ? new Date(rExp.updatedAt).getTime() : 0;

      if (lTime > rTime) {
        // Local mais recente
        mergedExpenseMap.set(id, lExp);
        updatedRemote = true;
      } else if (rTime > lTime) {
        // Remoto mais recente
        mergedExpenseMap.set(id, rExp);
        updatedLocal = true;
      } else {
        // Timestamps iguais: checa campos de conteúdo
        const hasDiff =
          rExp.amount !== lExp.amount ||
          rExp.status !== lExp.status ||
          rExp.merchant !== lExp.merchant ||
          rExp.description !== lExp.description ||
          rExp.date !== lExp.date ||
          rExp.category !== lExp.category;

        if (hasDiff) {
          // Em caso de divergência de conteúdo sem timestamp, prioriza o remoto da nuvem
          mergedExpenseMap.set(id, rExp);
          updatedLocal = true;
        } else {
          mergedExpenseMap.set(id, lExp);
        }
      }
    }
  }

  // Analisa itens remotos não presentes no local
  for (const [id, rExp] of remoteMap.entries()) {
    if (!mergedExpenseMap.has(id)) {
      mergedExpenseMap.set(id, rExp);
      updatedLocal = true;
    }
  }

  // Ordena por data decrescente
  const mergedExpenses = Array.from(mergedExpenseMap.values());
  mergedExpenses.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Mesclagem de Faturas
  const invoiceMap = new Map<string, InvoiceStatement>();
  (remoteInvoices || []).forEach((inv) => invoiceMap.set(inv.month, inv));
  (localInvoices || []).forEach((lInv) => {
    const rInv = invoiceMap.get(lInv.month);
    if (!rInv) {
      invoiceMap.set(lInv.month, lInv);
      updatedRemote = true;
    } else {
      const lTime = lInv.updatedAt ? new Date(lInv.updatedAt).getTime() : 0;
      const rTime = rInv.updatedAt ? new Date(rInv.updatedAt).getTime() : 0;
      if (lTime > rTime) {
        invoiceMap.set(lInv.month, lInv);
        updatedRemote = true;
      } else if (rTime > lTime) {
        invoiceMap.set(lInv.month, rInv);
        updatedLocal = true;
      }
    }
  });
  const mergedInvoices = Array.from(invoiceMap.values());

  // Mesclagem de Configurações
  const mergedSettings = remoteSettings || localSettings;
  if (!localSettings && remoteSettings) {
    updatedLocal = true;
  }

  let syncInfo: DriveSyncInfo;
  if (updatedRemote) {
    syncInfo = await saveExpensesToDrive(
      accessToken,
      mergedExpenses,
      mergedInvoices,
      mergedSettings
    );
  } else {
    syncInfo = {
      folderId,
      fileId,
      folderUrl,
      lastSynced: new Date().toISOString(),
    };
  }

  return {
    expenses: mergedExpenses,
    invoices: mergedInvoices,
    settings: mergedSettings,
    syncInfo,
    updatedLocal,
    updatedRemote,
  };
}
