import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  ShieldCheck,
  FileText,
  User as UserIcon,
  Mail,
  Phone,
  FolderLock,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { LeadRegistration, registerLead } from '../services/leadsService';
import {
  createOpenRouterAuthUrl,
  getStoredOpenRouterKey,
} from '../services/openRouterService';

interface LeadRegistrationModalProps {
  isOpen: boolean;
  user: User;
  onSuccess: (lead: LeadRegistration) => void;
  onCancel: () => void;
}

export const LeadRegistrationModal: React.FC<LeadRegistrationModalProps> = ({
  isOpen,
  user,
  onSuccess,
  onCancel,
}) => {
  const [name, setName] = useState(user.displayName || '');
  const [phone, setPhone] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado da chave OpenRouter
  const [hasOpenRouterKey, setHasOpenRouterKey] = useState<boolean>(
    Boolean(getStoredOpenRouterKey())
  );
  const [isConnectingOpenRouter, setIsConnectingOpenRouter] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OPENROUTER_KEY_OBTAINED') {
        setHasOpenRouterKey(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectOpenRouter = async () => {
    setIsConnectingOpenRouter(true);
    try {
      const { url } = await createOpenRouterAuthUrl();
      const popup = window.open(
        url,
        'openrouter_auth',
        'width=650,height=750,menubar=no,toolbar=no,location=no'
      );
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Falha ao abrir OpenRouter:', err);
    } finally {
      setIsConnectingOpenRouter(false);
    }
  };

  if (!isOpen) return null;

  // Formatação automática do telefone brasileiro (11) 99999-9999
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.length > 11) raw = raw.slice(0, 11);

    let formatted = raw;
    if (raw.length > 2) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    }
    if (raw.length > 7) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    }
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rawPhoneDigits = phone.replace(/\D/g, '');
    if (rawPhoneDigits.length < 10) {
      setError('Por favor, informe um número de telefone com DDD válido.');
      return;
    }

    if (!consentAccepted) {
      setError('É necessário concordar com o Termo de Adesão e Consentimento para continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const savedLead = await registerLead({
        name: name.trim() || user.displayName || 'Usuário',
        email: user.email || '',
        phone: phone.trim(),
        photoUrl: user.photoURL || '',
        consentAccepted: true,
      });

      onSuccess(savedLead);
    } catch (err: any) {
      setError('Erro ao salvar cadastro. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabeçalho */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FolderLock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Cadastro & Ativação do Google Drive
              </h2>
              <p className="text-xs text-slate-400">
                Conclua seus dados para criar sua pasta exclusiva na nuvem
              </p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Dados do Google (Auto-preenchidos) */}
          <div className="flex items-center gap-3 p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Avatar'}
                className="w-10 h-10 rounded-full border border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                {user.email?.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden">
              <span className="text-[10px] text-emerald-400 font-semibold uppercase block">
                Conta Google Conectada
              </span>
              <span className="font-semibold text-white block truncate">
                {user.displayName || 'Usuário'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono block truncate">
                {user.email}
              </span>
            </div>
          </div>

          {/* Nome Completo */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
              Nome Completo do Colaborador *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Telefone / WhatsApp */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              Telefone / WhatsApp Corporativo *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(DDD) 99999-9999"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Utilizado para suporte, comunicação e validações operacionais.
            </span>
          </div>

          {/* Inteligência Artificial Gratuita (OpenRouter) */}
          <div className="mt-3 p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white">IA Gratuita Ilimitada (OpenRouter)</span>
              </div>
              {hasOpenRouterKey ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Chave Ativada</span>
                </span>
              ) : (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-medium">
                  Recomendado
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              O OpenRouter roteia inteligência artificial gratuita para leitura de comprovantes. Ao autorizar, o sistema captura sua chave de API automaticamente em 1 clique.
            </p>
            {!hasOpenRouterKey ? (
              <button
                type="button"
                onClick={handleConnectOpenRouter}
                disabled={isConnectingOpenRouter}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {isConnectingOpenRouter ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <span>Conectando ao OpenRouter...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Conectar OpenRouter (Captura Automática)</span>
                  </>
                )}
              </button>
            ) : (
              <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Pronto! Seus comprovantes serão lidos gratuitamente pela sua conta OpenRouter.</span>
              </p>
            )}
          </div>

          {/* Termo de Adesão e Consentimento (Contrato) */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <span className="text-[11px] font-bold text-slate-300 uppercase block mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Termo de Adesão & Consentimento de Dados
            </span>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-400 space-y-2 max-h-36 overflow-y-auto leading-relaxed">
              <p>
                <strong className="text-slate-200">1. Armazenamento Pessoal e Seguro:</strong> Todas as despesas, notas fiscais e relatórios gerados por você serão armazenados exclusivamente na pasta <em>"Assistente de Gastos"</em> dentro do seu próprio Google Drive. Nenhum outro usuário da plataforma possui acesso aos seus documentos financeiros.
              </p>
              <p>
                <strong className="text-slate-200">2. Consentimento de Contato (Lead):</strong> Nos termos da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), você autoriza o criador e administrador da plataforma a registrar seus dados de contato (Nome, E-mail e Telefone) para fins de comunicação, suporte operacional, novidades e relacionamento comercial.
              </p>
              <p>
                <strong className="text-slate-200">3. Revogação:</strong> O consentimento de uso da plataforma pode ser revogado a qualquer momento desconectando sua conta Google nas configurações do aplicativo.
              </p>
            </div>

            <label className="flex items-start gap-2.5 mt-3 cursor-pointer group">
              <input
                type="checkbox"
                required
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20 bg-slate-900"
              />
              <span className="text-xs text-slate-300 group-hover:text-white transition-colors">
                Li, compreendi e concordo com os Termos de Adesão e Consentimento para uso da plataforma.
              </span>
            </label>
          </div>

          {/* Botões */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !consentAccepted}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Ativando Pasta...</span>
                </>
              ) : (
                <>
                  <span>Concluir & Ativar Google Drive</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
