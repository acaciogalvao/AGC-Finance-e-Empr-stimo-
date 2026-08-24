import React, { useState, useEffect } from 'react';
import {
  Car,
  Navigation,
  DollarSign,
  Clock,
  Gauge,
  CheckCircle2,
  XCircle,
  Volume2,
  Copy,
  Check,
  Minimize2,
  Maximize2,
  Fuel,
  Sparkles,
  Flame,
  Star,
  MapPin,
  Compass,
} from 'lucide-react';
import { CopilotRideOffer, speakCopilotRideSummary } from '../utils/copilotEngine';

interface CopilotOverlayProps {
  offer: CopilotRideOffer | null;
  onAccept: (offer: CopilotRideOffer) => void;
  onReject: (offer: CopilotRideOffer) => void;
  onClose: () => void;
  voiceAlertsEnabled?: boolean;
}

export const CopilotOverlay: React.FC<CopilotOverlayProps> = ({
  offer,
  onAccept,
  onReject,
  onClose,
  voiceAlertsEnabled = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(18);

  // Efeito de voz e contagem regressiva da oferta (18s igual Uber/99)
  useEffect(() => {
    if (!offer) return;
    setSecondsLeft(18);
    setMinimized(false);

    if (voiceAlertsEnabled) {
      speakCopilotRideSummary(offer);
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [offer?.id]);

  if (!offer) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUber = offer.app === 'Uber';
  const is99 = offer.app === '99';

  // Cores de veredito
  const getVerdictTheme = () => {
    switch (offer.verdict) {
      case 'EXCELENTE':
        return {
          bg: 'bg-emerald-600 text-white',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
          border: 'border-emerald-500 shadow-emerald-950/40',
          glow: 'from-emerald-500/20 via-teal-500/10 to-transparent',
          accent: 'text-emerald-400',
        };
      case 'VALE A PENA':
        return {
          bg: 'bg-teal-600 text-white',
          badge: 'bg-teal-500/20 text-teal-300 border-teal-400/40',
          border: 'border-teal-500 shadow-teal-950/40',
          glow: 'from-teal-500/20 via-slate-800 to-transparent',
          accent: 'text-teal-400',
        };
      case 'REGULAR':
        return {
          bg: 'bg-amber-600 text-white',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
          border: 'border-amber-500 shadow-amber-950/40',
          glow: 'from-amber-500/20 via-slate-800 to-transparent',
          accent: 'text-amber-400',
        };
      case 'PREJUIZO':
      default:
        return {
          bg: 'bg-rose-600 text-white',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
          border: 'border-rose-500 shadow-rose-950/40',
          glow: 'from-rose-500/20 via-slate-800 to-transparent',
          accent: 'text-rose-400',
        };
    }
  };

  const theme = getVerdictTheme();

  // Modo Minimizado (Bolha Flutuante de Alto Desempenho)
  if (minimized) {
    return (
      <div className="fixed top-20 right-4 z-50 animate-bounce">
        <button
          onClick={() => setMinimized(false)}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl shadow-2xl border ${theme.border} bg-slate-900 text-white backdrop-blur-md`}
        >
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <div className="text-left">
            <div className="text-[10px] text-slate-400 font-bold uppercase">{offer.app} • R$ {offer.grossValue.toFixed(2)}</div>
            <div className="text-xs font-black text-emerald-400">R$ {offer.valuePerKmTotal.toFixed(2)}/km</div>
          </div>
          <Maximize2 className="w-4 h-4 text-slate-400 ml-1" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg bg-slate-900 border-2 ${theme.border} rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[95vh]`}
      >
        {/* Barra Superior / Header do Copiloto */}
        <div className={`px-4 py-3 bg-gradient-to-r ${theme.glow} border-b border-slate-800 flex items-center justify-between`}>
          <div className="flex items-center space-x-2">
            <div className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase flex items-center space-x-1.5 ${
              isUber ? 'bg-black text-white border border-slate-700' : is99 ? 'bg-amber-500 text-slate-950 font-extrabold' : 'bg-emerald-600 text-white'
            }`}>
              <Car className="w-3.5 h-3.5" />
              <span>{offer.app} {offer.category}</span>
            </div>

            {offer.passengerRating && (
              <div className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-slate-800/90 border border-slate-700 text-amber-400 text-xs font-bold">
                <Star className="w-3 h-3 fill-amber-400" />
                <span>{offer.passengerRating.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Timer de Oferta */}
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300">
              <Clock className="w-3 h-3 text-amber-400" />
              <span className={secondsLeft <= 5 ? 'text-rose-400 font-extrabold animate-pulse' : ''}>
                {secondsLeft}s
              </span>
            </div>

            {/* Áudio */}
            <button
              onClick={() => speakCopilotRideSummary(offer)}
              title="Ouvir análise por voz"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <Volume2 className="w-4 h-4 text-emerald-400" />
            </button>

            {/* Minimizar */}
            <button
              onClick={() => setMinimized(true)}
              title="Minimizar para bolha"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Veredito Principal & Métricas Gigantes */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Card do Veredito Inteligente */}
          <div className={`p-3.5 rounded-2xl ${theme.bg} flex items-center justify-between shadow-lg`}>
            <div className="space-y-0.5">
              <div className="text-[11px] uppercase tracking-wider font-extrabold opacity-90">Veredito do Copiloto</div>
              <div className="text-lg sm:text-xl font-black tracking-tight flex items-center space-x-2">
                <span>{offer.verdictTitle}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold opacity-80">Score AGC</div>
              <div className="text-2xl sm:text-3xl font-black">{offer.score}/100</div>
            </div>
          </div>

          {/* Grid de Métricas Principais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* R$ Bruto */}
            <div className="bg-slate-800/90 border border-slate-700/80 p-3 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Valor Bruto</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 block">
                R$ {offer.grossValue.toFixed(2)}
              </span>
              {!!offer.dynamicValue && offer.dynamicValue > 0 && (
                <span className="text-[10px] font-extrabold text-amber-400 flex items-center justify-center space-x-0.5 mt-0.5">
                  <Flame className="w-2.5 h-2.5" />
                  <span>+R$ {offer.dynamicValue.toFixed(2)} dinâmico</span>
                </span>
              )}
            </div>

            {/* R$ / KM Total */}
            <div className="bg-slate-800/90 border border-slate-700/80 p-3 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">R$ / KM Total</span>
              <span className={`text-xl sm:text-2xl font-black block ${
                offer.valuePerKmTotal >= 2.5 ? 'text-emerald-400' : offer.valuePerKmTotal >= 2.0 ? 'text-teal-300' : 'text-amber-400'
              }`}>
                R$ {offer.valuePerKmTotal.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 block">por km rodado</span>
            </div>

            {/* R$ / Hora */}
            <div className="bg-slate-800/90 border border-slate-700/80 p-3 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">R$ / Hora</span>
              <span className="text-xl sm:text-2xl font-black text-cyan-400 block">
                R$ {offer.valuePerHour.toFixed(0)}
              </span>
              <span className="text-[10px] text-slate-400 block">R$ {offer.valuePerMinute.toFixed(2)}/min</span>
            </div>

            {/* Lucro Líquido Real */}
            <div className="bg-slate-800/90 border border-slate-700/80 p-3 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Lucro Líquido</span>
              <span className="text-xl sm:text-2xl font-black text-teal-300 block">
                R$ {offer.estimatedNetProfit.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 flex items-center justify-center space-x-1">
                <Fuel className="w-2.5 h-2.5 text-amber-400" />
                <span>Gasto: R$ {offer.estimatedTotalCost.toFixed(2)}</span>
              </span>
            </div>
          </div>

          {/* Comparativo: Embarque vs Viagem */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 space-y-3">
            {/* Trajeto de Embarque (Busca) */}
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex-shrink-0 mt-0.5">
                <Compass className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-400 uppercase text-[10px] tracking-wide">Buscar Passageiro</span>
                  <span className="font-mono font-bold text-slate-200">
                    {offer.pickupDistanceKm.toFixed(1)} km • {offer.pickupDurationMin} min
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                  {offer.pickupAddress}
                </p>
              </div>
            </div>

            <div className="w-full h-px bg-slate-700/50" />

            {/* Trajeto de Viagem (Desembarque) */}
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400 uppercase text-[10px] tracking-wide">Destino da Viagem</span>
                  <span className="font-mono font-bold text-slate-200">
                    {offer.tripDistanceKm.toFixed(1)} km • {offer.tripDurationMin} min
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-slate-300 font-medium truncate flex-1 mr-2">
                    {offer.dropoffAddress}
                  </p>
                  <button
                    onClick={() => handleCopy(offer.dropoffAddress)}
                    title="Copiar endereço para Waze/Maps"
                    className="p-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition text-[10px] flex items-center space-x-1 flex-shrink-0"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Justificativas do Veredito */}
          {offer.verdictReason && offer.verdictReason.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Análise Detalhada
              </span>
              <div className="space-y-1">
                {offer.verdictReason.map((reason, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-slate-300 flex items-start space-x-2 bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-700/40"
                  >
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Barra de Ações Rápidas (Aceitar / Recusar) */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 grid grid-cols-2 gap-2.5">
          <button
            onClick={() => onReject(offer)}
            className="w-full py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-extrabold text-sm flex items-center justify-center space-x-2 transition active:scale-95 shadow-md"
          >
            <XCircle className="w-4 h-4 text-rose-400" />
            <span>Recusar</span>
          </button>

          <button
            onClick={() => onAccept(offer)}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 transition active:scale-95 shadow-lg shadow-emerald-950/50"
          >
            <CheckCircle2 className="w-4 h-4 font-black" />
            <span>Aceitar e Salvar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
