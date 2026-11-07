import { CorporateExpense } from '../types/expense';

/**
 * Remove acentos, pontuações e converte para minúsculas
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remove sufixos jurídicos e palavras de ruído para comparação empresarial
 */
export function cleanMerchantName(merchant: string): string {
  let cleaned = normalizeText(merchant);
  // Remove termos como ltda, sa, s a, me, epp, eireli, cnpj, etc.
  cleaned = cleaned
    .replace(/\b(ltda|s\s*a|me|epp|eireli|cia|companhia|sociedade|concessionaria|posto|restaurante)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || normalizeText(merchant);
}

/**
 * Normaliza qualquer formato de data comum (YYYY-MM-DD, DD/MM/YYYY, ISO) para YYYY-MM-DD
 */
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();

  // Se já for YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.substring(0, 10);
  }

  // Se for DD/MM/YYYY ou DD-MM-YYYY
  const brMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Se for ISO ou data válida do JS
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {
    // ignore
  }

  return trimmed;
}

/**
 * Extrai somente dígitos do CNPJ
 */
export function cleanCnpj(cnpj?: string): string {
  if (!cnpj) return '';
  return cnpj.replace(/\D/g, '');
}

/**
 * Verifica se dois nomes de estabelecimentos são equivalentes ou referem-se ao mesmo local
 */
export function isMerchantSimilar(merchantA: string, merchantB: string): boolean {
  const normA = normalizeText(merchantA);
  const normB = normalizeText(merchantB);

  // Igualdade exata após normalização básica
  if (normA === normB) return true;

  const cleanA = cleanMerchantName(merchantA);
  const cleanB = cleanMerchantName(merchantB);

  if (cleanA && cleanB) {
    if (cleanA === cleanB) return true;
    // Se um nome contém o outro (ex: "eco050" e "eco050 br050 km198 sul")
    if (cleanA.length >= 4 && cleanB.length >= 4) {
      if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;
    }

    // Compara as palavras significativas
    const wordsA = cleanA.split(' ').filter((w) => w.length >= 3);
    const wordsB = cleanB.split(' ').filter((w) => w.length >= 3);

    if (wordsA.length > 0 && wordsB.length > 0) {
      const commonWords = wordsA.filter((w) => wordsB.includes(w));
      // Se a primeira palavra ou termo principal for idêntico
      if (wordsA[0] === wordsB[0] && wordsA[0].length >= 3) return true;
      if (commonWords.length >= 2) return true;
    }
  }

  return false;
}

/**
 * Detecta se existe uma despesa duplicada na lista com base em:
 * 1. Mesmo Valor (com tolerância de arredondamento de até 5 centavos)
 * 2. Mesma Data (normalizada para YYYY-MM-DD)
 * 3. Mesmo Estabelecimento (por nome aproximado ou CNPJ idêntico)
 */
export function findDuplicateExpense(
  pending: {
    id?: string;
    merchant: string;
    amount: number;
    date: string;
    cnpj?: string;
  },
  existingExpenses: CorporateExpense[]
): CorporateExpense | null {
  const pendingDate = normalizeDate(pending.date);
  const pendingAmount = Number(pending.amount) || 0;
  const pendingCnpj = cleanCnpj(pending.cnpj);

  for (const existing of existingExpenses) {
    // Não compara com a própria despesa se estiver editando
    if (pending.id && existing.id === pending.id) continue;

    // 1. Comparação de Valor
    const existingAmount = Number(existing.amount) || 0;
    const isAmountEqual = Math.abs(pendingAmount - existingAmount) < 0.05;
    if (!isAmountEqual) continue;

    // 2. Comparação de Data
    const existingDate = normalizeDate(existing.date);
    const isDateEqual = pendingDate === existingDate;
    if (!isDateEqual) continue;

    // 3. Comparação de Estabelecimento / CNPJ
    const existingCnpj = cleanCnpj(existing.cnpj);
    // Se ambos tiverem CNPJ cadastrado e os números baterem
    if (pendingCnpj && existingCnpj && pendingCnpj === existingCnpj) {
      return existing;
    }

    // Se o nome do estabelecimento for similar ou contiver o mesmo identificador
    if (isMerchantSimilar(pending.merchant, existing.merchant)) {
      return existing;
    }
  }

  return null;
}
