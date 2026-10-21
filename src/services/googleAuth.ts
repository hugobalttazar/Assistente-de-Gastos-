import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Inicializa o app do Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Escopos obrigatórios: Acesso à pasta do aplicativo no Google Drive + Perfil
export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// Força a seleção de conta para permitir trocar de usuário se necessário
provider.setCustomParameters({
  prompt: 'select_account',
});

// Cache do token em memória durante a sessão
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface AuthErrorInfo {
  code: string;
  title: string;
  message: string;
  isUnauthorizedDomain: boolean;
  isPopupBlocked: boolean;
  currentDomain: string;
  projectId: string;
  consoleSettingsUrl: string;
}

/**
 * Converte erros técnicos do Firebase em informações amigáveis e acionáveis
 */
export function parseAuthError(error: any): AuthErrorInfo {
  const code = error?.code || 'auth/unknown';
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
  const projectId = firebaseConfig.projectId || '';
  const consoleSettingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

  if (code === 'auth/unauthorized-domain') {
    return {
      code,
      title: 'Domínio não autorizado no Firebase',
      message: `O domínio atual (${currentDomain}) não está cadastrado na lista de domínios autorizados do Firebase Authentication.`,
      isUnauthorizedDomain: true,
      isPopupBlocked: false,
      currentDomain,
      projectId,
      consoleSettingsUrl,
    };
  }

  if (code === 'auth/popup-blocked') {
    return {
      code,
      title: 'Pop-up bloqueado pelo navegador',
      message: 'O navegador bloqueou a janela pop-up de login do Google. Por favor, permita pop-ups para este site ou utilize o modo de redirecionamento.',
      isUnauthorizedDomain: false,
      isPopupBlocked: true,
      currentDomain,
      projectId,
      consoleSettingsUrl,
    };
  }

  if (code === 'auth/cancelled-popup-request') {
    return {
      code,
      title: 'Tentativa anterior cancelada',
      message: 'Uma tentativa anterior de login ainda estava em andamento. Tente clicar novamente.',
      isUnauthorizedDomain: false,
      isPopupBlocked: false,
      currentDomain,
      projectId,
      consoleSettingsUrl,
    };
  }

  if (code === 'auth/network-request-failed') {
    return {
      code,
      title: 'Falha de conexão',
      message: 'Não foi possível conectar aos servidores do Google. Verifique sua conexão com a internet.',
      isUnauthorizedDomain: false,
      isPopupBlocked: false,
      currentDomain,
      projectId,
      consoleSettingsUrl,
    };
  }

  return {
    code,
    title: 'Falha na autenticação',
    message: error?.message || 'Não foi possível conectar com o Google. Tente novamente.',
    isUnauthorizedDomain: false,
    isPopupBlocked: false,
    currentDomain,
    projectId,
    consoleSettingsUrl,
  };
}

/**
 * Inicializa o observador de estado de autenticação e captura retorno de redirecionamento
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  // Trata retorno de login por redirecionamento (caso usado em mobile ou navegador restrito)
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          if (onAuthSuccess) {
            onAuthSuccess(result.user, cachedAccessToken);
          }
        }
      }
    })
    .catch((err) => {
      console.warn('Erro ao processar resultado do redirect:', err);
    });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

/**
 * Dispara o pop-up de login oficial do Google com concessão dos escopos
 */
export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
}> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro no login com Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Alternativa de login via redirecionamento (útil se pop-ups forem bloqueados)
 */
export const googleSignInRedirect = async (): Promise<void> => {
  isSigningIn = true;
  await signInWithRedirect(auth, provider);
};

/**
 * Retorna o access token atual em memória
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Desconecta o usuário e limpa o token em memória
 */
export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } finally {
    cachedAccessToken = null;
  }
};
