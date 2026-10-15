import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Permite payloads de imagem/PDF em base64 até 50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Inicialização do cliente Gemini server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint para análise e extração automatizada de comprovantes
app.post('/api/scan-receipt', async (req, res) => {
  try {
    const { fileBase64, mimeType, filename } = req.body;

    if (!fileBase64) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado para análise.' });
    }

    // Determina o MIME type adequado
    let effectiveMime = mimeType || 'image/jpeg';
    if (filename && filename.toLowerCase().endsWith('.pdf')) {
      effectiveMime = 'application/pdf';
    }

    // Remove eventual prefixo data:image/png;base64,... se presente
    const cleanBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;

    const filePart = {
      inlineData: {
        mimeType: effectiveMime,
        data: cleanBase64,
      },
    };

    const promptText = `Você é um especialista contábil e financeiro em prestação de contas de cartão corporativo no Brasil.
Analise a imagem ou PDF deste recibo, nota fiscal (NFC-e, NF-e, SAT), fatura, cupom ou comprovante de pagamento.
Extraia com o máximo de precisão:
1. data (data da compra no formato YYYY-MM-DD. Se ano não estiver claro, use 2026).
2. amount (valor total numérico pago em reais, ex: 154.90).
3. merchant (razão social ou nome fantasia do estabelecimento).
4. category (uma das seguintes opções: "Alimentação", "Transporte / Táxi / Uber", "Combustível", "Hospedagem", "Passagens", "Material de Escritório", "Software & Serviços", "Outros").
5. description (descrição clara e concisa do que foi adquirido, itens ou tipo do serviço).
6. cnpj (CNPJ do emissor se legível, no formato 00.000.000/0000-00, ou vazio se não houver).
7. paymentMethod (indicação do meio de pagamento, ex: "Cartão de Crédito final 4022", "Mastercard", "Visa", etc., ou "Cartão Corporativo" se genérico).
8. confidenceNotes (uma breve observação sobre a legibilidade ou detalhes extras encontrados).`;

    let response: any = null;
    let lastError: any = null;
    const modelsToTry = [
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.5-flash',
    ];

    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: {
              parts: [
                filePart,
                { text: promptText },
              ],
            },
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  date: {
                    type: Type.STRING,
                    description: 'Data da compra no formato YYYY-MM-DD',
                  },
                  amount: {
                    type: Type.NUMBER,
                    description: 'Valor total do comprovante em reais (número com ponto decimal)',
                  },
                  merchant: {
                    type: Type.STRING,
                    description: 'Nome fantasia ou razão social do estabelecimento',
                  },
                  category: {
                    type: Type.STRING,
                    description: 'Categoria contábil da despesa corporativa',
                  },
                  description: {
                    type: Type.STRING,
                    description: 'Descrição objetiva dos itens ou serviço adquirido',
                  },
                  cnpj: {
                    type: Type.STRING,
                    description: 'CNPJ do estabelecimento, se identificado',
                  },
                  paymentMethod: {
                    type: Type.STRING,
                    description: 'Forma de pagamento ou identificação do cartão',
                  },
                  confidenceNotes: {
                    type: Type.STRING,
                    description: 'Observação sobre a leitura e legibilidade do documento',
                  },
                },
                required: ['date', 'amount', 'merchant', 'category', 'description'],
              },
            },
          });

          if (response && response.text) {
            break;
          }
        } catch (err: any) {
          lastError = err;
          // Espera 1s antes da próxima tentativa caso haja pico temporário
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      if (response && response.text) {
        break;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Não foi possível obter resposta dos modelos de IA.');
    }

    const rawJson = response.text || '{}';
    const parsedData = JSON.parse(rawJson);

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Erro na extração do comprovante:', error);
    return res.status(500).json({
      error: 'Falha ao processar o comprovante.',
      details: error.message || String(error),
    });
  }
});

// Configuração do Vite middleware em dev ou arquivos estáticos em prod
async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
