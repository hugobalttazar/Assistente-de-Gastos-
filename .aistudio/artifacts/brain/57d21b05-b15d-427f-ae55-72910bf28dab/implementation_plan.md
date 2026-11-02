# Consolidação da IA via OpenRouter & Remoção do GitHub Pages

## 1. O que foi realizado
1. **Remoção da Seção GitHub Pages**:
   - A seção "Hospedagem no GitHub Pages (100% Gratuito)" e seu campo de inserção da chave Gemini foram completamente eliminados de `SettingsView.tsx`.
2. **Leitura de Comprovantes 100% Exclusiva via OpenRouter**:
   - O modal de escaneamento (`ReceiptScannerModal.tsx`) foi desacoplado de chaves diretas do Gemini, endpoints legados e prompts de terceiros.
   - A extração inteligente agora invoca exclusivamente `scanReceiptWithOpenRouter`, aproveitando modelos de visão gratuitos de alta performance (`google/gemini-2.0-flash-exp:free`, `meta-llama/llama-3.2-11b-vision-instruct:free`, `qwen/qwen-2.5-vl-72b-instruct:free`).
   - Caso a conta OpenRouter ainda não esteja configurada ou autenticada, o modal exibe diretamente um painel com conexão em 1 clique (OAuth PKCE) ou inserção manual rápida de chave (`sk-or-v1-...`).
3. **Consolidação Visual & Textual**:
   - Rodapé e modal atualizados para "Leitura Inteligente via IA (OpenRouter)".
   - Ajuste nos limites de cache PWA no `vite.config.ts` garantindo compilação e empacotamento offline 100% estável.
