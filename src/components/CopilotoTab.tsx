import React, { useState } from 'react';
import {
  Navigation,
  Car,
  DollarSign,
  Clock,
  Gauge,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Sparkles,
  Sliders,
  ShieldCheck,
  Fuel,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  Star,
  Cpu,
  Layers,
  ChevronRight,
  Info,
  Radio,
  FileText,
  Copy,
  Check,
  Shield,
  Smartphone,
  ExternalLink,
  Lock,
  BatteryCharging,
  Layers as LayersIcon,
  HelpCircle,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  CopilotRideOffer,
  CopilotConfig,
  DEFAULT_COPILOT_CONFIG,
  SAMPLE_COPILOT_RIDES,
  parseScreenOrNotificationText,
  calculateCopilotMetrics,
  speakCopilotRideSummary,
} from '../utils/copilotEngine';

// Utilitário para enviar intents nativos ao Android caso esteja rodando em WebView
function triggerNativeSetting(type: 'OPEN_ACCESSIBILITY_SETTINGS' | 'OPEN_OVERLAY_SETTINGS' | 'OPEN_BATTERY_SETTINGS' | 'OPEN_APP_SETTINGS') {
  if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
    try {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type }));
    } catch (e) {
      console.warn('Erro ao disparar intent nativo:', e);
    }
  } else {
    // Alerta instrucional no navegador/PWA
    alert('Esta ação abre a tela de configurações no aplicativo Android instalado (APK). Siga as instruções passo a passo detalhadas abaixo!');
  }
}

export const CopilotoTab: React.FC = () => {
  const {
    addRide,
    copilotConfig,
    updateCopilotConfig,
    copilotHistory,
    addCopilotOffer,
    activeCopilotRide,
    setActiveCopilotRide,
  } = useFinance();

  const [customText, setCustomText] = useState('');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'simulador' | 'permissoes' | 'configuracoes' | 'historico'>('simulador');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [lastSavedMessage, setLastSavedMessage] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<'samsung' | 'xiaomi' | 'motorola'>('samsung');

  // Permissões marcadas manualmente pelo motorista como conferidas
  const [checkedPermissions, setCheckedPermissions] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('@agcfinance/checked_permissions');
      return saved ? JSON.parse(saved) : { accessibility: true, overlay: true, battery: true };
    } catch {
      return { accessibility: true, overlay: true, battery: true };
    }
  });

  const togglePermissionCheck = (key: string) => {
    setCheckedPermissions((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('@agcfinance/checked_permissions', JSON.stringify(updated));
      } catch (err) {
        console.warn('Erro ao salvar status de permissões:', err);
      }
      return updated;
    });
  };

  // Testa texto inserido ou preset
  const handleTestText = (textToTest: string) => {
    if (!textToTest.trim()) return;
    const offer = parseScreenOrNotificationText(textToTest, undefined, copilotConfig);
    if (offer) {
      addCopilotOffer(offer);
      setActiveCopilotRide(offer);
    } else {
      alert('Não foi possível identificar dados de corrida no texto fornecido. Tente usar um dos exemplos prontos!');
    }
  };

  // Aceita corrida e lança no AGC Finance
  const handleAcceptRide = (offer: CopilotRideOffer) => {
    addRide({
      date: new Date().toISOString().split('T')[0],
      platform: offer.app,
      grossValue: offer.grossValue,
      offeredValue: offer.grossValue,
      passengerValue: Math.round((offer.grossValue * 1.3) * 100) / 100,
      distance: offer.totalDistanceKm,
      duration: offer.totalDurationMin,
      observations: `Copiloto AGC [${offer.category}] • Busca: ${offer.pickupDistanceKm.toFixed(1)}km | Viagem: ${offer.tripDistanceKm.toFixed(1)}km | R$ ${offer.valuePerKmTotal.toFixed(2)}/km | R$ ${offer.valuePerHour.toFixed(0)}/h | ${offer.pickupAddress} -> ${offer.dropoffAddress}`,
    });

    setLastSavedMessage(`Corrida de R$ ${offer.grossValue.toFixed(2)} (${offer.app}) aceita e salva no histórico!`);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3500);
    setActiveCopilotRide(null);
  };

  // Estatísticas do Copiloto
  const totalAnalyzed = copilotHistory.length;
  const excellentCount = copilotHistory.filter((o) => o.verdict === 'EXCELENTE').length;
  const goodCount = copilotHistory.filter((o) => o.verdict === 'VALE A PENA').length;
  const badCount = copilotHistory.filter((o) => o.verdict === 'PREJUIZO').length;
  const totalPreventedLoss = copilotHistory
    .filter((o) => o.verdict === 'PREJUIZO')
    .reduce((sum, o) => sum + Math.max(0, o.estimatedTotalCost - o.grossValue), 0);

  const avgOfferedPerKm = totalAnalyzed > 0
    ? copilotHistory.reduce((sum, o) => sum + o.valuePerKmTotal, 0) / totalAnalyzed
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Toast de Confirmação */}
      {showSavedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 border border-emerald-400/50 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-black">{lastSavedMessage}</span>
        </div>
      )}

      {/* Hero Banner do Copiloto */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 border border-slate-800 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-emerald-500 rounded-xl text-slate-950 shadow-md">
                <Navigation className="w-5 h-5" />
              </div>
              <span className="text-xs uppercase tracking-widest font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                Copiloto em Tempo Real
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Leitor e Calculador Inteligente Uber & 99
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium">
              Analisa chamadas da Uber e 99 em segundos, calcula <strong>R$/km total</strong>, <strong>R$/hora</strong>, <strong>lucro líquido</strong> e avisa por voz se a corrida realmente compensa!
            </p>
          </div>

          {/* Toggle de Ativação do Copiloto */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80">
            <div className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${copilotConfig.enabled ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              <span className="text-xs font-bold text-slate-200">
                {copilotConfig.enabled ? 'Copiloto Ativo' : 'Copiloto Pausado'}
              </span>
            </div>
            <button
              onClick={() => updateCopilotConfig({ enabled: !copilotConfig.enabled })}
              className={`px-4 py-2 rounded-xl text-xs font-black transition active:scale-95 shadow-md ${
                copilotConfig.enabled
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {copilotConfig.enabled ? 'Monitorando' : 'Ativar Monitor'}
            </button>
          </div>
        </div>

        {/* Sub-navegação do Copiloto */}
        <div className="flex items-center space-x-2 mt-6 pt-4 border-t border-slate-800 text-xs font-bold overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveSubTab('simulador')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 flex-shrink-0 ${
              activeSubTab === 'simulador'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white bg-slate-800/60'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Simulador & Testes</span>
          </button>

          <button
            onClick={() => setActiveSubTab('permissoes')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 flex-shrink-0 relative ${
              activeSubTab === 'permissoes'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Permissões Android & Acessibilidade</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <button
            onClick={() => setActiveSubTab('configuracoes')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 flex-shrink-0 ${
              activeSubTab === 'configuracoes'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white bg-slate-800/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configurar Metas</span>
          </button>

          <button
            onClick={() => setActiveSubTab('historico')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 flex-shrink-0 ${
              activeSubTab === 'historico'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Histórico ({copilotHistory.length})</span>
          </button>
        </div>
      </div>

      {/* ABA 1: SIMULADOR & TESTE DE CORRIDAS */}
      {activeSubTab === 'simulador' && (
        <div className="space-y-6">
          {/* Métricas Rápidas do Copiloto */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Ofertas Analisadas</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">{totalAnalyzed}</span>
              <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">{excellentCount + goodCount} recomendadas</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">R$ Médio / KM Ofertado</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
                R$ {avgOfferedPerKm > 0 ? avgOfferedPerKm.toFixed(2) : '0,00'}
              </span>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Sua meta: R$ {copilotConfig.minPricePerKm.toFixed(2)}</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Prejuízos Recusados</span>
              <span className="text-xl sm:text-2xl font-black text-rose-600 mt-1 block">{badCount} corridas</span>
              <span className="text-[11px] text-rose-500 font-medium mt-0.5 block">Evitou prejuízo no bolso</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Economia em Combustível</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 block">
                R$ {totalPreventedLoss.toFixed(2)}
              </span>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Economizados</span>
            </div>
          </div>

          {/* Teste Rápido com Presets da Uber e 99 */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Testar Exemplos Reais de Chamadas (Uber & 99)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clique em qualquer exemplo abaixo para ver o cálculo do copiloto em ação na hora:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {SAMPLE_COPILOT_RIDES.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedPresetIndex(idx);
                    setCustomText(sample.text);
                    handleTestText(sample.text);
                  }}
                  className="p-3.5 rounded-2xl border border-slate-200/80 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition space-y-1.5 group active:scale-98"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 group-hover:text-emerald-700">
                      {sample.label}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {sample.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Área de Leitura de Texto Personalizado / OCR */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Simulador de Leitura de Tela / Notificação</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cole abaixo o texto ou notificação da corrida recebida para o copiloto analisar:
              </p>
            </div>

            <div className="space-y-3">
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Exemplo:&#10;UberX&#10;R$ 28,90&#10;1,5 km até o local • 5 min&#10;8,2 km de viagem • 18 min&#10;Embarque: Rua das Palmeiras, 100&#10;Destino: Av. Brasil, 450"
                rows={5}
                className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition resize-none"
              />

              <div className="flex items-center justify-end space-x-2">
                <button
                  onClick={() => {
                    setCustomText('');
                    setSelectedPresetIndex(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
                >
                  Limpar
                </button>

                <button
                  onClick={() => handleTestText(customText)}
                  disabled={!customText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black flex items-center space-x-1.5 transition active:scale-95 shadow-md shadow-emerald-950/20"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Analisar Corrida Agora</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA DE PERMISSÕES DO ANDROID & ACESSIBILIDADE */}
      {activeSubTab === 'permissoes' && (
        <div className="space-y-6">
          {/* Header & Aviso de Segurança */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Permissões do Android (Acessibilidade & Sobreposição)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure as permissões necessárias para o Copiloto ler as ofertas da Uber e 99 automaticamente na sua tela.
                </p>
              </div>
              <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-bold w-fit">
                <Lock className="w-3.5 h-3.5" />
                <span>100% Seguro & Privado</span>
              </div>
            </div>

            {/* Banner Informativo */}
            <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 flex items-start space-x-3.5 text-xs">
              <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-white block">Como funciona a leitura automática:</span>
                <p className="text-slate-300 leading-relaxed">
                  Assim como os aplicativos de copiloto (ex: Guigo, StopClub), o <strong>AGC Finance</strong> utiliza a <strong>Acessibilidade do Android</strong> exclusivamente para ler os textos da chamada de corrida (valor, distância e tempo) e a <strong>Sobreposição</strong> para mostrar o cartão de análise por cima da Uber/99.
                </p>
              </div>
            </div>
          </div>

          {/* Cards das 3 Permissões Principais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. ACESSIBILIDADE */}
            <div className={`p-5 rounded-3xl border transition flex flex-col justify-between space-y-4 ${
              checkedPermissions.accessibility
                ? 'bg-white border-emerald-300/80 shadow-xs'
                : 'bg-white border-amber-300/80 shadow-xs'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Obrigatório
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">1. Serviço de Acessibilidade</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Lê o cartão de chamada da Uber e 99 para capturar o valor em R$, os quilômetros e o destino instantaneamente.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => triggerNativeSetting('OPEN_ACCESSIBILITY_SETTINGS')}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center justify-center space-x-1.5 transition active:scale-95 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Abrir Acessibilidade</span>
                </button>
                <button
                  onClick={() => togglePermissionCheck('accessibility')}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                    checkedPermissions.accessibility
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${checkedPermissions.accessibility ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{checkedPermissions.accessibility ? 'Permissão Ativada' : 'Marcar como Ativada'}</span>
                </button>
              </div>
            </div>

            {/* 2. SOBREPOSIÇÃO DE TELA */}
            <div className={`p-5 rounded-3xl border transition flex flex-col justify-between space-y-4 ${
              checkedPermissions.overlay
                ? 'bg-white border-emerald-300/80 shadow-xs'
                : 'bg-white border-amber-300/80 shadow-xs'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                    <LayersIcon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Obrigatório
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">2. Sobreposição de Tela</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Permite desenhar o painel flutuante com cálculo de R$/KM e lucro por cima do aplicativo Uber/99.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => triggerNativeSetting('OPEN_OVERLAY_SETTINGS')}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center justify-center space-x-1.5 transition active:scale-95 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Abrir Sobreposição</span>
                </button>
                <button
                  onClick={() => togglePermissionCheck('overlay')}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                    checkedPermissions.overlay
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${checkedPermissions.overlay ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{checkedPermissions.overlay ? 'Permissão Ativada' : 'Marcar como Ativada'}</span>
                </button>
              </div>
            </div>

            {/* 3. ECONOMIA DE BATERIA */}
            <div className={`p-5 rounded-3xl border transition flex flex-col justify-between space-y-4 ${
              checkedPermissions.battery
                ? 'bg-white border-emerald-300/80 shadow-xs'
                : 'bg-white border-slate-200/80 shadow-xs'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
                    <BatteryCharging className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Recomendado
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">3. Sem Restrição de Bateria</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Evita que o Android silencie ou encerre o copiloto em segundo plano durante o seu expediente.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => triggerNativeSetting('OPEN_BATTERY_SETTINGS')}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center justify-center space-x-1.5 transition active:scale-95 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ajustar Bateria</span>
                </button>
                <button
                  onClick={() => togglePermissionCheck('battery')}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                    checkedPermissions.battery
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${checkedPermissions.battery ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span>{checkedPermissions.battery ? 'Bateria Desbloqueada' : 'Marcar como Feito'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Guia Passo a Passo por Marca de Smartphone */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h4 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  <span>Passo a Passo de Ativação no seu Aparelho</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecione a marca do seu celular para ver exatamente onde clicar:
                </p>
              </div>

              {/* Botões de Seleção de Marca */}
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-2xl">
                <button
                  onClick={() => setSelectedBrand('samsung')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                    selectedBrand === 'samsung' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Samsung
                </button>
                <button
                  onClick={() => setSelectedBrand('xiaomi')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                    selectedBrand === 'xiaomi' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Xiaomi / POCO
                </button>
                <button
                  onClick={() => setSelectedBrand('motorola')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                    selectedBrand === 'motorola' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Motorola / Outros
                </button>
              </div>
            </div>

            {/* Conteúdo específico da Marca */}
            {selectedBrand === 'samsung' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">1</span>
                  <div className="font-extrabold text-slate-900 text-xs">Acessibilidade</div>
                  <p className="text-[11px] text-slate-600">
                    Abra <strong>Configurações</strong> ➔ <strong>Acessibilidade</strong> ➔ <strong>Serviços Instalados</strong> ➔ Toque em <strong>AGC Finance Copiloto</strong> e ative.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1.5">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">2</span>
                  <div className="font-extrabold text-slate-900 text-xs">Aparecer no Topo</div>
                  <p className="text-[11px] text-slate-600">
                    Abra <strong>Configurações</strong> ➔ <strong>Aplicativos</strong> ➔ Menu 3 pontos ➔ <strong>Acesso Especial</strong> ➔ <strong>Aparecer no Topo</strong> ➔ Ative o AGC Finance.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1.5">
                  <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center">3</span>
                  <div className="font-extrabold text-slate-900 text-xs">Bateria sem Limites</div>
                  <p className="text-[11px] text-slate-600">
                    Em Aplicativos ➔ AGC Finance ➔ <strong>Bateria</strong> ➔ Selecione a opção <strong>"Não Restrito"</strong>.
                  </p>
                </div>
              </div>
            )}

            {selectedBrand === 'xiaomi' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">1</span>
                  <div className="font-extrabold text-slate-900 text-xs">Acessibilidade MIUI</div>
                  <p className="text-[11px] text-slate-600">
                    Abra <strong>Configurações</strong> ➔ <strong>Configurações Adicionais</strong> ➔ <strong>Acessibilidade</strong> ➔ <strong>Apps Baixados</strong> ➔ Ative <strong>AGC Finance Copiloto</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1.5">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">2</span>
                  <div className="font-extrabold text-slate-900 text-xs">Início Automático</div>
                  <p className="text-[11px] text-slate-600">
                    Em <strong>Apps</strong> ➔ <strong>Gerenciar Apps</strong> ➔ <strong>AGC Finance</strong> ➔ Marque <strong>"Início Automático"</strong> e ative <strong>"Exibir janelas pop-up"</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1.5">
                  <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center">3</span>
                  <div className="font-extrabold text-slate-900 text-xs">Economia de Bateria</div>
                  <p className="text-[11px] text-slate-600">
                    Na mesma tela de informações do app ➔ <strong>Economia de Bateria</strong> ➔ Marque <strong>"Nenhuma Restrição"</strong>.
                  </p>
                </div>
              </div>
            )}

            {selectedBrand === 'motorola' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">1</span>
                  <div className="font-extrabold text-slate-900 text-xs">Acessibilidade</div>
                  <p className="text-[11px] text-slate-600">
                    Abra <strong>Configurar</strong> ➔ <strong>Acessibilidade</strong> ➔ Localize <strong>AGC Finance Copiloto</strong> e toque em <strong>"Usar o serviço"</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1.5">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">2</span>
                  <div className="font-extrabold text-slate-900 text-xs">Sobrepor a outros Apps</div>
                  <p className="text-[11px] text-slate-600">
                    Em <strong>Apps e Notificações</strong> ➔ <strong>Acesso Especial</strong> ➔ <strong>Sobrepor a outros apps</strong> ➔ Ative para o AGC Finance.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1.5">
                  <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center">3</span>
                  <div className="font-extrabold text-slate-900 text-xs">Uso de Bateria</div>
                  <p className="text-[11px] text-slate-600">
                    Em <strong>Bateria</strong> ➔ Otimização de Bateria ➔ Selecione <strong>Todos os Apps</strong> ➔ AGC Finance ➔ <strong>Não Otimizar</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: CONFIGURAÇÕES E METAS DE RENDIMENTO */}
      {activeSubTab === 'configuracoes' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-emerald-600" />
              <span>Configurações do Copiloto & Custos do Seu Veículo</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Personalize suas regras de lucro para que o copiloto calcule o custo real por quilômetro e alerte sobre corridas com prejuízo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Metas Mínimas de Aceite */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3.5">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-emerald-700 flex items-center space-x-1.5">
                <DollarSign className="w-4 h-4" />
                <span>Metas Mínimas de Ganho</span>
              </h4>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ganho Mínimo por KM Total (R$)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.10"
                    value={copilotConfig.minPricePerKm}
                    onChange={(e) => updateCopilotConfig({ minPricePerKm: parseFloat(e.target.value) || 2.0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold"
                  />
                  <span className="text-xs font-semibold text-slate-500">R$/km</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Recomendado para SP/Capitais: R$ 2,20 a R$ 2,80</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ganho Mínimo por Hora Bruta (R$)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="5"
                    value={copilotConfig.minPricePerHour}
                    onChange={(e) => updateCopilotConfig({ minPricePerHour: parseFloat(e.target.value) || 40.0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold"
                  />
                  <span className="text-xs font-semibold text-slate-500">R$/h</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Distância Máxima de Busca / Embarque (KM)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.5"
                    value={copilotConfig.maxPickupDistanceKm}
                    onChange={(e) => updateCopilotConfig({ maxPickupDistanceKm: parseFloat(e.target.value) || 3.0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold"
                  />
                  <span className="text-xs font-semibold text-slate-500">KM</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Corridas com busca acima disso recebem alerta</span>
              </div>
            </div>

            {/* Custos Reais do Carro */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3.5">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-teal-700 flex items-center space-x-1.5">
                <Fuel className="w-4 h-4" />
                <span>Consumo & Custo do Carro</span>
              </h4>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Consumo Médio do Veículo (KM por Litro)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.5"
                    value={copilotConfig.fuelConsumptionKmPerL}
                    onChange={(e) => updateCopilotConfig({ fuelConsumptionKmPerL: parseFloat(e.target.value) || 10.0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold"
                  />
                  <span className="text-xs font-semibold text-slate-500">km/L</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Preço do Combustível por Litro (R$)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.10"
                    value={copilotConfig.fuelPricePerLiter}
                    onChange={(e) => updateCopilotConfig({ fuelPricePerLiter: parseFloat(e.target.value) || 5.80 })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold"
                  />
                  <span className="text-xs font-semibold text-slate-500">R$/L</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Manutenção & Desgaste por KM (R$)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.05"
                    value={copilotConfig.maintenanceCostPerKm}
                    onChange={(e) => updateCopilotConfig({ maintenanceCostPerKm: parseFloat(e.target.value) || 0.25 })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold"
                  />
                  <span className="text-xs font-semibold text-slate-500">R$/km</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Reserva de pneus, troca de óleo, pastilhas e IPVA</span>
              </div>
            </div>
          </div>

          {/* Configurações de Áudio e Voz */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-slate-900 text-sm">Voz do Copiloto (Síntese de Fala)</div>
                <p className="text-xs text-slate-500">
                  Fala em voz alta no som do carro o valor, R$/km e se vale a pena aceitar a corrida.
                </p>
              </div>
            </div>

            <button
              onClick={() => updateCopilotConfig({ voiceAlerts: !copilotConfig.voiceAlerts })}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center space-x-2 ${
                copilotConfig.voiceAlerts
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {copilotConfig.voiceAlerts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{copilotConfig.voiceAlerts ? 'Voz Ativada' : 'Voz Desativada'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ABA 3: HISTÓRICO DE OFERTAS ANALISADAS */}
      {activeSubTab === 'historico' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Histórico de Ofertas Lidas ({copilotHistory.length})
              </h3>
              <p className="text-xs text-slate-500">
                Todas as chamadas analisadas pelo Copiloto durante suas corridas.
              </p>
            </div>
          </div>

          {copilotHistory.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/60 text-slate-500 text-xs">
              Nenhuma oferta analisada ainda. Experimente o <strong>Simulador & Testes</strong> acima!
            </div>
          ) : (
            <div className="space-y-2.5">
              {copilotHistory.map((offer) => (
                <div
                  key={offer.id}
                  className="p-3.5 rounded-2xl border border-slate-200/80 hover:border-slate-300 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-xl text-xs font-black ${
                      offer.app === 'Uber' ? 'bg-black text-white' : 'bg-amber-500 text-slate-950'
                    }`}>
                      {offer.app}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-black text-slate-900">
                          R$ {offer.grossValue.toFixed(2)}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          offer.verdict === 'EXCELENTE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : offer.verdict === 'VALE A PENA'
                            ? 'bg-teal-100 text-teal-800'
                            : offer.verdict === 'REGULAR'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {offer.verdictTitle}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        Total: {offer.totalDistanceKm.toFixed(1)} km ({offer.totalDurationMin} min) • <strong>R$ {offer.valuePerKmTotal.toFixed(2)}/km</strong> • R$ {offer.valuePerHour.toFixed(0)}/h
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 justify-end">
                    <button
                      onClick={() => handleAcceptRide(offer)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition flex items-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Salvar no AGC</span>
                    </button>

                    <button
                      onClick={() => setActiveCopilotRide(offer)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
