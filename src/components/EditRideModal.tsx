import React, { useState } from 'react';
import { X, Save, Trash2, Car, Calendar, Clock, Navigation } from 'lucide-react';
import { Ride, PlatformName, PLATFORMS } from '../context/FinanceContext';
import { FormField } from './FormField';
import { ConfirmModal } from './ConfirmModal';
import { parseCurrency, parseDistance, parseInteger, parseTimeMinutes, minutesToTimeString, maskCurrency } from '../utils/masks';
import { formatCurrency } from '../utils/format';
import {
  validateGrossValue,
  validateDistance,
  validateDuration,
  validateDate,
} from '../utils/validation';

interface EditRideModalProps {
  ride: Ride;
  onSave: (id: string, updated: Partial<Ride>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function EditRideModal({ ride, onSave, onDelete, onClose }: EditRideModalProps) {
  const [platform, setPlatform] = useState<PlatformName>(ride.platform);
  const [offeredValue, setOfferedValue] = useState<string>(
    ride.offeredValue !== undefined ? maskCurrency(Math.round(ride.offeredValue * 100).toString()) : ''
  );
  const [passengerValue, setPassengerValue] = useState<string>(
    ride.passengerValue !== undefined ? maskCurrency(Math.round(ride.passengerValue * 100).toString()) : ''
  );
  const [grossValue, setGrossValue] = useState<string>(maskCurrency(Math.round(ride.grossValue * 100).toString()));
  const [distance, setDistance] = useState<string>(ride.distance ? ride.distance.toString() : '');
  const [duration, setDuration] = useState<string>(ride.duration ? minutesToTimeString(ride.duration) : '');
  const [date, setDate] = useState<string>(ride.date);
  const [observations, setObservations] = useState<string>(ride.observations || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [grossValueError, setGrossValueError] = useState<string | null>(null);
  const [distanceError, setDistanceError] = useState<string | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const val = parseCurrency(grossValue);
    const dist = parseDistance(distance);
    const dur = parseTimeMinutes(duration);

    const valCheck = validateGrossValue(val);
    const distCheck = validateDistance(distance);
    const durCheck = validateDuration(duration);
    const dateCheck = validateDate(date);

    setGrossValueError(valCheck.errorMessage);
    setDistanceError(distCheck.errorMessage);
    setDurationError(durCheck.errorMessage);
    setDateError(dateCheck.errorMessage);

    if (!valCheck.isValid || !distCheck.isValid || !durCheck.isValid || !dateCheck.isValid) {
      return;
    }

    onSave(ride.id, {
      platform,
      grossValue: val,
      offeredValue: parseCurrency(offeredValue) || undefined,
      passengerValue: parseCurrency(passengerValue) || undefined,
      distance: dist,
      duration: dur,
      date,
      observations: observations.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-6 border border-slate-100 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2">
            <Car className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-lg">Editar Corrida</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Plataforma
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {PLATFORMS.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`py-2 px-2 rounded-xl font-bold text-xs border transition ${
                    platform === p
                      ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50 text-slate-950'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label="Valor Ofertado (R$)"
              mask="currency"
              prefix="R$"
              value={offeredValue}
              onChange={(val) => {
                setOfferedValue(val);
                if (!grossValue || grossValue === offeredValue) {
                  setGrossValue(val);
                }
              }}
            />

            <FormField
              label="Valor Passageiro (R$)"
              mask="currency"
              prefix="R$"
              value={passengerValue}
              onChange={setPassengerValue}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label="Valor Bruto (Recebido)"
              required
              mask="currency"
              prefix="R$"
              value={grossValue}
              onChange={(val) => {
                setGrossValue(val);
                if (grossValueError) setGrossValueError(null);
              }}
              error={grossValueError}
            />

            <FormField
              label="Data"
              required
              type="date"
              value={date}
              onChange={(val) => {
                setDate(val);
                if (dateError) setDateError(null);
              }}
              error={dateError}
              icon={<Calendar className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {parseCurrency(passengerValue) > 0 && (parseCurrency(offeredValue) > 0 || parseCurrency(grossValue) > 0) && (() => {
            const pass = parseCurrency(passengerValue);
            const off = parseCurrency(offeredValue) || parseCurrency(grossValue);
            const diff = pass - off;
            if (diff > 0) {
              return (
                <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-3 flex items-center justify-between text-xs text-rose-900 font-medium">
                  <span>Taxa do Aplicativo (Você deve à plataforma):</span>
                  <span className="font-extrabold text-rose-700">
                    -{formatCurrency(diff)} ({((diff / pass) * 100).toFixed(1)}%)
                  </span>
                </div>
              );
            } else if (diff < 0) {
              return (
                <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900 font-medium">
                  <span>Saldo Positivo (Plataforma pagou a mais / Bônus):</span>
                  <span className="font-extrabold text-emerald-700">
                    +{formatCurrency(Math.abs(diff))}
                  </span>
                </div>
              );
            } else {
              return (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-xs text-slate-700 font-medium">
                  <span>Taxa do Aplicativo:</span>
                  <span className="font-extrabold text-slate-700">R$ 0,00 (0.0%)</span>
                </div>
              );
            }
          })()}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label="Distância (KM)"
              mask="distance"
              suffix="KM"
              value={distance}
              onChange={(val) => {
                setDistance(val);
                if (distanceError) setDistanceError(null);
              }}
              error={distanceError}
              icon={<Navigation className="w-4 h-4 text-slate-400" />}
            />

            <FormField
              label="Duração"
              mask="time"
              placeholder="00:00:00"
              helperText="Formato: 00:00:00 (horas:minutos:segundos)"
              value={duration}
              onChange={(val) => {
                setDuration(val);
                if (durationError) setDurationError(null);
              }}
              error={durationError}
              icon={<Clock className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Observações
            </label>
            <input
              type="text"
              value={observations}
              onChange={(e) => setObservations(e.target.value.slice(0, 200))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-amber-500 bg-slate-50"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center space-x-1.5 text-rose-600 hover:text-rose-700 font-bold text-xs py-2.5 px-3 rounded-xl hover:bg-rose-50 transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir</span>
            </button>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Salvar</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Excluir Corrida"
        message="Tem certeza que deseja excluir esta corrida? Esta ação não pode ser desfeita."
        confirmText="Excluir Corrida"
        variant="danger"
        onConfirm={() => {
          onDelete(ride.id);
          onClose();
        }}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
