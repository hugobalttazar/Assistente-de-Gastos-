import React, { useState } from 'react';
import { Download, Monitor, CheckCircle2, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Se já estiver rodando instalado como standalone app, não precisa do botão
  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>App Instalado</span>
      </div>
    );
  }

  // Fluxo de instalação no Windows / Chrome / Edge / Desktop
  if (isInstallable) {
    return (
      <button
        onClick={async () => {
          setIsInstalling(true);
          await install();
          setIsInstalling(false);
        }}
        disabled={isInstalling}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
        title="Instalar como aplicativo no Windows / Mac"
      >
        <Monitor className="w-3.5 h-3.5 text-emerald-400" />
        <span>Instalar no PC</span>
      </button>
    );
  }

  // Fluxo Safari no iPhone / iPad
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Instalar no iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <h3 className="text-sm font-bold text-white">
                  Instalar no iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                1. Toque no botão <strong>Compartilhar</strong> na barra do Safari.<br />
                2. Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback discreto com instrução para navegadores desktop que suportam PWA
  return (
    <button
      onClick={() => {
        alert(
          'Para instalar o Assistente de Gastos no seu computador:\n\n1. No Google Chrome ou Microsoft Edge, clique no ícone de computador/instalação que aparece na barra de endereço (lado direito da URL).\n2. Ou acesse o menu (...) > Instalar Assistente de Gastos.\n\nO app criará um atalho nativo na sua Área de Trabalho!'
        );
      }}
      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
      title="Como instalar no seu computador"
    >
      <Monitor className="w-3.5 h-3.5 text-emerald-400" />
      <span>Instalar no PC</span>
    </button>
  );
};
