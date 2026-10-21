# Assistente de Gastos - Cartão Corporativo & Despesas

> Aplicativo executivo para gestão, conciliação e prestação de contas mensal de despesas com cartão de crédito corporativo. Conta com digitalização inteligente de comprovantes via IA (Google Gemini 3.8 Flash), painel financeiro inspirado no app **Meu Assessor**, emissão de relatórios formais em PDF com fotos dos comprovantes em anexo, exportação em planilha Excel (.xlsx), banco de dados local com privacidade total (IndexedDB) e suporte a instalação como aplicativo desktop (PWA) e publicação no GitHub Pages.

---

## 🌟 Principais Recursos

### 1. 🤖 Digitalização Inteligente de Comprovantes com IA (Gemini 3.8 Flash)
- **Upload Multimodal & Conversão Automática**: Suporte para fotos e PDFs (SAT, NFC-e, NF-e, faturas, DANFEs até 50MB). **Arquivos em PDF são convertidos automaticamente em imagens JPEG de alta definição** para que a folha da nota fiscal apareça de forma nítida e visual tanto na tela do relatório mensal quanto nas páginas anexas do PDF gerado.
- **Extração Automatizada com Schema Estruturado**:
  - **Data da transação** (YYYY-MM-DD);
  - **Valor total** em reais (R$);
  - **Estabelecimento / Razão social / Nome fantasia**;
  - **CNPJ** do fornecedor;
  - **Categoria contábil sugerida** (*Alimentação, Transporte / Uber, Combustível, Hospedagem, Passagens, Material de Escritório, Software & Serviços, Outros*);
  - **Forma de pagamento** indicada no recibo;
  - **Observações de legibilidade** emitidas pela IA.
- **Justificativa Corporativa Personalizada**: Campo dedicado para o colaborador complementar ou editar a descrição/justificativa de negócios de cada despesa antes de salvar.

### 2. 📊 Painel Executivo (Inspirado no "Meu Assessor")
- **Identidade Visual Sofisticada**: Tema escuro executivo profundo (`#0B0F17` / `#111827`) com acentos em verde esmeralda (`#10B981`) e superfícies limpas.
- **Números Tabulares de Alta Precisão**: Todos os valores monetários e datas utilizam fontes monoespaçadas com alinhamento contábil tabular (`tabular-nums font-mono`).
- **Cards de Métricas (KPIs)**: Total gasto no mês, quantidade de comprovantes com anexo, ticket médio corporativo e maior despesa única.
- **Gráficos e Distribuição por Categoria**: Barras de progresso com subtotal e percentual de gastos por categoria.
- **Navegador de Competência**: Seletor rápido de mês/ano para fechamento mensal.

### 3. 📋 Mesa de Despesas (Tabela de Conferência)
- **Filtros Avançados**: Busca textual por fornecedor, descrição ou CNPJ, e filtro instantâneo por categoria.
- **Ordenação Dinâmica**: Ordenação ascendente/descendente por data e valor.
- **Miniaturas de Comprovante**: Visualização rápida da foto do recibo direto na linha da tabela.
- **Edição Rápida da Justificativa**: Permite ajustar o texto da justificativa corporativa com 1 clique.
- **Status de Conferência**: Alternância de status entre *Conferido* e *Pendente*.
- **Exclusão Segura**: Modal nativo de confirmação de exclusão (sem popups bloqueáveis de navegador).

### 4. 🔍 Visualizador em Alta Definição
- Modal lightbox em tela cheia para inspecionar comprovantes.
- Ferramentas de **Zoom in/out**, **Rotação em 90°** e **Download** do arquivo original.
- Painel lateral com resumo detalhado de auditoria contábil.

### 5. 📑 Relatórios Oficiais de Prestação de Contas
- **Download Direto de PDF Vetorial (`.pdf`)**:
  - Geração nativa com **jsPDF** e **jspdf-autotable** (livre de erros de renderização de CSS ou `oklch`).
  - Cabeçalho executivo oficial com identificação da empresa, colaborador, cargo, departamento, cartão corporativo e competência.
  - Tabela de demonstrativo contábil itemizado com subtotais e totais em destaque.
  - **Galeria de Comprovantes Anexados**: Cada nota fiscal ou recibo enviado é impresso em página dedicada com seu número de item correspondente, data, fornecedor, valor e justificativa em itálico.
  - Bloco de assinaturas formais (Colaborador solicitante e Aprovação da Gestão/Financeiro).
- **Exportação para Planilha Excel (`.xlsx`)**:
  - Gera arquivo Excel nativo contendo aba de despesas detalhadas e aba de resumo consolidado por categorias com percentuais contábeis.

### 6. 💻 Instalação como Aplicativo de Computador (PWA)
- Funciona como um programa de computador no **Windows e Mac**:
  - Botão **"Instalar no PC"** no cabeçalho e nas configurações.
  - Cria ícone na **Área de Trabalho**, no **Menu Iniciar** e fixa na **Barra de Tarefas**.
  - Roda em janela limpa e dedicada (sem barra de URL ou botões de navegador).

### 7. 🔒 Armazenamento Privado no Google Drive & Gestão de Leads
- **Armazenamento 100% no Google Drive do Usuário**:
  - Botão **"Realizar Login"** com Google no topo superior direito.
  - O aplicativo cria automaticamente a pasta **`Assistente de Gastos`** no Drive do colaborador.
  - Os dados das despesas são gravados de forma isolada e privada na nuvem do próprio usuário (`banco_de_dados_despesas.json`).
  - Utiliza o escopo oficial de privilégio mínimo `drive.file` (o aplicativo não acessa nenhum outro arquivo pessoal do colaborador).
- **Captação de Leads & Consentimento LGPD**:
  - No primeiro login, o sistema solicita o **Telefone / WhatsApp corporativo** e apresenta o **Termo de Adesão & Consentimento** em conformidade com a LGPD (Lei nº 13.709/2018).
  - O criador da plataforma tem acesso ao **Painel de Leads** (no menu superior direito), onde pode consultar todos os usuários cadastrados, iniciar conversas no WhatsApp e exportar a lista para **Excel (`.xlsx`)**.
  - Suporta também instalação em dispositivos móveis (Android e iOS Safari).

### 7. 🔒 Armazenamento Local Seguro & Prontidão para GitHub Pages / Firebase
- **Banco de Dados IndexedDB**: Salva localmente despesas e arquivos de fotos sem o limite de 5MB do localStorage, garantindo total privacidade e funcionamento offline.
- **Backup e Restauração**: Exportação de arquivo `.json` completo com todos os dados e comprovantes, e importação facilitada.
- **Compatível com GitHub Pages**: Build estática com caminhos relativos (`base: './'`), suporte a chave da API do Gemini informada na interface para chamadas diretas quando hospedado sem backend.
- **Pronto para Firebase Firestore**: Estrutura de dados documentais pronta para sincronização na nuvem gratuita quando desejado.

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologia | Finalidade |
| :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript + Vite | Interface reativa, modular e rápida |
| **Estilização** | Tailwind CSS v4 + Lucide Icons | Design executivo, responsivo e ícones consistentes |
| **Inteligência Artificial** | Google Gemini 3.8 Flash (`@google/genai`) | OCR multimodal e extração de dados fiscais |
| **Servidor Full-Stack** | Node.js + Express + `tsx` | Proxy seguro para chamadas da API Gemini |
| **Geração de PDF** | `jsPDF` + `jspdf-autotable` | Criação de documentos PDF vetoriais A4 com anexos |
| **Geração de Excel** | `xlsx` (SheetJS) | Geração de planilhas `.xlsx` com múltiplas abas |
| **Persistência Local** | IndexedDB API | Armazenamento de alta capacidade para dados e fotos |
| **Desktop / PWA** | `vite-plugin-pwa` + Service Worker | Instalação nativa com suporte a atalhos no Windows |

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- Node.js versão 20 ou superior instalado.
- Chave de API do Gemini (configurada no arquivo `.env` ou nas configurações do app).

### Instalação
```bash
# Clone o repositório
git clone <url-do-repositorio>
cd <pasta-do-projeto>

# Instale as dependências
npm install
```

### Configuração do Ambiente
Crie ou verifique o arquivo `.env` na raiz do projeto:
```env
GEMINI_API_KEY="SUA_CHAVE_AQUI"
```

### Executar em Desenvolvimento
```bash
npm run dev
```
O servidor estará rodando em `http://localhost:3000`.

---

## 🌐 Publicação no GitHub Pages (100% Gratuito)

Como a aplicação utiliza caminhos relativos e banco de dados IndexedDB no navegador:

1. **Gere a build estática:**
   ```bash
   npm run build
   ```
   Isso criará a pasta `dist`.

2. **Faça o deploy para o GitHub Pages:**
   ```bash
   npx gh-pages -d dist
   ```

3. **No GitHub:**
   - Acesse o repositório > **Settings** > **Pages**.
   - Defina a fonte de publicação como a branch `gh-pages` (pasta `/root`).
   - Acesse a aplicação online, vá em **Configurações & Backup** e salve sua chave gratuita do Gemini para leitura de recibos diretamente pelo navegador.

---

## 🖥️ Como Instalar no Windows / Computador (PWA)

1. Acesse o aplicativo pelo Google Chrome ou Microsoft Edge.
2. Clique no botão **"Instalar no PC"** na barra superior (ou no ícone de monitor na barra de endereço).
3. Confirme a instalação. O aplicativo será adicionado aos seus programas e você poderá abri-lo pela **Área de Trabalho** com dois cliques.

---

## 📄 Licença

Distribuído sob a licença Apache 2.0.

https://hugobalttazar.github.io/Assistente-de-Gastos-/
