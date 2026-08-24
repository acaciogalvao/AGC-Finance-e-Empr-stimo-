import React from 'react';
import { Download, BarChart3, Clock, Navigation, DollarSign, PieChart, ShieldAlert, Percent, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useFinance, ExpenseCategory, EXPENSE_CATEGORIES, PLATFORMS, PLATFORM_COLORS } from '../context/FinanceContext';
import { formatCurrency, formatMinutes } from '../utils/format';
import { exportRidesCSV, exportExpensesCSV, exportFullReportCSV } from '../utils/export';

export function RelatoriosTab() {
  const {
    filteredRides,
    filteredExpenses,
    totalGross,
    totalCommissions,
    totalExpenses,
    totalNet,
    totalDistance,
    totalDuration,
    totalRides,
    ridesByPlatform,
    totalAppFeeBalance,
    expensesByCategory,
    meiTax,
    totalAfterMeiTax,
    periodLabel,
    goal,
  } = useFinance();

  const revenuePerHour = totalDuration > 0 ? (totalNet / totalDuration) * 60 : 0;
  const revenuePerKm = totalDistance > 0 ? totalNet / totalDistance : 0;
  const averageTicket = totalRides > 0 ? totalGross / totalRides : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Relatórios & Análise de Desempenho</h1>
          <p className="text-xs text-slate-500">Métricas de eficiência ({periodLabel}) e exportação de dados</p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => exportFullReportCSV(filteredRides, filteredExpenses)}
            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV Completo</span>
          </button>
        </div>
      </div>

      {/* Efficiency Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Rentabilidade por Hora</span>
            <div className="text-xl font-extrabold text-slate-900">
              {formatCurrency(revenuePerHour)} / hora
            </div>
            <span className="text-[11px] text-slate-400">
              Total trabalhado: {formatMinutes(totalDuration)}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Ganho por KM Rodado</span>
            <div className="text-xl font-extrabold text-slate-900">
              {formatCurrency(revenuePerKm)} / km
            </div>
            <span className="text-[11px] text-slate-400">
              Total rodado: {totalDistance.toFixed(1)} km
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Ticket Médio por Corrida</span>
            <div className="text-xl font-extrabold text-slate-900">
              {formatCurrency(averageTicket)}
            </div>
            <span className="text-[11px] text-slate-400">
              Total de corridas: {totalRides}
            </span>
          </div>
        </div>
      </div>

      {/* DRE Financial Statement Breakdown */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-amber-500" />
          <span>Demonstrativo de Resultado (DRE Simplificado)</span>
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
            <span className="font-medium text-slate-700">(+) Faturamento Bruto (Motorista)</span>
            <span className="font-extrabold text-slate-900">{formatCurrency(totalGross)}</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-rose-50/50 rounded-xl">
            <span className="font-medium text-rose-700">(-) Gastos Operacionais (Gasolina, Manutenção)</span>
            <span className="font-bold text-rose-600">-{formatCurrency(totalExpenses)}</span>
          </div>

          <div className="flex justify-between items-center p-3.5 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="font-bold text-emerald-900 flex items-center space-x-1">
              <span>(=) Lucro Líquido Real</span>
            </span>
            <span className="text-lg font-extrabold text-emerald-600">{formatCurrency(totalNet)}</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl border border-amber-100">
            <span className="font-medium text-amber-900">(-) Provisão MEI ({goal?.meiTaxRate ?? 6}%)</span>
            <span className="font-bold text-amber-700">-{formatCurrency(meiTax)}</span>
          </div>

          <div className="flex justify-between items-center p-3.5 bg-slate-900 text-white rounded-xl">
            <span className="font-bold">(=) Rendimento Final Pós-Impostos</span>
            <span className="text-lg font-extrabold text-amber-400">{formatCurrency(totalAfterMeiTax)}</span>
          </div>

          <div className="flex justify-between items-center p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 text-xs mt-2">
            <span className="text-slate-500">ℹ Taxas Retidas pelas Plataformas (Informativo)</span>
            <span className="font-semibold text-slate-600">{formatCurrency(totalCommissions)}</span>
          </div>
        </div>
      </div>

      {/* Platform App Fee & Balance Breakdown */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
            <Percent className="w-5 h-5 text-amber-500" />
            <span>Análise Individual de Taxas por Plataforma</span>
          </h3>
          <div
            className={`self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full flex items-center space-x-1 ${
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
                <span>Saldo Geral Apps: Devendo {formatCurrency(Math.abs(totalAppFeeBalance))}</span>
              </>
            ) : totalAppFeeBalance > 0 ? (
              <>
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                <span>Saldo Geral Apps: Ganhando +{formatCurrency(totalAppFeeBalance)}</span>
              </>
            ) : (
              <span>Saldo Geral Apps: R$ 0,00</span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="text-[11px] uppercase bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-3">Plataforma</th>
                <th className="py-2.5 px-3 text-center">Corridas</th>
                <th className="py-2.5 px-3 text-right">Val. Passageiro</th>
                <th className="py-2.5 px-3 text-right">Val. Ofertado</th>
                <th className="py-2.5 px-3 text-right">Val. Recebido</th>
                <th className="py-2.5 px-3 text-right">Taxa Retida</th>
                <th className="py-2.5 px-3 text-right">Saldo do App</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {PLATFORMS.map((p) => {
                const stat = ridesByPlatform[p];
                if (!stat || stat.count === 0) return null;

                const isNeg = stat.appFeeBalance < 0;
                const isPos = stat.appFeeBalance > 0;

                return (
                  <tr key={p} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3 flex items-center space-x-2 font-bold text-slate-900">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: PLATFORM_COLORS[p] || '#6B7280' }}
                      />
                      <span>{p}</span>
                    </td>
                    <td className="py-3 px-3 text-center">{stat.count}</td>
                    <td className="py-3 px-3 text-right text-slate-500">
                      {stat.passengerTotal > 0 ? formatCurrency(stat.passengerTotal) : '-'}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 font-semibold">
                      {stat.offeredTotal > 0 ? formatCurrency(stat.offeredTotal) : formatCurrency(stat.gross)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-600 font-bold">
                      {formatCurrency(stat.gross)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      {formatCurrency(stat.appFee)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
                          isNeg
                            ? 'bg-rose-50 text-rose-700'
                            : isPos
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isNeg
                          ? `- ${formatCurrency(Math.abs(stat.appFeeBalance))} (Devendo)`
                          : isPos
                          ? `+ ${formatCurrency(stat.appFeeBalance)} (Ganhando)`
                          : 'R$ 0,00'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!Object.values(ridesByPlatform).some((s) => s.count > 0) && (
            <div className="text-center py-6 text-slate-400 font-medium">
              Nenhuma corrida cadastrada no período para exibição de taxas.
            </div>
          )}
        </div>
      </div>

      {/* Expense Breakdown by Category */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
          <PieChart className="w-5 h-5 text-rose-500" />
          <span>Detalhamento de Despesas por Categoria</span>
        </h3>

        <div className="space-y-3">
          {EXPENSE_CATEGORIES.map((cat) => {
            const amount = expensesByCategory[cat] || 0;
            const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;

            return (
              <div key={cat} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">{cat}</span>
                  <span className="text-slate-900">
                    {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, percentage)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
