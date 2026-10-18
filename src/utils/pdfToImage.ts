import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Inicializa o worker do PDF.js de forma resiliente
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

/**
 * Converte a primeira página de um arquivo PDF para imagem JPEG em base64.
 * Renderiza em resolução nítida (escala 2.0) ideal para recibos, cupons fiscais e DANFEs.
 */
export async function convertPdfFirstPageToImage(
  pdfData: ArrayBuffer | Uint8Array | string
): Promise<{ dataUrl: string; width: number; height: number }> {
  let sourceData: any;

  if (typeof pdfData === 'string') {
    // Se for dataUrl ("data:application/pdf;base64,...")
    const cleanBase64 = pdfData.includes(',') ? pdfData.split(',')[1] : pdfData;
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    sourceData = { data: bytes };
  } else {
    sourceData = { data: pdfData };
  }

  const loadingTask = pdfjsLib.getDocument(sourceData);
  const pdf = await loadingTask.promise;

  // Carrega a página 1 (onde estão o cabeçalho, valores e dados fiscais)
  const page = await pdf.getPage(1);

  // Escala 2.0 garante nitidez impecável para textos pequenos e códigos de barras
  const viewport = page.getViewport({ scale: 2.0 });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Falha ao obter contexto 2D do Canvas para renderizar o PDF.');
  }

  // Preenche o fundo com branco puro antes de desenhar o documento
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvas: canvas,
    canvasContext: context,
    viewport: viewport,
  }).promise;

  // Converte o canvas para imagem JPEG de alta qualidade
  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);

  return {
    dataUrl: jpegDataUrl,
    width: canvas.width,
    height: canvas.height,
  };
}
