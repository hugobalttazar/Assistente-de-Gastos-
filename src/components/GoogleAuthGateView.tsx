import React, { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Cloud,
  Sparkles,
  Lock,
  ArrowRight,
  Smartphone,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { googleSignIn } from '../services/googleAuth';
import { User } from 'firebase/auth';

interface GoogleAuthGateViewProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const GoogleAuthGateView: React.FC<GoogleAuthGateViewProps> = ({
  onLoginSuccess,
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      onLoginSuccess(result.user, result.accessToken);
    } catch (err: any) {
      console.warn('Falha na autenticação Google:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(
          'Não foi possível concluir o login com o Google. Verifique a janela de autenticação ou tente novamente.'
        );
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8 sm:py-12 animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-colors">
        {/* Detalhe de fundo sutil */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Identidade Visual */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 mb-4 flex items-center justify-center">
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-emerald-500" />
            </div>
          </div>

          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Assistente de Gastos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Gestão & Prestação de Contas de Cartão Corporativo
          </p>
        </div>

        {/* Mensagem Obrigatória solicitada pelo Usuário */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center mb-6 space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
            <Cloud className="w-4 h-4 text-emerald-500" />
            <span>Sincronização em Nuvem do Google</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
            Este aplicativo utiliza o motor do Google para salvar algumas informações, entre com sua conta Google para iniciar.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 mb-5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-xs text-red-700 dark:text-red-300 text-center">
            {errorMessage}
          </div>
        )}

        {/* Botão Oficial de Login com Google */}
        <button
          type="button"
          onClick={handleSignIn}
          disabled={isLoggingIn}
          className="w-full py-3.5 px-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-bold text-sm rounded-xl border border-slate-300 dark:border-slate-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 group min-h-[48px]"
        >
          {isLoggingIn ? (
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {isLoggingIn ? 'Conectando conta Google...' : 'Entrar com Conta Google'}
          </span>
        </button>

        {/* Recursos & Garantias de Segurança */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Seus comprovantes e faturas salvos em pasta própria no seu Google Drive</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Sincronização imediata entre seu smartphone (PWA) e computador</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Leitura automática multimodal via IA (OpenRouter)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Acesso restrito e protegido exclusivamente pelo login da sua conta</span>
          </div>
        </div>
      </div>
    </div>
  );
};
