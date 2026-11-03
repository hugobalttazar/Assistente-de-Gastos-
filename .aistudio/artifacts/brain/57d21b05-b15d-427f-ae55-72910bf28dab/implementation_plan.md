# Consolidação da IA via OpenRouter & Remoção do GitHub Pages

## 1. O que foi realizado
1. **Remoção da Seção GitHub Pages**:
   - A seção "Hospedagem no GitHub Pages (100% Gratuito)" e seu campo de inserção da chave Gemini foram completamente eliminados de `SettingsView.tsx`.
2. **Leitura de Comprovantes 100% Exclusiva via OpenRouter**:
   - O modal de escaneamento (`ReceiptScannerModal.tsx`) foi desacoplado de chaves diretas do Gemini, endpoints legados e prompts de terceiros.
   - A extração inteligente agora invoca exclusivamente `scanReceiptWithOpenRouter`, aproveitando modelos de visão gratuitos de alta performance (`openrouter/free`, `nvidia/nemotron-3.5-super-vl:free`, `google/gemma-4-31b-it:free`, etc.).
   - Caso a conta OpenRouter ainda não esteja configurada ou autenticada, o modal exibe diretamente um painel com conexão em 1 clique (OAuth PKCE) ou inserção manual rápida de chave (`sk-or-v1-...`).
3. **Classificação e Criação Automática de Novas Categorias pela IA**:
   - A IA agora analisa e classifica especificamente tipos de despesas (como 'Pedágio', 'Estacionamento', 'Manutenção Veicular', etc.).
   - Se o comprovante for de uma categoria ainda não existente no sistema, a IA define o nome adequado e o app automaticamente cria e persiste essa nova categoria no banco/cache local.
   - O formulário exibe uma tag indicativa ("IA definiu: Pedágio") e disponibiliza a opção de criar categorias manualmente em tempo real.
   - As tabelas e relatórios filtram e agregam dinamicamente todas as novas categorias criadas.
4. **Consolidação Visual & Textual**:
   - Rodapé e modal atualizados para "Leitura Inteligente via IA (OpenRouter)".
   - Ajuste nos limites de cache PWA no `vite.config.ts` garantindo compilação e empacotamento offline 100% estável.
