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
  saveOpenRouterKey,
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
  const [showManualKeyInput, setShowManualKeyInput] = useState(false);
  const [manualKey, setManualKey] = useState('');

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
      setError('Por favor, informe um número de telefone ou WhatsApp válido com DDD.');
      return;
    }

    if (!name.trim()) {
      setError('Por favor, confirme seu nome completo.');
      return;
    }

    if (!consentAccepted) {
      setError('É necessário aceitar os termos de consentimento para prosseguir.');
      return;
    }

    setIsSubmitting(true);
    try {
      const lead = await registerLead({
        id: user.uid,
        name: name.trim(),
        email: user.email || '',
        phone: phone.trim(),
        consentAccepted: true,
        photoUrl: user.photoURL || undefined,
      });

      onSuccess(lead);
    } catch (err: any) {
      console.error('Erro ao registrar consentimento do lead:', err);
      setError(
        err.message || 'Ocorreu um erro ao salvar suas informações. Tente novamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* Cabeçalho */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <FolderLock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Cadastro & Ativação do Google Drive
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Conclua seus dados para criar sua pasta exclusiva na nuvem
              </p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-lg text-red-700 dark:text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Dados do Google (Auto-preenchidos) */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Avatar'}
                className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-400 font-bold">
                {user.email?.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider block">
                Conta Google Conectada
              </span>
              <span className="font-semibold text-slate-900 dark:text-white block truncate">
                {user.displayName || 'Usuário'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block truncate">
                {user.email}
              </span>
            </div>
          </div>

          {/* Nome Completo */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
              Nome Completo do Colaborador *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Telefone / WhatsApp */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              Telefone / WhatsApp Corporativo *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(DDD) 99999-9999"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Utilizado para suporte, comunicação e validações operacionais.
            </span>
          </div>

          {/* Inteligência Artificial Gratuita (OpenRouter) */}
          <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold text-slate-900 dark:text-white">IA Gratuita Ilimitada (OpenRouter)</span>
              </div>
              {hasOpenRouterKey ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Chave Ativada</span>
                </span>
              ) : (
                <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-medium">
                  Recomendado
                </span>
              )}
            </div>

            {!hasOpenRouterKey ? (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Conecte sua conta gratuita do OpenRouter em 1 clique para digitalizar cupons com visão de ponta (Gemini 2.0 & Llama 3.2 Vision) sem custo algum:
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleConnectOpenRouter}
                    disabled={isConnectingOpenRouter}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isConnectingOpenRouter ? 'Conectando...' : 'Conectar OpenRouter Grátis'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowManualKeyInput(!showManualKeyInput)}
                    className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer ml-1"
                  >
                    {showManualKeyInput ? 'Ocultar inserção manual' : 'Inserir chave manualmente'}
                  </button>
                </div>

                {showManualKeyInput && (
                  <div className="pt-2 flex gap-2">
                    <input
                      type="password"
                      placeholder="sk-or-v1-..."
                      value={manualKey}
                      onChange={(e) => setManualKey(e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (manualKey.trim()) {
                          saveOpenRouterKey(manualKey.trim());
                          setHasOpenRouterKey(true);
                        }
                      }}
                      disabled={!manualKey.trim()}
                      className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
                    >
                      Salvar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Pronto! Seus comprovantes serão lidos gratuitamente pela sua conta OpenRouter.</span>
              </p>
            )}
          </div>

          {/* Termo de Adesão e Consentimento (Contrato) */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Termo de Adesão & Consentimento de Dados
            </span>
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-[11px] text-slate-600 dark:text-slate-400 space-y-2 max-h-36 overflow-y-auto leading-relaxed">
              <p>
                <strong className="text-slate-900 dark:text-slate-200">1. Armazenamento Pessoal e Seguro:</strong> Todas as despesas, notas fiscais e relatórios gerados por você serão armazenados exclusivamente na pasta <em>"Assistente de Gastos"</em> dentro do seu próprio Google Drive. Nenhum outro usuário da plataforma possui acesso aos seus documentos financeiros.
              </p>
              <p>
                <strong className="text-slate-900 dark:text-slate-200">2. Consentimento de Contato (Lead):</strong> Nos termos da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), você autoriza o criador e administrador da plataforma a registrar seus dados de contato (Nome, E-mail e Telefone) para fins de comunicação, suporte operacional, novidades e relacionamento comercial.
              </p>
              <p>
                <strong className="text-slate-900 dark:text-slate-200">3. Revogação:</strong> O consentimento de uso da plataforma pode ser revogado a qualquer momento desconectando sua conta Google nas configurações do aplicativo.
              </p>
            </div>

            <label className="flex items-start gap-2.5 mt-3 cursor-pointer group">
              <input
                type="checkbox"
                required
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-emerald-500 focus:ring-emerald-500/20 bg-white dark:bg-slate-900"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                Li, compreendi e concordo com os Termos de Adesão e Consentimento para uso da plataforma.
              </span>
            </label>
          </div>

          {/* Botões */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg transition-colors cursor-pointer min-h-[38px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !consentAccepted}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md min-h-[38px]"
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
