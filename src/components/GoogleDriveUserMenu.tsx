import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Cloud,
  CloudCheck,
  RefreshCw,
  FolderOpen,
  LogOut,
  Users,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { googleSignIn, logout, getAccessToken } from '../services/googleAuth';
import { DriveSyncInfo } from '../services/googleDriveStorage';

interface GoogleDriveUserMenuProps {
  user: User | null;
  syncInfo: DriveSyncInfo | null;
  isSyncing: boolean;
  onLoginSuccess: (user: User, accessToken: string) => void;
  onLogout: () => void;
  onManualSync: () => void;
  onOpenLeadsModal: () => void;
}

export const GoogleDriveUserMenu: React.FC<GoogleDriveUserMenuProps> = ({
  user,
  syncInfo,
  isSyncing,
  onLoginSuccess,
  onLogout,
  onManualSync,
  onOpenLeadsModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
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
    setAuthError(null);
    setIsLoadingAuth(true);
    try {
      const result = await googleSignIn();
      if (result) {
        onLoginSuccess(result.user, result.accessToken);
      }
    } catch (err: any) {
      console.error('Falha no login com Google:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError('Não foi possível conectar com o Google. Tente novamente.');
      }
    } finally {
      setIsLoadingAuth(false);
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

        {authError && (
          <div className="absolute right-0 top-full mt-2 w-64 p-2 bg-red-950 border border-red-800 text-red-200 text-[11px] rounded-lg shadow-xl z-50">
            {authError}
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
            <span className="text-[9px] text-emerald-400 font-mono">
              {isSyncing ? 'Sincronizando...' : 'Drive Conectado'}
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
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#111827] border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
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

          {/* Informações da Pasta no Drive */}
          <div className="p-3 border-b border-slate-800 bg-emerald-950/20">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium mb-1">
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Pasta: Assistente de Gastos</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Suas despesas e relatórios são salvos de forma privada no seu próprio Google Drive.
            </p>
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
