import { ScannedReceiptData } from '../types/expense';

const OPENROUTER_KEY_STORAGE = 'assistente_openrouter_api_key';
const OPENROUTER_VERIFIER_STORAGE = 'openrouter_pkce_verifier';

// Modelos com suporte a visão e 100% gratuitos no OpenRouter
export const FREE_VISION_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.2-11b-vision-instruct:free',
  'qwen/qwen-2.5-vl-72b-instruct:free',
];

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
 * Inicia o fluxo PKCE gerando os parâmetros e retornando a URL de autorização do OpenRouter
 */
export async function createOpenRouterAuthUrl(callbackUrl?: string): Promise<{ url: string; verifier: string }> {
  const verifier = generateRandomString(64);
  const challenge = await generateCodeChallenge(verifier);

  // Guarda o verifier para a troca posterior
  localStorage.setItem(OPENROUTER_VERIFIER_STORAGE, verifier);

  const redirectUri = callbackUrl || window.location.origin;
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

  let lastError: any = null;

  // Tenta os modelos gratuitos em sequência caso algum esteja sobrecarregado
  for (const model of FREE_VISION_MODELS) {
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
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.warn(`Modelo OpenRouter ${model} retornou status ${response.status}:`, errorBody);
        lastError = new Error(`OpenRouter (${model}): ${response.statusText}`);
        continue;
      }

      const json = await response.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        continue;
      }

      // Limpa possíveis marcações de markdown ```json ... ```
      const cleanJsonString = content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsed: ScannedReceiptData = JSON.parse(cleanJsonString);
      return parsed;
    } catch (err) {
      console.warn(`Tentativa com modelo OpenRouter ${model} falhou:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error('Não foi possível ler o comprovante com os modelos gratuitos do OpenRouter.');
}
