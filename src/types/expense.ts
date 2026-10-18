export interface ReceiptFile {
  dataUrl: string; // base64 data url (image or pdf)
  name: string;
  type: string; // mimeType
  size: number;
  originalPdfUrl?: string; // Mantém o PDF original se convertido para visualização
}

export type ExpenseCategory =
  | 'Alimentação'
  | 'Transporte / Táxi / Uber'
  | 'Combustível'
  | 'Hospedagem'
  | 'Passagens'
  | 'Material de Escritório'
  | 'Software & Serviços'
  | 'Outros';

export interface CorporateExpense {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // in BRL
  merchant: string;
  category: ExpenseCategory | string;
  description: string;
  notes?: string;
  cnpj?: string;
  paymentMethod: string;
  receipt?: ReceiptFile;
  status: 'conferido' | 'pendente';
  createdAt: string;
}

export interface CompanySettings {
  employeeName: string;
  employeeRole: string;
  department: string;
  companyName: string;
  corporateCardNumber: string; // e.g. "Final 4022"
  approverName: string;
  currency: string;
  geminiApiKey?: string;
}

export interface ScannedReceiptData {
  date?: string;
  amount?: number;
  merchant?: string;
  category?: string;
  description?: string;
  cnpj?: string;
  paymentMethod?: string;
  confidenceNotes?: string;
}
