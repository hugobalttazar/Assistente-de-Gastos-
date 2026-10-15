import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CorporateExpense, CompanySettings } from '../types/expense';

// Converte qualquer formato de imagem (SVG, WebP, JPEG, PNG) para PNG/JPEG compatível com jsPDF
async function prepareImageForPdf(
  dataUrl: string
): Promise<{ dataUrl: string; format: 'JPEG' | 'PNG'; width: number; height: number } | null> {
  if (!dataUrl) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const width = img.naturalWidth || 600;
      const height = img.naturalHeight || 800;

      // Se já for JPEG ou PNG nativo
      if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
        resolve({ dataUrl, format: 'JPEG', width, height });
        return;
      }
      if (dataUrl.startsWith('data:image/png')) {
        resolve({ dataUrl, format: 'PNG', width, height });
        return;
      }

      // Converte SVG ou WebP via Canvas para PNG com fundo branco
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          format: 'PNG',
          width,
          height,
        });
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export async function exportExpensesToPdf(
  expenses: CorporateExpense[],
  settings: CompanySettings,
  monthLabel: string,
  includeReceipts: boolean = true
): Promise<void> {
  // Cria documento A4 (210 x 297 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Cores institucionais
  const primaryDark = '#0B0F17';
  const emeraldColor = '#059669';
  const slate600 = '#475569';
  const slate200 = '#E2E8F0';

  let currentY = margin;

  // --- CABEÇALHO DO RELATÓRIO ---
  doc.setFillColor(11, 15, 23); // #0B0F17
  doc.rect(margin, currentY, contentWidth, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('ASSISTENTE DE GASTOS · RELATÓRIO DE CARTÃO CORPORATIVO', margin + 6, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129); // #10B981
  doc.text(`Competência: ${monthLabel.toUpperCase()}`, margin + 6, currentY + 16);

  doc.setTextColor(148, 163, 184); // #94A3B8
  const dateStr = `Emissão: ${new Date().toLocaleDateString('pt-BR')}`;
  doc.text(dateStr, pageWidth - margin - 6 - doc.getTextWidth(dateStr), currentY + 16);

  currentY += 28;

  // --- BLOCO DE IDENTIFICAÇÃO (4 QUADROS) ---
  const boxWidth = (contentWidth - 6) / 2;
  const boxHeight = 16;

  // Caixa 1: Colaborador
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('COLABORADOR SOLICITANTE', margin + 4, currentY + 5);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(settings.employeeName, margin + 4, currentY + 11);

  // Caixa 2: Empresa & Departamento
  doc.roundedRect(margin + boxWidth + 6, currentY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('EMPRESA / DEPARTAMENTO', margin + boxWidth + 10, currentY + 5);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${settings.companyName} (${settings.department})`, margin + boxWidth + 10, currentY + 11);

  currentY += boxHeight + 4;

  // Caixa 3: Cartão Corporativo
  doc.roundedRect(margin, currentY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('CARTÃO CORPORATIVO', margin + 4, currentY + 5);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(settings.corporateCardNumber, margin + 4, currentY + 11);

  // Caixa 4: Total em Despesas
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(margin + boxWidth + 6, currentY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105);
  doc.text(`TOTAL DO MÊS (${expenses.length} DESPESAS)`, margin + boxWidth + 10, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(4, 120, 87);
  doc.text(`R$ ${totalAmount.toFixed(2).replace('.', ',')}`, margin + boxWidth + 10, currentY + 12);

  currentY += boxHeight + 8;

  // --- TABELA DE ITENS (autoTable) ---
  const tableRows = expenses.map((exp, index) => {
    const formattedDate = exp.date ? exp.date.split('-').reverse().join('/') : '';
    const hasReceipt = exp.receipt ? `Doc #${index + 1}` : 'Sem anexo';
    return [
      String(index + 1),
      formattedDate,
      exp.merchant,
      exp.category,
      exp.description,
      hasReceipt,
      `R$ ${exp.amount.toFixed(2).replace('.', ',')}`,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Data', 'Estabelecimento', 'Categoria', 'Descrição / Justificativa', 'Anexo', 'Valor (R$)']],
    body: tableRows,
    foot: [
      [
        '',
        '',
        '',
        '',
        'TOTAL GERAL DA PRESTAÇÃO:',
        `${expenses.filter((e) => e.receipt).length} anexos`,
        `R$ ${totalAmount.toFixed(2).replace('.', ',')}`,
      ],
    ],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [5, 150, 105],
      fontStyle: 'bold',
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 36 },
      3: { cellWidth: 28 },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
  });

  // Pega a posição Y final da tabela
  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY || currentY + 40;

  // Se houver espaço na primeira página, coloca as assinaturas
  if (finalY + 45 > pageHeight - margin) {
    doc.addPage();
    finalY = margin + 10;
  } else {
    finalY += 12;
  }

  // --- BLOCO DE ASSINATURAS ---
  const signWidth = (contentWidth - 20) / 2;

  // Linha Colaborador
  doc.setDrawColor(148, 163, 184);
  doc.line(margin, finalY + 15, margin + signWidth, finalY + 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(settings.employeeName, margin, finalY + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${settings.employeeRole} · Solicitante`, margin, finalY + 24);

  // Linha Aprovador
  doc.line(margin + signWidth + 20, finalY + 15, pageWidth - margin, finalY + 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(settings.approverName || 'Diretoria / Gestão Financeira', margin + signWidth + 20, finalY + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Aprovação & Conferência Contábil', margin + signWidth + 20, finalY + 24);

  // --- ANEXO DOS COMPROVANTES (FOTOS / RECIBOS) ---
  if (includeReceipts) {
    const expensesWithReceipts = expenses
      .map((exp, index) => ({ exp, itemIndex: index + 1 }))
      .filter((item) => item.exp.receipt && item.exp.receipt.dataUrl);

    for (let i = 0; i < expensesWithReceipts.length; i++) {
      const { exp, itemIndex } = expensesWithReceipts[i];
      if (!exp.receipt) continue;

      doc.addPage();

      // Cabeçalho da página de anexo
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, margin, contentWidth, 16, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(255, 255, 255);
      doc.text(
        `COMPROVANTE ANEXO · ITEM #${itemIndex}: ${exp.merchant.toUpperCase()}`,
        margin + 4,
        margin + 7
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(16, 185, 129);
      doc.text(
        `Data: ${exp.date.split('-').reverse().join('/')}  |  Valor: R$ ${exp.amount
          .toFixed(2)
          .replace('.', ',')}  |  Categoria: ${exp.category}`,
        margin + 4,
        margin + 12
      );

      // Caixa da Justificativa
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, margin + 20, contentWidth, 14, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('JUSTIFICATIVA CORPORATIVA:', margin + 4, margin + 24);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`"${exp.description}"`, margin + 4, margin + 30);

      // Imagem do Comprovante
      const imgY = margin + 38;
      const maxImgWidth = contentWidth;
      const maxImgHeight = pageHeight - imgY - margin - 8;

      try {
        const prep = await prepareImageForPdf(exp.receipt.dataUrl);
        if (prep) {
          // Calcula aspect ratio para caber perfeito sem distorção
          const scale = Math.min(maxImgWidth / prep.width, maxImgHeight / prep.height);
          const finalW = prep.width * scale;
          const finalH = prep.height * scale;
          const centeredX = margin + (contentWidth - finalW) / 2;

          doc.addImage(prep.dataUrl, prep.format, centeredX, imgY, finalW, finalH, undefined, 'FAST');
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text('(Documento PDF ou anexo armazenado)', margin + 4, imgY + 20);
        }
      } catch (imgErr) {
        console.warn('Erro inserindo imagem no PDF:', imgErr);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('(Comprovante em arquivo eletrônico original)', margin + 4, imgY + 20);
      }
    }
  }

  // Nome do arquivo
  const cleanMonth = monthLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Relatorio_Cartao_Corporativo_${cleanMonth}.pdf`;

  // Salva diretamente o PDF
  doc.save(filename);
}
