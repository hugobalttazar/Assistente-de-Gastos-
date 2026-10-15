import * as XLSX from 'xlsx';
import { CorporateExpense, CompanySettings } from '../types/expense';

export function exportExpensesToExcel(
  expenses: CorporateExpense[],
  settings: CompanySettings,
  monthLabel: string
) {
  // Cria uma nova pasta de trabalho
  const wb = XLSX.utils.book_new();

  // Prepara os dados detalhados para a primeira aba
  const headerInfo = [
    ['ASSISTENTE DE GASTOS - RELATÓRIO MENSAL DE CARTÃO CORPORATIVO'],
    ['Mês de Competência:', monthLabel],
    ['Colaborador:', `${settings.employeeName} (${settings.employeeRole})`],
    ['Departamento:', settings.department],
    ['Empresa:', settings.companyName],
    ['Cartão Corporativo:', settings.corporateCardNumber],
    ['Data de Emissão:', new Date().toLocaleDateString('pt-BR')],
    [], // linha em branco
  ];

  const tableHeaders = [
    'Item',
    'Data',
    'Estabelecimento / Fornecedor',
    'Categoria',
    'Descrição / Justificativa',
    'CNPJ',
    'Forma de Pagamento',
    'Status',
    'Comprovante Anexo',
    'Valor (R$)',
  ];

  // Ordena cronologicamente por data (da mais antiga para a mais recente)
  const sortedExpenses = [...expenses].sort((a, b) => a.date.localeCompare(b.date));

  let totalAmount = 0;
  const tableRows = sortedExpenses.map((exp, index) => {
    totalAmount += exp.amount;
    const dateFormatted = exp.date
      ? exp.date.split('-').reverse().join('/')
      : '';
    return [
      index + 1,
      dateFormatted,
      exp.merchant,
      exp.category,
      exp.description,
      exp.cnpj || 'N/I',
      exp.paymentMethod || settings.corporateCardNumber,
      exp.status === 'conferido' ? 'Conferido' : 'Pendente',
      exp.receipt ? `Sim (${exp.receipt.name})` : 'Não anexado',
      exp.amount,
    ];
  });

  const totalRow = [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'TOTAL GERAL:',
    totalAmount,
  ];

  const fullSheetData = [...headerInfo, tableHeaders, ...tableRows, totalRow];
  const ws = XLSX.utils.aoa_to_sheet(fullSheetData);

  // Define larguras das colunas
  ws['!cols'] = [
    { wch: 6 }, // Item
    { wch: 12 }, // Data
    { wch: 28 }, // Fornecedor
    { wch: 24 }, // Categoria
    { wch: 45 }, // Descrição
    { wch: 20 }, // CNPJ
    { wch: 26 }, // Forma de Pagamento
    { wch: 14 }, // Status
    { wch: 28 }, // Comprovante Anexo
    { wch: 16 }, // Valor
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Prestação de Contas');

  // Segunda aba: Resumo Consolidado por Categoria
  const categoriesMap: Record<string, { count: number; total: number }> = {};
  for (const exp of expenses) {
    const cat = exp.category || 'Outros';
    if (!categoriesMap[cat]) {
      categoriesMap[cat] = { count: 0, total: 0 };
    }
    categoriesMap[cat].count += 1;
    categoriesMap[cat].total += exp.amount;
  }

  const categorySummaryRows = [
    ['RESUMO DE GASTOS POR CATEGORIA'],
    ['Competência:', monthLabel],
    [],
    ['Categoria', 'Qtd. Comprovantes', 'Subtotal (R$)', '% do Total'],
  ];

  Object.entries(categoriesMap)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([cat, data]) => {
      const pct = totalAmount > 0 ? (data.total / totalAmount) * 100 : 0;
      categorySummaryRows.push([
        cat,
        data.count.toString(),
        data.total.toFixed(2),
        `${pct.toFixed(1)}%`,
      ]);
    });

  categorySummaryRows.push([
    'TOTAL',
    expenses.length.toString(),
    totalAmount.toFixed(2),
    '100.0%',
  ]);

  const wsSummary = XLSX.utils.aoa_to_sheet(categorySummaryRows);
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo por Categoria');

  // Nome do arquivo padronizado
  const cleanMonth = monthLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Relatorio_Cartao_Corporativo_${cleanMonth}.xlsx`;

  XLSX.writeFile(wb, filename);
}
