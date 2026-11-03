import { ScannedReceiptData } from '../types/expense';

const OPENROUTER_KEY_STORAGE = 'assistente_openrouter_api_key';
const OPENROUTER_VERIFIER_STORAGE = 'openrouter_pkce_verifier';

// Modelos com suporte a visão e 100% gratuitos no OpenRouter
export const FREE_VISION_MODELS = [
  'openrouter/free',
  'nvidia/nemotron-3.5-super-vl:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'dots-studio/dots-3-note-preview:free',
  'thinkingmachines/inkling:free',
  'thinkingmachines/inkling-small:free',
];

let cachedActiveVisionModels: string[] | null = null;
let lastModelFetch = 0;

/**
 * Consulta a API do OpenRouter em tempo real para obter os modelos gratuitos de visão ativos no momento
 */
export async function getActiveFreeVisionModels(): Promise<string[]> {
  const now = Date.now();
  if (cachedActiveVisionModels && now - lastModelFetch < 1000 * 60 * 30) {
    return cachedActiveVisionModels;
  }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (res.ok) {
      const data = await res.json();
      const freeVision = (data.data || [])
        .filter((m: any) => {
          const id = m.id || '';
          const isFree = id.endsWith(':free') || id === 'openrouter/free';
          const modality = m.architecture?.modality || '';
          const desc = (m.description || '').toLowerCase();
          const name = (m.name || '').toLowerCase();
          const hasVision =
            modality.includes('image') ||
            modality.includes('multimodal') ||
            desc.includes('vision') ||
            name.includes('vision') ||
            name.includes('vl');
          return isFree && hasVision;
        })
        .map((m: any) => m.id);

      if (freeVision.length > 0) {
        // Garante que 'openrouter/free' e modelos mais robustos estejam priorizados no topo
        const prioritized = [
          'openrouter/free',
          ...freeVision.filter((id: string) => id !== 'openrouter/free'),
        ];
        cachedActiveVisionModels = prioritized;
        lastModelFetch = now;
        return prioritized;
      }
    }
  } catch (err) {
    console.warn('Falha ao listar modelos dinâmicos do OpenRouter:', err);
  }

  return FREE_VISION_MODELS;
}

/**
 * Gera string aleatória segura para o code_verifier do PKCE
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((x) => chars[x % chars.length])
    .join('');
}

/**
 * Gera o code_challenge SHA-256 base64url a partir do verifier
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Obtém a URL de retorno canônica preservando o caminho de publicação (ex: /Assistente-de-Gastos-/)
 */
export function getDefaultCallbackUrl(): string {
  if (typeof window === 'undefined') return '';
  let pathname = window.location.pathname || '/';
  if (pathname.endsWith('index.html')) {
    pathname = pathname.slice(0, -'index.html'.length);
  }
  if (!pathname.endsWith('/')) {
    pathname += '/';
  }
  return window.location.origin + pathname;
}

/**
 * Inicia o fluxo PKCE gerando os parâmetros e retornando a URL de autorização do OpenRouter
 */
export async function createOpenRouterAuthUrl(callbackUrl?: string): Promise<{ url: string; verifier: string }> {
  const verifier = generateRandomString(64);
  const challenge = await generateCodeChallenge(verifier);

  // Guarda o verifier para a troca posterior
  localStorage.setItem(OPENROUTER_VERIFIER_STORAGE, verifier);

  const redirectUri = callbackUrl || getDefaultCallbackUrl();
  const authUrl = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(
    redirectUri
  )}&code_challenge=${challenge}&code_challenge_method=S256`;

  return { url: authUrl, verifier };
}

/**
 * Troca o código de autorização recebido pelo OpenRouter pela chave permanente da API
 */
export async function exchangeCodeForApiKey(code: string): Promise<string> {
  const verifier = localStorage.getItem(OPENROUTER_VERIFIER_STORAGE);
  if (!verifier) {
    throw new Error('Código verificador PKCE não encontrado. Tente conectar novamente.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/auth/keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      code_verifier: verifier,
      code_challenge_method: 'S256',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao obter chave do OpenRouter: ${errorText}`);
  }

  const data = await response.json();
  const apiKey = data.key;

  if (!apiKey) {
    throw new Error('Nenhuma chave de API retornada pelo OpenRouter.');
  }

  // Salva a chave e limpa o verifier temporário
  saveOpenRouterKey(apiKey);
  localStorage.removeItem(OPENROUTER_VERIFIER_STORAGE);

  return apiKey;
}

/**
 * Salva a chave de API do OpenRouter no armazenamento local
 */
export function saveOpenRouterKey(key: string): void {
  localStorage.setItem(OPENROUTER_KEY_STORAGE, key.trim());
}

/**
 * Recupera a chave de API do OpenRouter salva
 */
export function getStoredOpenRouterKey(): string | null {
  return localStorage.getItem(OPENROUTER_KEY_STORAGE) || null;
}

/**
 * Remove a chave do OpenRouter
 */
export function removeOpenRouterKey(): void {
  localStorage.removeItem(OPENROUTER_KEY_STORAGE);
  localStorage.removeItem(OPENROUTER_VERIFIER_STORAGE);
}

/**
 * Escaneia e extrai dados fiscais de um comprovante usando os modelos de visão gratuitos do OpenRouter
 */
export async function scanReceiptWithOpenRouter(
  fileBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<ScannedReceiptData> {
  const apiKey = getStoredOpenRouterKey();
  if (!apiKey) {
    throw new Error('Chave do OpenRouter não encontrada. Conecte sua conta do OpenRouter para usar a IA gratuita.');
  }

  const fullDataUrl = fileBase64.startsWith('data:')
    ? fileBase64
    : `data:${mimeType};base64,${fileBase64}`;

  const promptText = `Você é um assistente especialista em prestação de contas contábil no Brasil.
Analise a imagem deste recibo, nota fiscal (NFC-e, NF-e, SAT), fatura ou cupom fiscal.
Extraia os seguintes campos com precisão cirúrgica e responda EXCLUSIVAMENTE em formato JSON com esta estrutura:
{
  "date": "YYYY-MM-DD",
  "amount": 0.00,
  "merchant": "Nome do Estabelecimento / Razão Social",
  "cnpj": "00.000.000/0000-00",
  "category": "Alimentação | Transporte / Táxi / Uber | Combustível | Hospedagem | Passagens | Material de Escritório | Software & Serviços | Outros",
  "description": "Descrição detalhada dos itens ou da despesa (ex: Almoço executivo 2 pessoas)",
  "paymentMethod": "Forma de pagamento indicada (ex: Cartão de Crédito Visa)",
  "confidenceNotes": "Observações sobre a legibilidade do comprovante"
}
Retorne apenas o objeto JSON puro, sem blocos markdown adicionais.`;

  const modelsToTry = await getActiveFreeVisionModels();
  let lastError: any = null;

  // Tenta os modelos gratuitos em sequência caso algum esteja sobrecarregado
  for (const model of modelsToTry) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Assistente de Gastos Corporativos',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: promptText,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: fullDataUrl,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.warn(`Modelo OpenRouter ${model} retornou status ${response.status}:`, errorBody);

        let parsedMessage = '';
        let errorCode: string | number = response.status;
        try {
          const errJson = JSON.parse(errorBody);
          parsedMessage = errJson.error?.message || errJson.message || errorBody;
          if (errJson.error?.code) {
            errorCode = errJson.error.code;
          }
        } catch {
          parsedMessage = errorBody;
        }

        // Se for erro de autenticação ou chave inválida
        if (
          response.status === 401 ||
          String(errorCode) === '401' ||
          parsedMessage.includes('User not found') ||
          parsedMessage.includes('Invalid API key') ||
          parsedMessage.includes('auth') ||
          parsedMessage.includes('credentials')
        ) {
          throw new Error('Chave do OpenRouter inválida ou expirada. Reconecte sua conta do OpenRouter ou cole uma nova chave válida.');
        }

        // Se for limite temporário de requisições gratuitas
        if (response.status === 429 || String(errorCode) === '429' || parsedMessage.toLowerCase().includes('rate limit')) {
          lastError = new Error(`Limite temporário de requisições na IA (${model}). Aguarde alguns instantes.`);
          continue;
        }

        lastError = new Error(`OpenRouter (${model}): ${parsedMessage || `Erro HTTP ${response.status}`}`);
        continue;
      }

      const json = await response.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        continue;
      }

      // Procura pelo primeiro bloco JSON {...} no texto
      let jsonString = content.trim();
      const match = jsonString.match(/\{[\s\S]*\}/);
      if (match) {
        jsonString = match[0];
      } else {
        jsonString = jsonString.replace(/```json/gi, '').replace(/```/g, '').trim();
      }

      const parsed: ScannedReceiptData = JSON.parse(jsonString);
      return parsed;
    } catch (err: any) {
      if (err.message && err.message.includes('Chave do OpenRouter')) {
        throw err;
      }
      console.warn(`Tentativa com modelo OpenRouter ${model} falhou:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error('Não foi possível ler o comprovante com os modelos gratuitos do OpenRouter.');
}
