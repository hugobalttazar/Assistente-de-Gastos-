# Gestor de Despesas de Cartão Corporativo (Estilo Meu Assessor)

Sistema executivo para gestão de despesas de cartão corporativo mensal, com digitalização e extração automática de dados de recibos/comprovantes (imagem e PDF) utilizando Gemini AI, visualização lado a lado do comprovante, categorização e emissão de relatório formal de prestação de contas com exportação em PDF e Excel.

## Decisões Confirmadas e Alinhamento

> [!IMPORTANT]
> As escolhas abaixo foram confirmadas na fase de alinhamento com base na sua solicitação inicial:

- **Armazenamento Inicial**: Armazenamento local direto (armazenamento persistente de dados com suporte a imagens/PDFs em base64 e JSON, com capacidade de download/upload de backup e estrutura já pronta para futura conexão ao Firebase Firestore quando for hospedar no GitHub Pages).
- **Formatos de Relatório**: Suporte triplo — painel visual interativo na tela, relatório diagramado pronto para impressão/PDF formal com comprovantes anexados e exportação de planilha em formato Excel/CSV.
- **Design & Layout**: Inspirado no app **Meu Assessor**, com tema escuro executivo sofisticado (`#0B0F17` / `#111827`), acentos verde esmeralda (`#10B981` / `#059669`), tipografia refinada com números tabulares (`tabular-nums`), cartões de resumo mensais limpos e "mesas" de conferência de despesas.

---

## 1. Visão Geral e Conceito do Produto

- **O que faz**:
  - Permite enviar fotos (JPG, PNG, WebP) ou PDFs de recibos, faturas e notas fiscais de gastos corporativos do cartão de crédito.
  - O motor de inteligência artificial (Gemini) analisa automaticamente o comprovante e extrai com precisão: **data da transação**, **valor (R$)**, **estabelecimento/fornecedor**, **CNPJ/identificador** (se visível), **forma de pagamento** (final do cartão) e **categoria sugerida** (Alimentação, Transporte, Hospedagem, Combustível, Software, etc.).
  - Permite revisar, complementar a **descrição / justificativa corporativa** da despesa (ex.: "Almoço com cliente Alfa", "Uber para o aeroporto") e salvar.
  - Oferece uma central de relatórios mensais onde você seleciona o mês de competência (ex.: Outubro/2026), confere o total consolidado, as categorias e emite o relatório formal de prestação de contas com miniaturas e visualização ampliada do comprovante original.
- **Público-Alvo**:
  - Uso pessoal e executivo para fechamento mensal de despesas de cartão corporativo da empresa, sem retrabalho manual de digitação.
- **Valor Principal**:
  - Elimina horas digitando comprovante por comprovante no fim do mês; gera um documento pronto para enviar ao setor financeiro/RH da sua empresa.

---

## 2. Experiência do Usuário e Design Visual

### Fluxos Principais
1. **Painel Geral (Dashboard Executivo)**:
   - Resumo financeiro do mês selecionado: Total gasto no período, quantidade de comprovantes digitalizados, maior despesa e distribuição gráfica por categoria.
   - Filtro rápido por mês/ano e busca por palavra-chave ou fornecedor.
2. **Leitura Rápida de Comprovante (Quick Scanner / Drag & Drop)**:
   - Área de upload intuitiva para arrastar imagem do celular/computador ou PDF.
   - Pré-visualização instantânea do arquivo com feedback visual de leitura pelo Gemini.
   - Formulário de revisão pré-preenchido pela IA: Data, Fornecedor, Valor R$, Categoria, Descrição/Justificativa, e status de conferência.
   - Botão "Salvar Despesa" com validação imediata.
3. **Mesa de Despesas (Lista de Conferência)**:
   - Tabela de despesas com layout limpo: data, fornecedor, categoria, valor destacado, ícone de visualização rápida do anexo e ações (editar, excluir, visualizar comprovante).
4. **Visualizador de Comprovante em Alta Resolução**:
   - Modal em tela cheia com zoom, rotação e download do arquivo original (imagem ou PDF).
5. **Central de Relatórios & Prestação de Contas**:
   - Visualização do relatório diagramado padrão corporativo:
     - Cabeçalho executivo (Nome do colaborador, Mês de competência, Cartão Corporativo, Total geral).
     - Tabela detalhada de itens com número de referência.
     - Grade/Anexo visual contendo a imagem de cada comprovante vinculada ao seu respectivo número de lançamento.
   - Botão **"Exportar PDF / Imprimir"** (com folha de estilo de impressão limpa e quebra de página automática).
   - Botão **"Exportar Excel (.xlsx / .csv)"** com todas as colunas formatadas para o departamento contábil.
6. **Backup & Migração Firebase**:
   - Aba de configurações com exportação de dados em JSON + ZIP de comprovantes, e formulário simples com campos para vincular credenciais Firebase gratuitas quando você for migrar para o GitHub Pages.

### Identidade Visual (Inspirada no "Meu Assessor")
- **Paleta de Cores**:
  - Fundo principal: Escuro profundo (`#0A0E17` / `#0F172A`).
  - Superfícies/Cartões: Grafite com sutil textura de vidro (`#151C2C`, bordas em `#1E293B`).
  - Acentos de Ação: Verde Esmeralda vivo (`#10B981` no hover `#059669`), transmitindo segurança e precisão financeira.
  - Tipografia: Sans-serif moderna e executiva (`Plus Jakarta Sans` ou `DM Sans`) com números estritamente tabulares (`tabular-nums`, `font-mono`) para alinhamento contábil impecável.
- **Estrutura de Layout**:
  - Barra superior limpa com o seletor do mês de competência e atalhos rápidos.
  - Cartões de KPI métricos (Total Gasto, Pendentes de Justificativa, Quantidade de Comprovantes).
  - Divisão em abas operacionais ("Visão Geral", "Lançamentos & Comprovantes", "Emitir Relatório Mensal", "Configurações & Backup").

---

## 3. Decisões de Produto e Trade-Offs

- **Extração com Gemini Flash (`gemini-3.8-flash`)**:
  - *Abordagem*: Utilizar o modelo multimodal server-side com `responseSchema` estruturado em JSON para devolver pontualmente: `date`, `amount`, `merchant`, `category`, `description` e `taxId`.
  - *Vantagem*: Altíssima acurácia na leitura de cupons fiscais brasileiros (NFC-e, SAT, recibos de táxi/Uber, faturas), inclusive fotos amassadas ou de baixa luminosidade.
- **Armazenamento de Imagens e Comprovantes**:
  - *Abordagem*: Armazenamento local no navegador com IndexedDB (suportando arquivos grandes sem o limite de 5MB do localStorage), espelhado em estado reativo.
  - *Vantagem*: Funciona imediatamente sem exigir criar conta ou configurar chaves de banco de dados neste primeiro momento, e preserva 100% de privacidade para o seu uso próprio.
- **Relatório PDF Nativo e Formatado**:
  - *Abordagem*: Layout de impressão CSS Print otimizado (`@media print`) + renderizador para gerar o documento limpo com paginação e anexos de recibos no formato A4 oficial corporativo.

---

## 4. Arquitetura Técnica e Fluxo de Dados

```
┌────────────────────────────────────────────────────────────────────────┐
│                        INTERFACE DO USUÁRIO                            │
│  (React 19 + Tailwind CSS + Lucide Icons + Formatação Executiva)       │
└──────────────┬────────────────────────────┬────────────────────────────┘
               │                            │
      [Envio de Recibo]            [Relatório Mensal]
      (Imagem ou PDF)              (Filtro de Competência)
               │                            │
               ▼                            ▼
┌──────────────────────────────┐   ┌─────────────────────────────────────┐
│  API Backend (/api/gemini)   │   │  Gerador de Relatórios Corporativos │
│  - SDK @google/genai         │   │  - Prévia visual com comprovantes   │
│  - gemini-3.8-flash          │   │  - Exportação Excel / CSV           │
│  - Schema JSON estruturado   │   │  - Impressão A4 / Salvar como PDF   │
└──────────────┬───────────────┘   └──────────────────┬──────────────────┘
               │                                      │
               ▼                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│               CAMADA DE PERSISTÊNCIA & ARMAZENAMENTO                   │
│  - IndexedDB Local (para salvar metadados e arquivos de comprovantes)  │
│  - Módulo de Exportação/Backup JSON                                    │
│  - Ponte de prontidão para Firebase Firestore (GitHub Pages Ready)     │
└────────────────────────────────────────────────────────────────────────┘
```

### Entidade de Dados Principal (`CorporateExpense`)
- `id`: Identificador único (UUID)
- `date`: Data do gasto (YYYY-MM-DD)
- `merchant`: Nome da loja/estabelecimento (ex: "Posto Ipiranga", "Restaurante Fasano")
- `amount`: Valor numérico (R$)
- `category`: Categoria contábil (Alimentação, Transporte, Hospedagem, Combustível, Outros)
- `description`: Justificativa / descrição do colaborador
- `paymentMethod`: Informação do cartão (ex: "Cartão Corporativo Visa final 4022")
- `receiptFile`: Objeto contendo base64, mimeType, nome original e data de upload
- `status`: Status do lançamento ("Conferido", "Pendente Justificativa")
- `createdAt`: Timestamp de criação

---

## Próximos Passos (Aguardando seu Sinal)

1. Você revisa este plano e fornece o seu sinal de aprovação no botão **"Proceed"** ou pelo chat.
2. Após o seu ok, construiremos a aplicação completa com todos os recursos especificados.
