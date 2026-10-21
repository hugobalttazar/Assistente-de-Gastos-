import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Cloud,
  RefreshCw,
  FolderOpen,
  LogOut,
  Users,
  ChevronDown,
  ExternalLink,
  ShieldAlert,
  AlertCircle,
  Copy,
  Check,
  X,
  ArrowRight,
  Globe,
} from 'lucide-react';
import {
  googleSignIn,
  googleSignInRedirect,
  logout,
  parseAuthError,
  AuthErrorInfo,
} from '../services/googleAuth';
import { DriveSyncInfo } from '../services/googleDriveStorage';

interface GoogleDriveUserMenuProps {
  user: User | null;
  syncInfo: DriveSyncInfo | null;
  isSyncing: boolean;
  lastSyncedTime?: Date | null;
  secondsUntilSync?: number;
  onLoginSuccess: (user: User, accessToken: string) => void;
  onLogout: () => void;
  onManualSync: () => void;
  onOpenLeadsModal: () => void;
}

export const GoogleDriveUserMenu: React.FC<GoogleDriveUserMenuProps> = ({
  user,
  syncInfo,
  isSyncing,
  lastSyncedTime,
  secondsUntilSync,
  onLoginSuccess,
  onLogout,
  onManualSync,
  onOpenLeadsModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authErrorInfo, setAuthErrorInfo] = useState<AuthErrorInfo | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignInClick = async () => {
    setAuthErrorInfo(null);
    setIsLoadingAuth(true);
    try {
      const result = await googleSignIn();
      if (result) {
        onLoginSuccess(result.user, result.accessToken);
      }
    } catch (err: any) {
      console.error('Falha no login com Google:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        const errorInfo = parseAuthError(err);
        setAuthErrorInfo(errorInfo);
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSignInRedirectClick = async () => {
    setAuthErrorInfo(null);
    setIsLoadingAuth(true);
    try {
      await googleSignInRedirect();
    } catch (err: any) {
      console.error('Falha no login com redirecionamento:', err);
      setAuthErrorInfo(parseAuthError(err));
      setIsLoadingAuth(false);
    }
  };

  const handleCopyDomain = () => {
    if (authErrorInfo?.currentDomain) {
      navigator.clipboard.writeText(authErrorInfo.currentDomain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleSignOutClick = async () => {
    setIsOpen(false);
    await logout();
    onLogout();
  };

  // Se não estiver logado, exibe botão oficial de login/cadastro
  if (!user) {
    return (
      <div className="relative">
        <button
          onClick={handleSignInClick}
          disabled={isLoadingAuth}
          className="flex items-center gap-2.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 hover:border-emerald-500/50 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50 group"
          title="Fazer login ou cadastro e conectar sua pasta no Google Drive"
        >
          {isLoadingAuth ? (
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
          <span>Realizar Login</span>
        </button>

        {/* Modal / Card Informativo com Diagnóstico do Erro */}
        {authErrorInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative text-left">
              <button
                type="button"
                onClick={() => setAuthErrorInfo(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              {authErrorInfo.isUnauthorizedDomain ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {authErrorInfo.title}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Configuração de segurança do Google Authentication
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    Por segurança, o Google exige que o endereço onde a plataforma está hospedada (neste caso, o <strong>GitHub Pages</strong>) esteja cadastrado na lista de <strong>Domínios Autorizados</strong> do seu projeto Firebase.
                  </p>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 mb-4 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400 block">
                      Domínio a ser autorizado:
                    </span>
                    <div className="flex items-center justify-between gap-2 p-2 bg-slate-950 border border-slate-800 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-mono text-xs text-emerald-300 truncate">
                          {authErrorInfo.currentDomain}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyDomain}
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                      >
                        {copiedDomain ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 mb-5 text-xs text-slate-300 space-y-2">
                    <span className="font-semibold text-white block">
                      Passo a passo rápido (apenas 1 vez):
                    </span>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px]">
                      <li>
                        Abra o <strong className="text-white">Firebase Console</strong> clicando no botão abaixo.
                      </li>
                      <li>
                        Vá na aba <strong className="text-white">Settings (Configurações)</strong> &gt; <strong className="text-white">Authorized domains (Domínios autorizados)</strong>.
                      </li>
                      <li>
                        Clique em <strong className="text-white">Adicionar domínio</strong>, cole <code className="text-emerald-400 font-mono">{authErrorInfo.currentDomain}</code> e salve.
                      </li>
                    </ol>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                    <a
                      href={authErrorInfo.consoleSettingsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md"
                    >
                      <span>Abrir Firebase Console</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={handleSignInClick}
                      className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Já adicionei, Tentar Login</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {authErrorInfo.title}
                      </h3>
                      <span className="font-mono text-[10px] text-slate-500">
                        {authErrorInfo.code}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-5">
                    {authErrorInfo.message}
                  </p>

                  <div className="flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setAuthErrorInfo(null)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                      Fechar
                    </button>
                    {authErrorInfo.isPopupBlocked && (
                      <button
                        type="button"
                        onClick={handleSignInRedirectClick}
                        className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors cursor-pointer"
                      >
                        Tentar via Redirecionamento
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSignInClick}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors cursor-pointer"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Usuário Logado: Avatar + Status da Pasta Google Drive + Dropdown
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 pl-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer group"
      >
        {/* Indicador de Nuvem / Sincronização */}
        <div className="flex items-center gap-1.5 text-xs">
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          ) : syncInfo ? (
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Cloud className="w-3.5 h-3.5 text-slate-400" />
          )}

          <div className="hidden md:flex flex-col text-left">
            <span className="text-[11px] font-medium text-white truncate max-w-[120px]">
              {user.displayName?.split(' ')[0] || 'Usuário'}
            </span>
            <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
              {isSyncing ? (
                'Sincronizando...'
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Auto-Sync 1 min</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Foto de Perfil */}
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'Avatar'}
            className="w-7 h-7 rounded-lg border border-slate-700 object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-bold">
            {user.displayName?.slice(0, 1) || 'U'}
          </div>
        )}

        <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-white transition-transform" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-[#111827] border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Identificação do Usuário */}
          <div className="p-3 bg-slate-900/80 border-b border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Conta Conectada
            </span>
            <span className="font-semibold text-white block truncate">
              {user.displayName || 'Colaborador'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono block truncate">
              {user.email}
            </span>
          </div>

          {/* Informações da Pasta no Drive & Status de Auto-Sync */}
          <div className="p-3 border-b border-slate-800 bg-emerald-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Pasta: Assistente de Gastos</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                Auto-Sync 1 min
              </span>
            </div>
            <p className="text-[10px] text-slate-300 leading-tight">
              Sincronização em tempo real ativa a cada 1 minuto com o Google Drive. Suas alterações ficam disponíveis instantaneamente em todos os seus dispositivos.
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Próximo ciclo:</span>
              </div>
              <span className="text-emerald-400 font-bold">{secondsUntilSync ?? 60}s</span>
            </div>
            {lastSyncedTime && (
              <div className="text-[9px] text-slate-400 text-right font-mono">
                Última sincronização: {lastSyncedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="p-1 space-y-0.5">
            {syncInfo?.folderUrl && (
              <a
                href={syncInfo.folderUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="w-full px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Abrir Pasta no Google Drive</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            )}

            <button
              onClick={() => {
                setIsOpen(false);
                onManualSync();
              }}
              disabled={isSyncing}
              className="w-full px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg flex items-center gap-2 transition-colors cursor-pointer text-left disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sincronizar com Drive Agora</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                onOpenLeadsModal();
              }}
              className="w-full px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg flex items-center justify-between transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>Painel de Leads (Criador)</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">
                Admin
              </span>
            </button>
          </div>

          {/* Sair */}
          <div className="p-1 border-t border-slate-800">
            <button
              onClick={handleSignOutClick}
              className="w-full px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg flex items-center gap-2 transition-colors cursor-pointer text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Desconectar Conta</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
