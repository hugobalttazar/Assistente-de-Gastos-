import { CorporateExpense, CompanySettings, InvoiceStatement } from '../types/expense';
import { clearPersistedAccessToken } from './googleAuth';
import { formatMonthName } from '../utils/storage';

const FOLDER_NAME = 'Assistente de Gastos';
const DB_FILE_NAME = 'banco_de_dados_despesas.json';
const REPORT_DOC_NAME = 'Relatório de Prestação de Contas (Google Docs).html';

export interface DriveSyncInfo {
  folderId: string;
  fileId: string;
  folderUrl: string;
  lastSynced: string;
  reportDocUrl?: string;
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

// --- SERVIÇO DE SINCRONIZAÇÃO EM NUVEM CENTRALIZADA (SERVIDOR) ---
export async function saveToCloudApi(
  userKey: string,
  expenses: CorporateExpense[],
  invoices: InvoiceStatement[] = [],
  settings?: CompanySettings
): Promise<void> {
  try {
    const cleanExpenses = expenses.filter((e) => !e.id?.startsWith('exp-sample-'));
    await fetch('/api/cloud-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userKey,
        expenses: cleanExpenses,
        invoices,
        settings,
      }),
    });
  } catch (err) {
    console.warn('Aviso: falha na persistência cloud-api:', err);
  }
}

export async function loadFromCloudApi(
  userKey: string
): Promise<{
  expenses: CorporateExpense[];
  invoices: InvoiceStatement[];
  settings?: CompanySettings;
  exists: boolean;
} | null> {
  try {
    const res = await fetch(`/api/cloud-sync?userKey=${encodeURIComponent(userKey)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.exists) {
        return {
          expenses: Array.isArray(data.expenses) ? data.expenses : [],
          invoices: Array.isArray(data.invoices) ? data.invoices : [],
          settings: data.settings || undefined,
          exists: true,
        };
      }
    }
  } catch (err) {
    console.warn('Aviso: falha ao consultar cloud-api:', err);
  }
  return null;
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
 * Cria ou atualiza o Documento Legível formatado (Google Docs / HTML) na pasta do Google Drive
 * para que o usuário abra e veja suas despesas atualizadas diretamente no app do Google Docs/Drive
 */
export async function syncHumanReadableDocument(
  accessToken: string,
  folderId: string,
  expenses: CorporateExpense[],
  invoices: InvoiceStatement[] = [],
  settings?: CompanySettings
): Promise<string | undefined> {
  try {
    // 1. Gera o HTML estilizado e formatado do relatório
    const totalGeral = expenses.reduce((sum, e) => sum + e.amount, 0);
    const dateFormatted = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Agrupamento por Categoria
    const catMap: Record<string, number> = {};
    expenses.forEach((e) => {
      const cat = e.category || 'Outros';
      catMap[cat] = (catMap[cat] || 0) + e.amount;
    });

    const categoriesRows = Object.entries(catMap)
      .map(
        ([cat, total]) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${cat}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-weight: bold; color: #0f766e;">
          R$ ${total.toFixed(2).replace('.', ',')}
        </td>
      </tr>`
      )
      .join('');

    const expensesRows = expenses
      .slice(0, 500)
      .map((e, idx) => {
        const dStr = e.date ? e.date.split('-').reverse().join('/') : '-';
        return `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-family: monospace;">${dStr}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 600;">${e.merchant || '-'}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px;">${e.category || '-'}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #475569;">${e.description || '-'}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right; font-weight: bold; color: #047857; font-family: monospace;">
          R$ ${e.amount.toFixed(2).replace('.', ',')}
        </td>
      </tr>`;
      })
      .join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Prestação de Contas - Assistente de Gastos</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; background: #ffffff; padding: 32px; max-width: 900px; margin: 0 auto; }
    h1 { color: #0f172a; font-size: 22px; margin-bottom: 4px; }
    .badge { display: inline-block; padding: 4px 10px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 9999px; font-size: 11px; font-weight: bold; }
    .header-box { border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 24px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; font-size: 13px; }
    .meta-item strong { color: #475569; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 12px; font-weight: 700; color: #334155; border-bottom: 2px solid #cbd5e1; }
    .total-box { margin-top: 24px; padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; text-align: right; }
    .total-val { font-size: 24px; font-weight: bold; color: #047857; font-family: monospace; }
  </style>
</head>
<body>
  <div class="header-box">
    <span class="badge">Sincronizado via Assistente de Gastos</span>
    <h1>Prestação de Contas do Cartão Corporativo</h1>
    <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">Atualizado automaticamente em: ${dateFormatted}</p>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><strong>Colaborador:</strong> ${settings?.employeeName || 'Hugo Baltazar'}</div>
    <div class="meta-item"><strong>Empresa:</strong> ${settings?.companyName || 'Empresa Corporativa S.A.'}</div>
    <div class="meta-item"><strong>Cargo:</strong> ${settings?.employeeRole || 'Gerente Executivo'}</div>
    <div class="meta-item"><strong>Cartão:</strong> ${settings?.corporateCardNumber || 'Visa Corporativo final 4022'}</div>
  </div>

  <h2 style="font-size: 16px; margin-top: 24px; color: #0f172a;">Resumo por Categoria</h2>
  <table style="max-width: 480px;">
    <thead>
      <tr><th>Categoria</th><th style="text-align: right;">Total</th></tr>
    </thead>
    <tbody>
      ${categoriesRows || '<tr><td colspan="2" style="padding: 8px;">Sem despesas cadastradas</td></tr>'}
    </tbody>
  </table>

  <div class="total-box">
    <div style="font-size: 13px; color: #475569;">Valor Total Acumulado</div>
    <div class="total-val">R$ ${totalGeral.toFixed(2).replace('.', ',')}</div>
    <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Total de ${expenses.length} lançamentos registrados</div>
  </div>

  <h2 style="font-size: 16px; margin-top: 32px; color: #0f172a;">Lançamentos Detalhados</h2>
  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Estabelecimento</th>
        <th>Categoria</th>
        <th>Justificativa</th>
        <th style="text-align: right;">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${expensesRows || '<tr><td colspan="5" style="padding: 16px; text-align: center; color: #94a3b8;">Nenhum lançamento registrado ainda.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;

    // 2. Busca se o documento já existe na pasta
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `'${folderId}' in parents and name = '${REPORT_DOC_NAME}' and trashed = false`
    )}&fields=files(id, webViewLink)&orderBy=modifiedTime desc`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let docFileId: string | null = null;
    let webViewLink: string | undefined;

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        docFileId = searchData.files[0].id;
        webViewLink = searchData.files[0].webViewLink;
      }
    }

    if (docFileId) {
      // Atualiza o conteúdo do documento existente
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${docFileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'text/html; charset=UTF-8',
        },
        body: htmlContent,
      });
    } else {
      // Cria novo documento na pasta
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadata = {
        name: REPORT_DOC_NAME,
        parents: [folderId],
        mimeType: 'text/html',
        description: 'Documento visual da Prestação de Contas gerado pelo Assistente de Gastos',
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: text/html; charset=UTF-8\r\n\r\n' +
        htmlContent +
        closeDelimiter;

      const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });

      if (createRes.ok) {
        const created = await createRes.json();
        webViewLink = created.webViewLink;
      }
    }

    return webViewLink;
  } catch (err) {
    console.warn('Aviso: não foi possível atualizar o Documento visual do Drive:', err);
    return undefined;
  }
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
      expenses: expenses.filter((e) => !e.id?.startsWith('exp-sample-')),
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
 * Salva as despesas e faturas atualizadas no Google Drive do usuário (banco JSON + documento HTML legível)
 */
export async function saveExpensesToDrive(
  accessToken: string,
  expenses: CorporateExpense[],
  invoices?: InvoiceStatement[],
  settings?: CompanySettings,
  userEmail?: string
): Promise<DriveSyncInfo> {
  const { folderId, folderUrl } = await getOrCreateAppFolder(accessToken);
  const fileId = await getOrCreateDatabaseFile(accessToken, folderId);

  const cleanExpenses = expenses.filter((e) => !e.id?.startsWith('exp-sample-'));

  const payloadData: DriveDatabasePayload = {
    version: 3,
    updatedAt: new Date().toISOString(),
    totalExpenses: cleanExpenses.length,
    expenses: cleanExpenses,
    invoices: invoices || [],
    settings: settings || undefined,
  };

  const payload = JSON.stringify(payloadData, null, 2);

  // 1. Atualiza o banco técnico de sincronização (JSON)
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

  // 2. Cria/Atualiza o documento formatado legível (Google Docs / HTML) na mesma pasta
  const reportDocUrl = await syncHumanReadableDocument(accessToken, folderId, cleanExpenses, invoices, settings);

  // 3. Salva também na API de nuvem resiliente
  if (userEmail) {
    saveToCloudApi(userEmail, cleanExpenses, invoices || [], settings);
  }

  return {
    folderId,
    fileId,
    folderUrl,
    reportDocUrl,
    lastSynced: new Date().toISOString(),
  };
}

/**
 * Sincronização inteligente bidirecional:
 * - Se o dispositivo local estiver vazio ou com amostras, adota 100% da nuvem.
 * - Mescla adições de múltiplos dispositivos respeitando os registros reais.
 */
export async function syncExpensesWithDrive(
  accessToken: string,
  localExpenses: CorporateExpense[],
  localInvoices?: InvoiceStatement[],
  localSettings?: CompanySettings,
  userEmail?: string
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
  const rawRemoteExpenses: CorporateExpense[] = Array.isArray(fileContent)
    ? fileContent
    : Array.isArray(fileContent.expenses)
    ? fileContent.expenses
    : [];

  const remoteExpenses = rawRemoteExpenses.filter((e) => !e.id?.startsWith('exp-sample-'));
  const remoteInvoices: InvoiceStatement[] = Array.isArray(fileContent?.invoices)
    ? fileContent.invoices
    : [];

  const remoteSettings: CompanySettings | undefined = fileContent?.settings || undefined;

  const realLocalExpenses = localExpenses.filter((e) => !e.id?.startsWith('exp-sample-'));
  const hasRealLocal = realLocalExpenses.length > 0;
  const hasRemote = remoteExpenses.length > 0;

  // 1. Caso 1: Drive está vazio, mas local tem despesas reais criadas pelo usuário
  if (!hasRemote && hasRealLocal) {
    const syncInfo = await saveExpensesToDrive(accessToken, realLocalExpenses, localInvoices, localSettings, userEmail);
    return {
      expenses: realLocalExpenses,
      invoices: localInvoices,
      settings: localSettings,
      syncInfo,
      updatedLocal: true,
      updatedRemote: true,
    };
  }

  // 2. Caso 2: Novo dispositivo (celular ou tablet sem despesas ou com amostras) e a Nuvem já possui dados
  if (hasRemote && (!hasRealLocal || realLocalExpenses.length === 0)) {
    // Também atualiza o documento visual no Drive
    syncHumanReadableDocument(accessToken, folderId, remoteExpenses, remoteInvoices, remoteSettings || localSettings);
    if (userEmail) {
      saveToCloudApi(userEmail, remoteExpenses, remoteInvoices, remoteSettings || localSettings);
    }

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

  // 3. Caso 3: Ambos possuem dados ou precisam de mesclagem
  let updatedLocal = false;
  let updatedRemote = false;

  const remoteMap = new Map<string, CorporateExpense>();
  remoteExpenses.forEach((e) => remoteMap.set(e.id, e));

  const localMap = new Map<string, CorporateExpense>();
  realLocalExpenses.forEach((e) => localMap.set(e.id, e));

  const mergedExpenseMap = new Map<string, CorporateExpense>();

  // Analisa itens locais
  for (const [id, lExp] of localMap.entries()) {
    const rExp = remoteMap.get(id);
    if (!rExp) {
      mergedExpenseMap.set(id, lExp);
      updatedRemote = true;
    } else {
      const lTime = lExp.updatedAt ? new Date(lExp.updatedAt).getTime() : 0;
      const rTime = rExp.updatedAt ? new Date(rExp.updatedAt).getTime() : 0;

      if (lTime > rTime) {
        mergedExpenseMap.set(id, lExp);
        updatedRemote = true;
      } else if (rTime > lTime) {
        mergedExpenseMap.set(id, rExp);
        updatedLocal = true;
      } else {
        mergedExpenseMap.set(id, rExp);
      }
    }
  }

  // Adiciona itens remotos não presentes localmente
  for (const [id, rExp] of remoteMap.entries()) {
    if (!mergedExpenseMap.has(id)) {
      mergedExpenseMap.set(id, rExp);
      updatedLocal = true;
    }
  }

  const mergedExpenses = Array.from(mergedExpenseMap.values());
  mergedExpenses.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Mescla faturas
  const invoiceMap = new Map<string, InvoiceStatement>();
  (remoteInvoices || []).forEach((inv) => invoiceMap.set(inv.month, inv));
  (localInvoices || []).forEach((lInv) => {
    const rInv = invoiceMap.get(lInv.month);
    if (!rInv) {
      invoiceMap.set(lInv.month, lInv);
      updatedRemote = true;
    } else {
      invoiceMap.set(lInv.month, rInv);
    }
  });
  const mergedInvoices = Array.from(invoiceMap.values());

  const mergedSettings = remoteSettings || localSettings;

  let syncInfo: DriveSyncInfo;
  if (updatedRemote) {
    syncInfo = await saveExpensesToDrive(
      accessToken,
      mergedExpenses,
      mergedInvoices,
      mergedSettings,
      userEmail
    );
  } else {
    syncHumanReadableDocument(accessToken, folderId, mergedExpenses, mergedInvoices, mergedSettings);
    syncInfo = {
      folderId,
      fileId,
      folderUrl,
      lastSynced: new Date().toISOString(),
    };
  }

  if (userEmail) {
    saveToCloudApi(userEmail, mergedExpenses, mergedInvoices, mergedSettings);
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
