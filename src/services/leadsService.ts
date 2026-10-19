export interface LeadRegistration {
  id?: string;
  name: string;
  email: string;
  phone: string;
  photoUrl?: string;
  consentAccepted: boolean;
  consentTimestamp?: string;
  createdAt?: string;
}

const LOCAL_STORAGE_LEAD_KEY = 'meu_assessor_lead_profile';

/**
 * Salva o lead no backend e armazena cópia local no navegador
 */
export async function registerLead(leadData: LeadRegistration): Promise<LeadRegistration> {
  const payload = {
    ...leadData,
    consentAccepted: true,
    consentTimestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      const savedLead = data.lead || payload;
      localStorage.setItem(LOCAL_STORAGE_LEAD_KEY, JSON.stringify(savedLead));
      return savedLead;
    }
  } catch (err) {
    console.warn('Erro ao sincronizar lead com o servidor:', err);
  }

  // Backup em localStorage
  localStorage.setItem(LOCAL_STORAGE_LEAD_KEY, JSON.stringify(payload));
  return payload;
}

/**
 * Retorna o cadastro de lead salvo localmente
 */
export function getLocalLeadProfile(): LeadRegistration | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LEAD_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Obtém a lista de todos os leads cadastrados para o Painel do Criador
 */
export async function fetchAllLeads(): Promise<LeadRegistration[]> {
  try {
    const res = await fetch('/api/leads');
    if (res.ok) {
      const data = await res.json();
      return data.leads || [];
    }
  } catch (err) {
    console.error('Falha ao buscar leads:', err);
  }

  // Se falhar na rede, retorna o lead local se existir
  const local = getLocalLeadProfile();
  return local ? [local] : [];
}
