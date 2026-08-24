import React, { useState } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  HandCoins,
  Target,
  BarChart3,
  Car,
  Database,
  User,
  Navigation,
} from 'lucide-react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { InicioTab } from './components/InicioTab';
import { RegistrarTab } from './components/RegistrarTab';
import { HistoricoTab } from './components/HistoricoTab';
import { EmprestimosTab } from './components/EmprestimosTab';
import { MetasTab } from './components/MetasTab';
import { RelatoriosTab } from './components/RelatoriosTab';
import { PerfilTab } from './components/PerfilTab';
import { CopilotoTab } from './components/CopilotoTab';
import { CopilotOverlay } from './components/CopilotOverlay';

type TabType = 'inicio' | 'copiloto' | 'registrar' | 'historico' | 'emprestimos' | 'metas' | 'relatorios' | 'perfil';

function MainApp() {
  const [activeTab, setActiveTab] = useState<TabType>('inicio');
  const {
    period,
    setPeriod,
    profile,
    isOnline,
    isSyncing,
    syncStatus,
    performSync,
    activeCopilotRide,
    setActiveCopilotRide,
    copilotConfig,
    addRide,
  } = useFinance();

  const handleAcceptRide = (offer: any) => {
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
    setActiveCopilotRide(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <PwaInstallBanner />
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-slate-900/95 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-slate-950 shadow-md">
              <Car className="w-5 h-5 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-extrabold text-white tracking-tight">AGC Finance</h1>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">Gestão Financeira para Motoristas de Aplicativo</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={performSync}
              title="Clique para forçar sincronização com MongoDB"
              className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:border-slate-600 transition"
            >
              <Database className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : isOnline ? 'text-emerald-400' : 'text-amber-500'}`} />
              <span>
                {isSyncing ? 'Sincronizando...' : isOnline && syncStatus === 'synced' ? 'MongoDB Atlas' : 'Modo Offline'}
              </span>
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </button>

            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
              <button
                onClick={() => setPeriod('hoje')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition ${
                  period === 'hoje'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setPeriod('semanal')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition ${
                  period === 'semanal'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semanal
              </button>
              <button
                onClick={() => setPeriod('mensal')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition ${
                  period === 'mensal'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mensal
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        {activeTab === 'inicio' && <InicioTab onOpenProfile={() => setActiveTab('perfil')} />}
        {activeTab === 'copiloto' && <CopilotoTab />}
        {activeTab === 'registrar' && <RegistrarTab />}
        {activeTab === 'historico' && <HistoricoTab />}
        {activeTab === 'emprestimos' && <EmprestimosTab />}
        {activeTab === 'metas' && <MetasTab />}
        {activeTab === 'relatorios' && <RelatoriosTab />}
        {activeTab === 'perfil' && <PerfilTab onBackToInicio={() => setActiveTab('inicio')} />}
      </main>

      {/* Copilot Floating Overlay Modal */}
      <CopilotOverlay
        offer={activeCopilotRide}
        onAccept={handleAcceptRide}
        onReject={() => setActiveCopilotRide(null)}
        onClose={() => setActiveCopilotRide(null)}
        voiceAlertsEnabled={copilotConfig.voiceAlerts}
      />

      {/* Navigation - Fixed Bottom Bar on Mobile, Header-style Bar on Desktop */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg sm:relative sm:border-t-0 sm:border-b sm:border-slate-200 sm:bg-white/80 sm:bottom-auto">
        <div className="max-w-7xl mx-auto px-1 sm:px-6 lg:px-8">
          <div className="grid grid-cols-7 sm:flex sm:overflow-x-auto sm:scrollbar-none sm:justify-start gap-0.5 sm:gap-2 py-1.5 sm:py-2 px-0.5 sm:px-1">
            <button
              onClick={() => setActiveTab('inicio')}
              className={`flex flex-col sm:flex-row items-center justify-center sm:space-x-2 px-0.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition min-w-0 sm:flex-shrink-0 ${
                activeTab === 'inicio'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[9px] sm:text-xs font-bold truncate max-w-full text-center leading-none mt-1 sm:mt-0 tracking-tighter sm:tracking-normal">Início</span>
            </button>

            <button
              onClick={() => setActiveTab('copiloto')}
              className={`flex flex-col sm:flex-row items-center justify-center sm:space-x-2 px-0.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition min-w-0 sm:flex-shrink-0 relative ${
                activeTab === 'copiloto'
                  ? 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-950/20'
                  : 'text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100/80'
              }`}
            >
              <div className="relative">
                <Navigation className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
                {copilotConfig.enabled && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
              <span className="text-[9px] sm:text-xs font-black truncate max-w-full text-center leading-none mt-1 sm:mt-0 tracking-tighter sm:tracking-normal">Copiloto</span>
            </button>

            <button
              onClick={() => setActiveTab('registrar')}
              className={`flex flex-col sm:flex-row items-center justify-center sm:space-x-2 px-0.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition min-w-0 sm:flex-shrink-0 ${
                activeTab === 'registrar'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <PlusCircle className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[9px] sm:text-xs font-bold truncate max-w-full text-center leading-none mt-1 sm:mt-0 tracking-tighter sm:tracking-normal">Registrar</span>
            </button>

            <button
              onClick={() => setActiveTab('historico')}
              className={`flex flex-col sm:flex-row items-center justify-center sm:space-x-2 px-0.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition min-w-0 sm:flex-shrink-0 ${
                activeTab === 'historico'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <History className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[9px] sm:text-xs font-bold truncate max-w-full text-center leading-none mt-1 sm:mt-0 tracking-tighter sm:tracking-normal">Histórico</span>
            </button>

            <button
              onClick={() => setActiveTab('emprestimos')}
              className={`flex flex-col sm:flex-row items-center justify-center sm:space-x-2 px-0.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition min-w-0 sm:flex-shrink-0 ${
                activeTab === 'emprestimos'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <HandCoins className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[9px] sm:text-xs font-bold truncate max-w-full text-center leading-none mt-1 sm:mt-0 tracking-tighter sm:tracking-normal">Empréstimos</span>
            </button>

            <button
              onClick={() => setActiveTab('metas')}
              className={`flex flex-col sm:flex-row items-center justify-center sm:space-x-2 px-0.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition min-w-0 sm:flex-shrink-0 ${
                activeTab === 'metas'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Target className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[9px] sm:text-xs font-bold truncate max-w-full text-center leading-none mt-1 sm:mt-0 tracking-tighter sm:tracking-normal">Metas</span>
            </button>

            <button
              onClick={() => setActiveTab('relatorios')}
              className={`flex flex-col sm:flex-row items-center justify-center sm:space-x-2 px-0.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition min-w-0 sm:flex-shrink-0 ${
                activeTab === 'relatorios'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[9px] sm:text-xs font-bold truncate max-w-full text-center leading-none mt-1 sm:mt-0 tracking-tighter sm:tracking-normal">Relatórios</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <MainApp />
    </FinanceProvider>
  );
}
