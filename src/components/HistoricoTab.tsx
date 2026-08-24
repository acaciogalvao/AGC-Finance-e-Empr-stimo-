import React, { useState, useMemo } from 'react';
import { Search, Inbox, Edit2, Trash2, Car, Receipt } from 'lucide-react';
import {
  useFinance,
  Ride,
  Expense,
  PLATFORM_COLORS,
  PLATFORM_TEXT_COLORS,
  PLATFORM_COMMISSION,
} from '../context/FinanceContext';
import { formatCurrency, formatDateDisplay, formatMinutes, dateInputToISO } from '../utils/format';
import { EditRideModal } from './EditRideModal';
import { EditExpenseModal } from './EditExpenseModal';
import { ConfirmModal } from './ConfirmModal';

type FilterType = 'all' | 'rides' | 'expenses';

export function HistoricoTab() {
  const {
    rides,
    expenses,
    updateRide,
    deleteRide,
    updateExpense,
    deleteExpense,
  } = useFinance();

  const [filterType, setFilterType] = useState<FilterType>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRide, setEditingRide] = useState<Ride | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [deletingRideId, setDeletingRideId] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // Combine and sort rides and expenses chronologically
  const mergedHistory = useMemo(() => {
    const rideItems = rides.map((r) => ({ type: 'ride' as const, date: dateInputToISO(r.date), item: r }));
    const expenseItems = expenses.map((e) => ({ type: 'expense' as const, date: dateInputToISO(e.date), item: e }));

    let combined = [...rideItems, ...expenseItems];

    if (filterType === 'rides') combined = combined.filter((i) => i.type === 'ride');
    if (filterType === 'expenses') combined = combined.filter((i) => i.type === 'expense');

    if (platformFilter !== 'all') {
      combined = combined.filter(
        (i) => i.type === 'ride' && i.item.platform.toLowerCase() === platformFilter.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      combined = combined.filter((i) => {
        if (i.type === 'ride') {
          return (
            i.item.platform.toLowerCase().includes(q) ||
            (i.item.observations && i.item.observations.toLowerCase().includes(q))
          );
        } else {
          return (
            i.item.category.toLowerCase().includes(q) ||
            i.item.description.toLowerCase().includes(q)
          );
        }
      });
    }

    return combined.sort((a, b) => b.date.localeCompare(a.date));
  }, [rides, expenses, filterType, platformFilter, searchQuery]);

  return (
    <div className="space-y-3 pb-12">
      <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Histórico</h1>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200/80 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
        />
      </div>

      {/* Filter Row 1: Todos / Corridas / Despesas */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
            filterType === 'all'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-200/70 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilterType('rides')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
            filterType === 'rides'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-200/70 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Corridas
        </button>
        <button
          onClick={() => setFilterType('expenses')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
            filterType === 'expenses'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-200/70 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Despesas
        </button>
      </div>

      {/* Filter Row 2: Platforms (Todas, Uber, 99, InDrive) */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setPlatformFilter('all')}
          className={`px-3.5 py-1 rounded-full text-xs font-bold transition border ${
            platformFilter === 'all'
              ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
              : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setPlatformFilter('Uber')}
          className={`px-3.5 py-1 rounded-full text-xs font-bold transition border ${
            platformFilter === 'Uber'
              ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
              : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'
          }`}
        >
          Uber
        </button>
        <button
          onClick={() => setPlatformFilter('99')}
          className={`px-3.5 py-1 rounded-full text-xs font-bold transition border ${
            platformFilter === '99'
              ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
              : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'
          }`}
        >
          99
        </button>
        <button
          onClick={() => setPlatformFilter('InDrive')}
          className={`px-3.5 py-1 rounded-full text-xs font-bold transition border ${
            platformFilter === 'InDrive'
              ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
              : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'
          }`}
        >
          InDrive
        </button>
      </div>

      {/* Record Counter */}
      <span className="text-xs text-slate-400 font-medium block pt-1">
        {mergedHistory.length} {mergedHistory.length === 1 ? 'registro' : 'registros'}
      </span>

      {/* History Items or Empty State */}
      <div className="space-y-3 pt-4">
        {mergedHistory.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-200/60 text-slate-500 flex items-center justify-center mx-auto">
              <Inbox className="w-8 h-8 stroke-1.5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">
              Nenhum registro encontrado
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Registros aparecerão aqui.
            </p>
          </div>
        ) : (
          mergedHistory.map((entry) => {
            if (entry.type === 'ride') {
              const ride = entry.item;
              const grossVal = ride.grossValue > 0 ? ride.grossValue : (ride.offeredValue || 0);
              const bgColor = PLATFORM_COLORS[ride.platform] || '#6B7280';
              const textColor = PLATFORM_TEXT_COLORS[ride.platform] || '#FFFFFF';

              return (
                <div
                  key={`ride-${ride.id}`}
                  className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/70 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Car className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-extrabold"
                          style={{ backgroundColor: bgColor, color: textColor }}
                        >
                          {ride.platform}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {formatDateDisplay(ride.date)}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 mt-0.5 space-y-0.5">
                        <div>
                          {ride.distance > 0 && <span>{ride.distance} km</span>}
                          {ride.duration > 0 && <span> · {formatMinutes(ride.duration)}</span>}
                        </div>
                        {(ride.passengerValue !== undefined || ride.offeredValue !== undefined) && (
                          <div className="text-[10px] text-slate-400 font-medium flex flex-wrap items-center gap-x-1.5 mt-0.5">
                            {ride.passengerValue !== undefined && (
                              <span>Passageiro: {formatCurrency(ride.passengerValue)}</span>
                            )}
                            {ride.offeredValue !== undefined && (
                              <span>· Oferta: {formatCurrency(ride.offeredValue)}</span>
                            )}
                            {ride.passengerValue !== undefined && (
                              (() => {
                                const offered = ride.offeredValue ?? grossVal;
                                const diff = ride.passengerValue - offered;
                                if (diff > 0) {
                                  return (
                                    <span className="text-rose-600 font-bold">
                                      · Taxa App: -{formatCurrency(diff)} (Devendo)
                                    </span>
                                  );
                                } else if (diff < 0) {
                                  return (
                                    <span className="text-emerald-600 font-bold">
                                      · Saldo App: +{formatCurrency(Math.abs(diff))} (Ganhando)
                                    </span>
                                  );
                                } else {
                                  return <span className="text-slate-500 font-bold">· Taxa App: R$ 0,00</span>;
                                }
                              })()
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-emerald-600">
                        +{formatCurrency(grossVal)}
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Valor Bruto
                      </span>
                    </div>

                    <div className="flex items-center space-x-0.5">
                      <button
                        onClick={() => setEditingRide(ride)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingRideId(ride.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            } else {
              const expense = entry.item;
              return (
                <div
                  key={`expense-${expense.id}`}
                  className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/70 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700">
                          {expense.category}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {formatDateDisplay(expense.date)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                        {expense.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-rose-600">
                        -{formatCurrency(expense.value)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-0.5">
                      <button
                        onClick={() => setEditingExpense(expense)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingExpenseId(expense.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
          })
        )}
      </div>

      {/* Modals */}
      {editingRide && (
        <EditRideModal
          ride={editingRide}
          onSave={updateRide}
          onDelete={deleteRide}
          onClose={() => setEditingRide(null)}
        />
      )}

      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          onSave={updateExpense}
          onDelete={deleteExpense}
          onClose={() => setEditingExpense(null)}
        />
      )}

      <ConfirmModal
        isOpen={!!deletingRideId}
        title="Excluir Corrida"
        message="Tem certeza que deseja excluir esta corrida?"
        confirmText="Excluir"
        variant="danger"
        onConfirm={() => {
          if (deletingRideId) {
            deleteRide(deletingRideId);
            setDeletingRideId(null);
          }
        }}
        onClose={() => setDeletingRideId(null)}
      />

      <ConfirmModal
        isOpen={!!deletingExpenseId}
        title="Excluir Despesa"
        message="Tem certeza que deseja excluir esta despesa?"
        confirmText="Excluir"
        variant="danger"
        onConfirm={() => {
          if (deletingExpenseId) {
            deleteExpense(deletingExpenseId);
            setDeletingExpenseId(null);
          }
        }}
        onClose={() => setDeletingExpenseId(null)}
      />
    </div>
  );
}
