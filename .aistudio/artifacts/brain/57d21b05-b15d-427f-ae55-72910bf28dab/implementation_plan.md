# Plano de Implementação: Menu Superior Centralizado em Cápsula (Plano 1)

Alinhamento e centralização matemática da barra de navegação superior, garantindo simetria absoluta com os cartões e métricas do painel financeiro.

---

## 1. Diagnóstico Visual & Causa Raiz do "Fora de Esquadro"
- **Assimetria Anterior**: As abas de navegação estavam posicionadas logo após o logotipo à esquerda, enquanto à direita havia múltiplos botões comprimidos (Fatura, Mês, Escanear, Tema, Usuário). Isso gerava um vazio assimétrico no centro e empurrava o perfil do usuário para fora do esquadro vertical do painel.
- **Solução (Plano 1 - Escolhido)**: Arquitetura em **3 Colunas Balanceadas** (`grid grid-cols-12` ou posicionamento relativo com âncora central absoluta `left-1/2 -translate-x-1/2`):
  1. **Coluna Esquerda (Identidade)**: Logotipo e título ("Assistente de Gastos · Cartão Corporativo") perfeitamente alinhados à margem esquerda dos cartões do Dashboard (`px-4 sm:px-6 lg:px-8`).
  2. **Coluna Central (Cápsula de Navegação)**: As 5 abas principais (`Painel`, `Mesa de Despesas`, `Relatório`, `Configurações`, `Faturas`) agrupadas em uma cápsula segmentada flutuante (`rounded-xl p-1 border`), fixada exatamente no centro horizontal da viewport.
  3. **Coluna Direita (Ações & Identificação)**: Seletor de Competência (Mês), Alternador de Tema (Sol/Lua), Botão Primário "+ Escanear" e Perfil Google Drive com indicador de sincronização, rigorosamente alinhados à margem direita dos cartões inferiores.

---

## 2. Detalhamento das Alterações no Código

### A. `src/components/Header.tsx`
- Reestruturação do container principal em 3 blocos com equilíbrio de largura:
  - **Esquerda**: Logotipo em bloco flex shrink-0 com largura definida (~220px).
  - **Centro**: Container `hidden lg:flex items-center justify-center` com cápsula moderna `bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 rounded-xl p-1 shadow-xs`.
  - **Direita**: Grupo flexível alinhado à direita com espaçamento homogêneo `gap-2` e altura uniforme `h-9` em todos os elementos.
- Preservação da barra inferior nativa para celulares (`md:hidden`) e sub-barra de competência/status, garantindo 100% de responsividade mobile.

### B. Esquadro e Grid Geral
- Manutenção do padrão simétrico `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` entre o topo (`Header`), o centro (`Main`) e a base (`Footer`).
- Suporte completo e imediato ao Modo Claro e Modo Escuro em todos os elementos da cápsula central e dos botões de ação.

---

## 3. Validação e Testes
- Compilação via `compile_applet`.
- Verificação de tipos e linter via `lint_applet`.
- Teste de responsividade em resoluções de desktop (1920px, 1440px, 1366px, 1280px), tablet (768px - 1024px) e smartphone (< 768px).
