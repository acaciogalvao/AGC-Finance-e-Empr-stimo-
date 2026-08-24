import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check, Share2, PlusSquare, HelpCircle, ExternalLink } from 'lucide-react';

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed PWA)
    const checkStandalone = () => {
      try {
        const isStandaloneMode =
          (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
          (typeof window !== 'undefined' && (window.navigator as any)?.standalone === true) ||
          (typeof document !== 'undefined' && document.referrer?.includes('android-app://'));
        setIsStandalone(!!isStandaloneMode);
      } catch {
        setIsStandalone(false);
      }
    };

    checkStandalone();

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Retrieve dismissal status from localStorage
      const dismissed = localStorage.getItem('agc_pwa_dismissed') === 'true';
      if (!dismissed) {
        setIsDismissed(false);
      }
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      console.log('[PWA] Aplicativo instalado com sucesso!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[PWA] Usuário escolheu: ${outcome}`);
        if (outcome === 'accepted') {
          setIsStandalone(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('[PWA] Erro ao disparar prompt de instalação:', err);
        setShowInstructionsModal(true);
      }
    } else {
      setShowInstructionsModal(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('agc_pwa_dismissed', 'true');
  };

  // If running inside standalone PWA mode, don't show the banner
  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* Top Floating PWA Banner */}
      {!isDismissed && (
        <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 text-white border-b border-emerald-500/30 px-4 py-3 shadow-md relative z-30">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-xs sm:text-sm text-white">
                    Instalar Aplicativo AGC Finance
                  </span>
                  <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                    PWA Real
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Instale diretamente no seu Android, iPhone ou PC com acesso offline e ícone na tela inicial.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleInstallClick}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl transition shadow-sm active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Instalar PWA Agora</span>
              </button>

              <button
                onClick={() => setShowInstructionsModal(true)}
                title="Como instalar manualmente"
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              <button
                onClick={handleDismiss}
                title="Fechar aviso"
                className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Instructions Modal (For iOS Safari or Browsers without automatic prompt) */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative space-y-5 animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setShowInstructionsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Como Instalar o PWA Real</h3>
                <p className="text-xs text-slate-500 font-medium">Instalação nativa sem dependência de loja de aplicativos</p>
              </div>
            </div>

            {isIos ? (
              /* iOS Instructions */
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs text-slate-700">
                <p className="font-bold text-slate-900">No iPhone / iPad (Safari):</p>
                <ol className="space-y-2.5 list-decimal list-inside font-medium">
                  <li className="flex items-start space-x-2">
                    <span className="font-bold text-emerald-600 shrink-0">1.</span>
                    <span>
                      Toque no botão <strong>Compartilhar</strong> <Share2 className="w-4 h-4 inline text-slate-600 mx-1" /> na barra inferior do Safari.
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="font-bold text-emerald-600 shrink-0">2.</span>
                    <span>
                      Role para baixo e selecione <strong className="text-slate-900">Adicionar à Tela de Início</strong> <PlusSquare className="w-4 h-4 inline text-slate-600 mx-1" />.
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="font-bold text-emerald-600 shrink-0">3.</span>
                    <span>
                      Toque em <strong className="text-emerald-700">Adicionar</strong> no canto superior direito para concluir a instalação do PWA.
                    </span>
                  </li>
                </ol>
              </div>
            ) : (
              /* Android / Desktop Instructions */
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs text-slate-700">
                <p className="font-bold text-slate-900">No Chrome / Edge / Opera / Android / PC:</p>
                <ol className="space-y-2.5 list-decimal list-inside font-medium">
                  <li className="flex items-start space-x-2">
                    <span className="font-bold text-emerald-600 shrink-0">1.</span>
                    <span>
                      Se você abriu dentro de um preview ou iFrame, toque nos <strong>3 pontos do navegador</strong> e escolha <strong className="text-slate-900">Abrir no Navegador / Nova Guia</strong>.
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="font-bold text-emerald-600 shrink-0">2.</span>
                    <span>
                      No menu do Chrome/Edge, toque em <strong className="text-slate-900">Instalar aplicativo AGC Finance</strong> ou <strong className="text-slate-900">Adicionar à tela inicial</strong>.
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="font-bold text-emerald-600 shrink-0">3.</span>
                    <span>
                      Confirme a instalação. O aplicativo abrirá em janela própria em modo <strong>PWA Standalone</strong> sem barras do navegador!
                    </span>
                  </li>
                </ol>
              </div>
            )}

            <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-2xl text-[11px] text-emerald-950 font-semibold flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Após instalado, o AGC Finance funciona em modo aplicativo independente com acesso ultra-rápido offline.
              </span>
            </div>

            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl text-xs transition shadow-md flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Tentar Instalação Direta Agora</span>
              </button>
            )}

            <button
              onClick={() => setShowInstructionsModal(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition cursor-pointer"
            >
              Entendi / Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
