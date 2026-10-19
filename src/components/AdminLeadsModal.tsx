import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Search,
  Download,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { LeadRegistration, fetchAllLeads } from '../services/leadsService';

interface AdminLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLeadsModal: React.FC<AdminLeadsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [leads, setLeads] = useState<LeadRegistration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadLeads();
    }
  }, [isOpen]);

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllLeads();
      setLeads(data);
    } catch (err) {
      console.error('Erro ao carregar leads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredLeads = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone.includes(searchTerm)
  );

  const exportLeadsToExcel = () => {
    const rows = leads.map((l, index) => ({
      '#': index + 1,
      'Nome do Colaborador': l.name,
      'E-mail (Google)': l.email,
      'Telefone / WhatsApp': l.phone,
      'Consentimento Aceito': l.consentAccepted ? 'Sim (LGPD Aceito)' : 'Não',
      'Data de Cadastro': l.createdAt ? new Date(l.createdAt).toLocaleDateString('pt-BR') : 'N/I',
      'Hora do Cadastro': l.createdAt ? new Date(l.createdAt).toLocaleTimeString('pt-BR') : 'N/I',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads_Usuarios');
    XLSX.writeFile(workbook, `leads_assistente_gastos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Painel de Leads & Usuários Cadastrados
                </h2>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-full">
                  Exclusivo Criador
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Colaboradores que integraram a conta Google e aceitaram o termo de consentimento
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportLeadsToExcel}
              disabled={leads.length === 0}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Exportar planilha Excel com todos os contatos"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar Excel</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Busca e Métricas */}
        <div className="p-4 bg-slate-900/40 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, e-mail ou telefone..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-400">
              Total de Leads:{' '}
              <strong className="text-emerald-400 font-mono text-sm">
                {leads.length}
              </strong>
            </span>
          </div>
        </div>

        {/* Tabela de Leads */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Carregando dados dos leads...</span>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>Nenhum lead encontrado.</p>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-semibold text-slate-400">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Colaborador</th>
                    <th className="py-2.5 px-3">Telefone / WhatsApp</th>
                    <th className="py-2.5 px-3">Data de Cadastro</th>
                    <th className="py-2.5 px-3 text-center">Termos LGPD</th>
                    <th className="py-2.5 px-3 text-right">Contato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredLeads.map((lead, idx) => {
                    const phoneDigits = lead.phone.replace(/\D/g, '');
                    const whatsAppUrl = `https://wa.me/55${phoneDigits}`;

                    return (
                      <tr key={lead.id || idx} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500 text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            {lead.photoUrl ? (
                              <img
                                src={lead.photoUrl}
                                alt={lead.name}
                                className="w-7 h-7 rounded-full border border-slate-700 object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-[10px] font-bold shrink-0">
                                {lead.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="overflow-hidden">
                              <span className="font-semibold text-white block truncate">
                                {lead.name}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono block truncate">
                                {lead.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                          {lead.phone || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR') : 'Hoje'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Aceito</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {phoneDigits.length >= 10 && (
                            <a
                              href={whatsAppUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Iniciar conversa no WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
