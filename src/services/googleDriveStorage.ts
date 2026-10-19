import { CorporateExpense } from '../types/expense';

const FOLDER_NAME = 'Assistente de Gastos';
const DB_FILE_NAME = 'banco_de_dados_despesas.json';

export interface DriveSyncInfo {
  folderId: string;
  fileId: string;
  folderUrl: string;
  lastSynced: string;
}

/**
 * Busca ou cria a pasta 'Assistente de Gastos' na raiz do Google Drive do usuário
 */
export async function getOrCreateAppFolder(accessToken: string): Promise<{ folderId: string; folderUrl: string }> {
  // 1. Busca se a pasta já existe
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  )}&fields=files(id, name, webViewLink)`;

  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

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
  )}&fields=files(id, name)`;

  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!searchRes.ok) {
    throw new Error('Falha ao verificar arquivo de despesas no Google Drive.');
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Cria o arquivo inicial vazio
  const initialContent = JSON.stringify({ expenses: [], updatedAt: new Date().toISOString() }, null, 2);
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: DB_FILE_NAME,
    parents: [folderId],
    mimeType: 'application/json',
    description: 'Banco de dados de despesas e comprovantes sincronizado com o Assistente de Gastos',
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

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Erro ao criar arquivo de banco de dados no Google Drive: ${errText}`);
  }

  const createdFile = await createRes.json();
  return createdFile.id;
}

/**
 * Lê todas as despesas salvas no Google Drive do usuário
 */
export async function loadExpensesFromDrive(
  accessToken: string
): Promise<{ expenses: CorporateExpense[]; syncInfo: DriveSyncInfo } | null> {
  try {
    const { folderId, folderUrl } = await getOrCreateAppFolder(accessToken);
    const fileId = await getOrCreateDatabaseFile(accessToken, folderId);

    const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!downloadRes.ok) {
      throw new Error(`Erro ao baixar despesas do Drive: ${downloadRes.statusText}`);
    }

    const fileContent = await downloadRes.json();
    const expenses: CorporateExpense[] = Array.isArray(fileContent)
      ? fileContent
      : Array.isArray(fileContent.expenses)
      ? fileContent.expenses
      : [];

    return {
      expenses,
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
 * Salva as despesas atualizadas diretamente no arquivo do Google Drive
 */
export async function saveExpensesToDrive(
  accessToken: string,
  expenses: CorporateExpense[]
): Promise<DriveSyncInfo> {
  const { folderId, folderUrl } = await getOrCreateAppFolder(accessToken);
  const fileId = await getOrCreateDatabaseFile(accessToken, folderId);

  const payload = JSON.stringify(
    {
      updatedAt: new Date().toISOString(),
      totalExpenses: expenses.length,
      expenses,
    },
    null,
    2
  );

  const updateRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: payload,
  });

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
