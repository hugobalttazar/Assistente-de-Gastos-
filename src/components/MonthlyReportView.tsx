import React, { useState } from 'react';
import {
  Printer,
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle2,
  FileText,
  User,
  CreditCard,
  Building,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { CorporateExpense, CompanySettings } from '../types/expense';
import { exportExpensesToExcel } from '../utils/excelExport';
import { exportExpensesToPdf } from '../utils/pdfExport';

interface MonthlyReportViewProps {
  expenses: CorporateExpense[];
  settings: CompanySettings;
  selectedMonth: string; // YYYY-MM
  onViewExpense: (expense: CorporateExpense) => void;
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  expenses,
  settings,
  selectedMonth,
  onViewExpense,
}) => {
  const [showAttachedReceipts, setShowAttachedReceipts] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Filtra as despesas do mês selecionado e ordena cronologicamente pela data (da mais antiga para a mais recente)
  const monthExpenses = expenses
    .filter((e) => e.date.startsWith(selectedMonth))
    .sort((a, b) => a.date.localeCompare(b.date));
  const totalAmount = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const formatMonthName = (mStr: string) => {
    try {
      const [year, month] = mStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } catch {
      return mStr;
    }
  };

  const monthLabel = formatMonthName(selectedMonth);

  // Geração e Download Direto do PDF Vetorial A4 com Comprovantes Anexados
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await exportExpensesToPdf(
        monthExpenses,
        settings,
        monthLabel,
        showAttachedReceipts
      );
    } catch (err) {
      console.error('Falha ao gerar PDF com jsPDF:', err);
      try {
        window.print();
      } catch (printErr) {
        console.error('Erro na impressão nativa:', printErr);
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch {
      handleDownloadPdf();
    }
  };

  const handleExcelExport = () => {
    exportExpensesToExcel(monthExpenses, settings, monthLabel);
  };

  return (
    <div className="space-y-6">
      {/* Barra de Ações do Relatório (Oculta na Impressão) */}
      <div className="print:hidden bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Relatório de Prestação de Contas · {monthLabel}
            </h2>
            <p className="text-xs text-slate-400">
              {monthExpenses.length} despesas lançadas · Total: R${' '}
              {totalAmount.toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle de Comprovantes no Relatório */}
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700">
            <input
              type="checkbox"
              checked={showAttachedReceipts}
              onChange={(e) => setShowAttachedReceipts(e.target.checked)}
              className="accent-emerald-500 rounded cursor-pointer"
            />
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Incluir Fotos dos Comprovantes</span>
          </label>

          <button
            onClick={handleExcelExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-60"
            title="Gera e baixa o arquivo PDF com todos os comprovantes"
          >
            {isGeneratingPdf ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Gerando PDF Oficial...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Baixar Relatório em PDF</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Abrir diálogo de Impressão do Navegador"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Folha do Relatório (Estilo A4 Oficial Corporativo) */}
      <div
        id="monthly-report-sheet"
        className="bg-white text-slate-900 rounded-xl shadow-2xl p-8 sm:p-12 max-w-5xl mx-auto border border-slate-200 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none"
      >
        {/* Cabeçalho Oficial do Relatório */}
        <div className="border-b-2 border-slate-900 pb-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-emerald-700">
                ASSISTENTE DE GASTOS · GESTÃO CORPORATIVA
              </span>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-0.5">
                RELATÓRIO MENSAL DE DESPESAS COM CARTÃO CORPORATIVO
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Comprovantes e prestação de contas de despesas corporativas para
                reembolso / fechamento contábil.
              </p>
            </div>
            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6 shrink-0">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                Mês de Referência
              </span>
              <span className="text-base font-bold text-slate-900 capitalize block">
                {monthLabel}
              </span>
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                Emissão: {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Dados do Colaborador e Cartão */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Colaborador
              </span>
              <span className="font-semibold text-slate-900 block">
                {settings.employeeName}
              </span>
              <span className="text-[11px] text-slate-600 block">
                {settings.employeeRole}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Departamento
              </span>
              <span className="font-semibold text-slate-900 block">
                {settings.department}
              </span>
              <span className="text-[11px] text-slate-600 block">
                {settings.companyName}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Cartão Corporativo
              </span>
              <span className="font-semibold text-slate-900 block font-mono">
                {settings.corporateCardNumber}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Geral do Mês
              </span>
              <span className="text-base font-bold text-emerald-700 font-mono tabular-nums block">
                R$ {totalAmount.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>

        {/* Tabela Detalhada de Lançamentos */}
        <div className="mb-8">
          <h2 className="text-xs uppercase font-bold text-slate-800 tracking-wider mb-3">
            1. Demonstrativo de Despesas
          </h2>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-700">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 w-20">Data</th>
                  <th className="py-2.5 px-3 w-40">Fornecedor</th>
                  <th className="py-2.5 px-3 w-28">Categoria</th>
                  <th className="py-2.5 px-3">Descrição / Justificativa</th>
                  <th className="py-2.5 px-3 w-24 text-center">Anexo</th>
                  <th className="py-2.5 px-3 w-28 text-right">Valor (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {monthExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Nenhuma despesa para exibir no período selecionado.
                    </td>
                  </tr>
                ) : (
                  monthExpenses.map((exp, index) => (
                    <tr key={exp.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-500">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {exp.date.split('-').reverse().join('/')}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {exp.merchant}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {exp.category}
                      </td>
                      <td className="py-2 px-3 text-slate-700 leading-snug">
                        {exp.description}
                      </td>
                      <td className="py-2 px-3 text-center text-[11px]">
                        {exp.receipt ? (
                          <span className="font-semibold text-emerald-700 font-mono">
                            Doc #{index + 1}
                          </span>
                        ) : (
                          <span className="text-slate-400">Sem anexo</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        R$ {exp.amount.toFixed(2).replace('.', ',')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs">
                  <td colSpan={6} className="py-3 px-3 text-slate-900 text-right">
                    TOTAL DA PRESTAÇÃO DE CONTAS:
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-800 text-sm font-black tabular-nums">
                    R$ {totalAmount.toFixed(2).replace('.', ',')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Galeria de Comprovantes Anexados (Solicitado expressamente pelo usuário) */}
        {showAttachedReceipts && (
          <div className="mb-8 page-break-before">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
              <h2 className="text-xs uppercase font-bold text-slate-800 tracking-wider">
                2. Comprovantes e Notas Fiscais Anexadas
              </h2>
              <span className="text-[11px] text-slate-500">
                {monthExpenses.filter((e) => e.receipt).length} comprovantes
                digitalizados
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {monthExpenses.map((exp, index) => {
                if (!exp.receipt) return null;
                const isPdf =
                  exp.receipt.type === 'application/pdf' ||
                  exp.receipt.name.endsWith('.pdf');

                return (
                  <div
                    key={`voucher-${exp.id}`}
                    className="border border-slate-200 rounded-lg p-4 bg-slate-50 break-inside-avoid flex flex-col justify-between"
                  >
                    <div>
                      {/* Cabeçalho do Anexo */}
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                        <span className="font-bold text-xs text-slate-900">
                          Comprovante #{index + 1} · {exp.merchant}
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-700">
                          R$ {exp.amount.toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 mb-3 space-y-0.5">
                        <p>
                          <span className="font-semibold">Data:</span>{' '}
                          {exp.date.split('-').reverse().join('/')} ·{' '}
                          <span className="font-semibold">Categoria:</span>{' '}
                          {exp.category}
                        </p>
                        <p className="italic text-slate-700">
                          "{exp.description}"
                        </p>
                      </div>
                    </div>

                    {/* Imagem do Comprovante */}
                    <div className="bg-white border border-slate-200 rounded p-2 flex items-center justify-center min-h-[220px] max-h-[360px] overflow-hidden">
                      {isPdf ? (
                        <div className="text-center p-4">
                          <FileText className="w-12 h-12 text-slate-500 mx-auto mb-1" />
                          <span className="text-xs font-mono text-slate-700 block">
                            {exp.receipt.name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            (Documento PDF em anexo)
                          </span>
                        </div>
                      ) : (
                        <img
                          src={exp.receipt.dataUrl}
                          alt={`Comprovante ${exp.merchant}`}
                          className="max-h-[340px] max-w-full object-contain"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bloco de Assinaturas e Aprovação */}
        <div className="border-t-2 border-slate-300 pt-8 mt-12 grid grid-cols-2 gap-12 text-xs">
          <div>
            <div className="border-b border-slate-400 mb-2 h-12" />
            <span className="font-bold text-slate-900 block">
              {settings.employeeName}
            </span>
            <span className="text-slate-600 text-[11px] block">
              Colaborador Solicitante · {settings.employeeRole}
            </span>
          </div>

          <div>
            <div className="border-b border-slate-400 mb-2 h-12" />
            <span className="font-bold text-slate-900 block">
              {settings.approverName || 'Diretoria / Gestão Financeira'}
            </span>
            <span className="text-slate-600 text-[11px] block">
              Aprovação e Conferência Contábil
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
