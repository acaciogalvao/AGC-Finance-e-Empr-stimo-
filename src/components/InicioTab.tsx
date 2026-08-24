import React, { useState } from 'react';
import {
  useFinance,
  Period,
  PlatformName,
  PLATFORMS,
  PLATFORM_COLORS,
} from '../context/FinanceContext';
import { formatCurrency, formatMinutes, todayISO } from '../utils/format';
import { Calendar, X, Filter, Percent, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface InicioTabProps {
  onOpenProfile?: () => void;
}

export function InicioTab({ onOpenProfile }: InicioTabProps = {}) {
  const {
    period,
    setPeriod,
    customDateRange,
    totalGross,
    totalNet,
    totalExpenses,
    totalRides,
    ridesByPlatform,
    totalAppFeeBalance,
    monthGross,
    monthlyGoalProgress,
    remainingToGoal,
    weeklyGross,
    weeklyGoalProgress,
    weeklyRemainingToGoal,
    todayGross,
    todayGoalProgress,
    todayRemainingToGoal,
    suggestedDailyGoal,
    workingDaysLeft,
    goal,
    profile,
    rides,
  } = useFinance();

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customStart, setCustomStart] = useState(customDateRange?.start || todayISO());
  const [customEnd, setCustomEnd] = useState(customDateRange?.end || todayISO());

  const periods: { id: Period; label: string }[] = [
    { id: 'hoje', label: 'Hoje' },
    { id: 'semanal', label: 'Semanal' },
    { id: 'mensal', label: 'Mensal' },
    { id: 'personalizado', label: 'Personalizado' },
  ];

  const handlePeriodSelect = (pId: Period) => {
    if (pId === 'personalizado') {
      setPeriod('personalizado', { start: customStart, end: customEnd });
      setShowCustomModal(true);
    } else {
      setPeriod(pId);
    }
  };

  const handleApplyCustomDates = (e: React.FormEvent) => {
    e.preventDefault();
    setPeriod('personalizado', { start: customStart, end: customEnd });
    setShowCustomModal(false);
  };

  // Calculate total distance & total duration
  const totalDistance = rides.reduce((acc, r) => acc + (r.distance || 0), 0);
  const totalDurationMinutes = rides.reduce((acc, r) => acc + (r.duration || 0), 0);

  const totalWorkingDays = goal?.workingDaysPerMonth || 22;
  const daysWorkedCount = Math.max(0, totalWorkingDays - (workingDaysLeft || 0));

  // Format today date e.g. "Sexta-Feira, 31 De Julho"
  const formattedTodayDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const capitalizeDate = (str: string) =>
    str.replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header: Greeting & Profile Avatar */}
      <div className="flex items-center justify-between pt-1 pb-1">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Olá, {profile?.name || 'Motorista'}
          </h1>
          <p className="text-xs font-medium text-slate-500">
            {capitalizeDate(formattedTodayDate)}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenProfile}
          title="Clique para abrir seu Perfil e Configurações"
          className="w-11 h-11 rounded-full border-2 border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-600 hover:scale-105 active:scale-95 transition-all flex items-center justify-center font-black text-lg shadow-sm cursor-pointer"
        >
          {profile?.name ? profile.name.charAt(0).toUpperCase() : 'A'}
        </button>
      </div>

      {/* Period Selector Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => handlePeriodSelect(p.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              period === p.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom Date Range Badge Indicator */}
      {period === 'personalizado' && (
        <div className="bg-emerald-50 border border-emerald-200/80 p-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-medium">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Período: <strong>{customStart.split('-').reverse().join('/')}</strong> até <strong>{customEnd.split('-').reverse().join('/')}</strong>
            </span>
          </div>
          <button
            onClick={() => setShowCustomModal(true)}
            className="text-emerald-700 font-bold hover:underline underline-offset-2 text-[11px] bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs"
          >
            Alterar Datas
          </button>
        </div>
      )}

      {/* Modal de Filtro de Data Personalizado */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 relative border border-slate-100">
            <button
              onClick={() => setShowCustomModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Filtrar por Período</h3>
                <p className="text-xs text-slate-500">Escolha a data de início e fim</p>
              </div>
            </div>

            <form onSubmit={handleApplyCustomDates} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data Final
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition shadow-sm flex items-center justify-center space-x-1"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Aplicar Filtro</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Row 1: Gross & Net Revenue */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            RECEITA BRUTA
          </span>
          <div className="text-lg font-extrabold text-emerald-600">
            {formatCurrency(totalGross)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            RECEITA LÍQUIDA
          </span>
          <div className="text-lg font-extrabold text-emerald-600">
            {formatCurrency(totalNet)}
          </div>
        </div>
      </div>

      {/* Row 2: Corridas, Distância, Tempo */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            CORRIDAS
          </span>
          <div className="text-lg font-extrabold text-slate-900">{totalRides}</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            DISTÂNCIA
          </span>
          <div className="text-lg font-extrabold text-slate-900">
            {totalDistance.toFixed(1)} km
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            TEMPO
          </span>
          <div className="text-lg font-extrabold text-slate-900">
            {formatMinutes(totalDurationMinutes)}
          </div>
        </div>
      </div>

      {/* Row 3: Despesas & Dias Trabalhados */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            DESPESAS
          </span>
          <div className="text-lg font-extrabold text-slate-900">
            {formatCurrency(totalExpenses)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            DIAS TRABALHADOS
          </span>
          <div className="text-lg font-extrabold text-slate-900">
            {daysWorkedCount}
          </div>
          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
            {workingDaysLeft || 0} dias restantes
          </span>
        </div>
      </div>

      {/* Card Taxas & Saldos por Plataforma */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Percent className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">Taxas por Plataforma</h3>
          </div>
          <div
            className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center space-x-1 ${
              totalAppFeeBalance < 0
                ? 'bg-rose-50 text-rose-700 border border-rose-100'
                : totalAppFeeBalance > 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {totalAppFeeBalance < 0 ? (
              <>
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                <span>Devendo: {formatCurrency(Math.abs(totalAppFeeBalance))}</span>
              </>
            ) : totalAppFeeBalance > 0 ? (
              <>
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ganhando: +{formatCurrency(totalAppFeeBalance)}</span>
              </>
            ) : (
              <span>Saldo Zerado</span>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          {PLATFORMS.map((p) => {
            const stat = ridesByPlatform[p];
            if (!stat || stat.count === 0) return null;

            const isNegative = stat.appFeeBalance < 0;
            const isPositive = stat.appFeeBalance > 0;

            return (
              <div
                key={p}
                className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2.5">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: PLATFORM_COLORS[p] || '#6B7280' }}
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">{p}</span>
                    <span className="text-[10px] text-slate-400">
                      {stat.count} corrida{stat.count > 1 ? 's' : ''}
                      {stat.passengerTotal > 0 && ` · Pass: ${formatCurrency(stat.passengerTotal)}`}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-extrabold text-slate-900">
                    {formatCurrency(stat.offeredTotal || stat.gross)}
                  </div>
                  <div
                    className={`text-[10px] font-bold flex items-center justify-end space-x-0.5 ${
                      isNegative
                        ? 'text-rose-600'
                        : isPositive
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                    }`}
                  >
                    <span>
                      {isNegative
                        ? `- ${formatCurrency(Math.abs(stat.appFeeBalance))} (Devendo)`
                        : isPositive
                        ? `+ ${formatCurrency(stat.appFeeBalance)} (Ganhando)`
                        : 'Taxa R$ 0,00'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {!Object.values(ridesByPlatform).some((s) => s.count > 0) && (
            <p className="text-xs text-slate-400 text-center py-2">
              Nenhuma corrida no período selecionado.
            </p>
          )}
        </div>
      </div>

      {/* Card Meta Operacional */}
      {(() => {
        const isHoje = period === 'hoje';
        const isSemanal = period === 'semanal';

        const periodLabel = periods.find((p) => p.id === period)?.label || 'Mensal';
        const cardTitle = isHoje ? 'Meta de Hoje' : isSemanal ? 'Meta Semanal' : 'Meta Mensal';
        const targetValue = isHoje
          ? goal?.dailyGross || suggestedDailyGoal
          : isSemanal
          ? goal?.weeklyGross || 0
          : goal?.monthlyGross || 0;
        const actualValue = isHoje ? todayGross : isSemanal ? weeklyGross : monthGross;
        const remainingValue = isHoje
          ? todayRemainingToGoal
          : isSemanal
          ? weeklyRemainingToGoal
          : remainingToGoal;
        const progressPercent = isHoje
          ? todayGoalProgress
          : isSemanal
          ? weeklyGoalProgress
          : monthlyGoalProgress;

        return (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">{cardTitle}</h3>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase">
                {periodLabel}
              </span>
            </div>

            <div className="flex items-center space-x-6">
              {/* Progress Ring */}
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-500 transition-all duration-1000"
                    strokeDasharray={`${Math.min(100, Math.max(0, progressPercent || 0))}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-sm font-extrabold text-slate-900 block">
                    {Math.round(progressPercent || 0)}%
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold block">concluído</span>
                </div>
              </div>

              {/* Goal Breakdown List */}
              <div className="flex-1 space-y-1 text-xs">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-medium">Meta</span>
                  <strong className="text-slate-900 font-bold">
                    {formatCurrency(targetValue)}
                  </strong>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-medium">Realizado</span>
                  <strong className="text-emerald-600 font-bold">
                    {formatCurrency(actualValue)}
                  </strong>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-medium">Falta</span>
                  <strong className="text-amber-500 font-bold">
                    {formatCurrency(remainingValue)}
                  </strong>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">Meta Mensal</span>
                  <strong className="text-slate-900 font-bold">
                    {formatCurrency(goal?.monthlyGross || 0)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Bottom Gray Pill Strip */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-around text-center text-xs">
              <div>
                <span className="text-slate-900 font-extrabold block">
                  {daysWorkedCount}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">Dias Trab.</span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div>
                <span className="text-slate-900 font-extrabold block">{workingDaysLeft || 0}</span>
                <span className="text-[10px] text-slate-400 font-medium block">Restantes</span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div>
                <span className="text-emerald-600 font-extrabold block">
                  {formatCurrency(suggestedDailyGoal)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">Meta Rec./Dia</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Empty State / Rides Notice */}
      {rides.length === 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/70 text-center space-y-1.5 shadow-xs">
          <h4 className="font-extrabold text-slate-800 text-sm">
            Nenhuma corrida registrada
          </h4>
          <p className="text-xs text-slate-500">
            Registre sua primeira corrida na aba <strong>+ Registrar</strong>
          </p>
        </div>
      )}
    </div>
  );
}
