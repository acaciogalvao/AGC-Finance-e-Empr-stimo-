import React, { useState, useRef, useMemo } from 'react';
import {
  Car,
  Receipt,
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  MessageSquare,
  Camera,
  Image as ImageIcon,
  ChevronDown,
  Trash2,
  Tag,
  AlertCircle,
  QrCode,
  Copy,
  Check,
  Maximize2,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  useFinance,
  PlatformName,
  ExpenseCategory,
  PLATFORMS,
  EXPENSE_CATEGORIES,
} from '../context/FinanceContext';
import { todayISO, formatCurrency } from '../utils/format';
import { parseCurrency, parseDistance, parseInteger, parseTimeMinutes } from '../utils/masks';
import { generatePixPayload } from '../utils/pix';
import { FormField } from './FormField';

export function RegistrarTab() {
  const { addRide, addExpense, profile, rides } = useFinance();

  const [mode, setMode] = useState<'ride' | 'expense'>('ride');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cobrar (Pix) Modal State
  const [showCobrarModal, setShowCobrarModal] = useState(false);
  const [cobrarAmount, setCobrarAmount] = useState('');
  const [isQrExpanded, setIsQrExpanded] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  // File Inputs for Camera and Gallery
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Ride Form State with Persistent Platform Selection
  const [platform, setPlatformState] = useState<PlatformName>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('agc_last_platform');
      if (saved && (PLATFORMS as readonly string[]).includes(saved)) {
        return saved as PlatformName;
      }
    }
    return rides && rides.length > 0 ? rides[0].platform : 'Uber';
  });

  const setPlatform = (p: PlatformName) => {
    setPlatformState(p);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('agc_last_platform', p);
    }
  };

  const [offeredValue, setOfferedValue] = useState<string>('');
  const [passengerValue, setPassengerValue] = useState<string>('');
  const [grossValue, setGrossValue] = useState<string>('');
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [rideDate, setRideDate] = useState<string>(todayISO());
  const [observations, setObservations] = useState<string>('');

  // Expense Form State
  const [category, setCategory] = useState<ExpenseCategory>('Combustível');
  const [expenseValue, setExpenseValue] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(todayISO());
  const [description, setDescription] = useState<string>('');

  // Form Errors State
  const [rideError, setRideError] = useState<string | null>(null);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  // Generate Pix Payload for Cobrar Modal
  const pixPayload = useMemo(() => {
    if (!profile?.pixKey) return '';
    const amt = parseCurrency(cobrarAmount);
    return generatePixPayload({
      key: profile?.pixKey || '',
      keyType: profile?.pixType || 'celular',
      name: profile?.name || 'Motorista',
      amount: amt > 0 ? amt : undefined,
      description: 'Corrida',
    });
  }, [profile?.pixKey, profile?.pixType, profile?.name, cobrarAmount]);

  const handleCobrarAmountChange = (val: string) => {
    setCobrarAmount(val);
    setGrossValue(val);
    setPassengerValue(val);
  };

  const openCobrarModal = () => {
    const initialAmt = grossValue || passengerValue || offeredValue || '';
    setCobrarAmount(initialAmt);
    if (initialAmt) {
      setGrossValue(initialAmt);
      if (!passengerValue) setPassengerValue(initialAmt);
    }
    setShowCobrarModal(true);
  };

  const handleCopyPix = () => {
    if (!pixPayload) return;
    navigator.clipboard.writeText(pixPayload);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2500);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedPhoto(reader.result as string);
        triggerToast('Comprovante anexado com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRideError(null);

    const val = parseCurrency(grossValue);
    const offVal = parseCurrency(offeredValue);
    const passVal = parseCurrency(passengerValue);
    const dist = parseDistance(distance);
    const dur = parseTimeMinutes(duration);

    // If grossValue wasn't filled directly, fallback to offeredValue or passengerValue
    const effectiveGross = val > 0 ? val : (offVal > 0 ? offVal : (passVal > 0 ? passVal : 0));

    if (effectiveGross <= 0) {
      setRideError('Por favor, informe o valor ofertado ou o valor recebido da corrida.');
      return;
    }

    addRide({
      platform,
      grossValue: effectiveGross,
      offeredValue: offVal > 0 ? offVal : undefined,
      passengerValue: passVal > 0 ? passVal : undefined,
      distance: dist || 0,
      duration: dur || 0,
      date: rideDate || todayISO(),
      observations: observations.trim() || undefined,
      photo: selectedPhoto || undefined,
    });

    setOfferedValue('');
    setPassengerValue('');
    setGrossValue('');
    setDistance('');
    setDuration('');
    setObservations('');
    setSelectedPhoto(null);
    setRideError(null);
    triggerToast(`Corrida na ${platform} registrada com sucesso!`);
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError(null);

    const val = parseCurrency(expenseValue);
    if (!val || val <= 0) {
      setExpenseError('Por favor, informe o valor da despesa.');
      return;
    }

    addExpense({
      category,
      value: val,
      date: expenseDate || todayISO(),
      description: description.trim() || category,
    });

    setExpenseValue('');
    setDescription('');
    setSelectedPhoto(null);
    setExpenseError(null);
    triggerToast(`Gasto de ${category} registrado com sucesso!`);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-12">
      {/* Hidden File Inputs for Camera and Gallery */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-slate-900 text-white border border-slate-800 px-4 py-2.5 rounded-2xl shadow-xl flex items-center space-x-2 z-50 animate-in fade-in slide-in-from-bottom-4 text-xs font-bold">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title */}
      <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Registrar</h1>

      {/* Top Toggle Pills */}
      <div className="bg-slate-200/80 p-1 rounded-2xl flex space-x-1">
        <button
          onClick={() => setMode('ride')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-center transition ${
            mode === 'ride'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Corrida
        </button>
        <button
          onClick={() => setMode('expense')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-center transition ${
            mode === 'expense'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Despesa
        </button>
      </div>

      {/* Form Container Card */}
      {mode === 'ride' ? (
        <form
          onSubmit={handleRideSubmit}
          className="bg-white p-5 rounded-2xl shadow-sm space-y-4"
        >
          {/* Banner Cobrar Passageiro via PIX */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-3.5 rounded-2xl text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs">Cobrar Passageiro via PIX</h4>
                <p className="text-[11px] text-emerald-100 font-medium">Gere o QR Code e preencha o valor bruto</p>
              </div>
            </div>
            <button
              type="button"
              onClick={openCobrarModal}
              className="px-3.5 py-2 bg-white text-emerald-800 hover:bg-emerald-50 font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 shrink-0 flex items-center space-x-1.5"
            >
              <QrCode className="w-4 h-4 text-emerald-700" />
              <span>Cobrar</span>
            </button>
          </div>

          {/* Plataforma Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Plataforma <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as PlatformName)}
                className="w-full appearance-none bg-slate-100/80 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer shadow-2xs border-0"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    ● {p}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Campos de Valores: Oferta e Passageiro */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Valor Ofertado"
              mask="currency"
              prefix="R$"
              placeholder="0,00"
              value={offeredValue}
              onChange={(v) => {
                setOfferedValue(v);
                if (!grossValue || grossValue === offeredValue) {
                  setGrossValue(v);
                }
              }}
            />

            <FormField
              label="Valor Passageiro"
              mask="currency"
              prefix="R$"
              placeholder="0,00"
              value={passengerValue}
              onChange={setPassengerValue}
            />
          </div>

          {/* Valor Bruto (Recebido) com Botão Cobrar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Valor Bruto (Recebido) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={openCobrarModal}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] transition active:scale-95"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Cobrar Pix</span>
              </button>
            </div>
            <FormField
              label=""
              required
              mask="currency"
              prefix="R$"
              placeholder="0,00"
              value={grossValue}
              onChange={setGrossValue}
            />
          </div>

          {/* Resumo da Taxa / Saldo do Aplicativo */}
          {parseCurrency(passengerValue) > 0 && (parseCurrency(offeredValue) > 0 || parseCurrency(grossValue) > 0) && (() => {
            const pass = parseCurrency(passengerValue);
            const off = parseCurrency(offeredValue) || parseCurrency(grossValue);
            const diff = pass - off;
            if (diff > 0) {
              return (
                <div className="bg-rose-50 rounded-xl p-3 flex items-center justify-between text-xs text-rose-900 font-medium shadow-2xs">
                  <span>Taxa do Aplicativo (Você deve à plataforma):</span>
                  <span className="font-extrabold text-rose-700">
                    -{formatCurrency(diff)} ({((diff / pass) * 100).toFixed(1)}%)
                  </span>
                </div>
              );
            } else if (diff < 0) {
              return (
                <div className="bg-emerald-50 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900 font-medium shadow-2xs">
                  <span>Saldo Positivo (Plataforma pagou a mais / Bônus):</span>
                  <span className="font-extrabold text-emerald-700">
                    +{formatCurrency(Math.abs(diff))}
                  </span>
                </div>
              );
            } else {
              return (
                <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between text-xs text-slate-700 font-medium shadow-2xs">
                  <span>Taxa do Aplicativo:</span>
                  <span className="font-extrabold text-slate-700">R$ 0,00 (0.0%)</span>
                </div>
              );
            }
          })()}

          {/* Distância & Duração Grid */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Distância"
              required
              mask="distance"
              suffix="KM"
              placeholder="1000.45"
              value={distance}
              onChange={setDistance}
              icon={<MapPin className="w-4 h-4 text-slate-400" />}
            />

            <FormField
              label="Duração"
              mask="time"
              placeholder="00:00:00"
              helperText="Formato: 00:00:00 (horas:minutos:segundos)"
              value={duration}
              onChange={setDuration}
              icon={<Clock className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* Data */}
          <FormField
            label="Data"
            required
            type="date"
            value={rideDate}
            onChange={setRideDate}
            icon={<Calendar className="w-4 h-4 text-slate-400" />}
          />

          {/* Observações */}
          <FormField
            label="Observações"
            mask="description"
            placeholder="Opcional..."
            value={observations}
            onChange={setObservations}
            icon={<MessageSquare className="w-4 h-4 text-slate-400" />}
          />

          {/* Foto do Comprovante */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Foto do Comprovante
            </label>
            {selectedPhoto ? (
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-3">
                  <img
                    src={selectedPhoto}
                    alt="Comprovante"
                    className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Comprovante Anexado</span>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Imagem pronta para salvar
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Remover comprovante"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center justify-center space-x-2 bg-slate-100/80 border border-slate-200/80 hover:bg-slate-200/80 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition active:scale-95"
                >
                  <Camera className="w-4 h-4 text-slate-600" />
                  <span>Câmera</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex items-center justify-center space-x-2 bg-slate-100/80 border border-slate-200/80 hover:bg-slate-200/80 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition active:scale-95"
                >
                  <ImageIcon className="w-4 h-4 text-slate-600" />
                  <span>Galeria</span>
                </button>
              </div>
            )}
          </div>

          {/* Erro de Validação */}
          {rideError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{rideError}</span>
            </div>
          )}

          {/* Salvar Corrida Button */}
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-xl text-xs transition shadow-sm active:scale-98"
          >
            Salvar Corrida
          </button>
        </form>
      ) : (
        /* Expense Form */
        <form
          onSubmit={handleExpenseSubmit}
          className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-xs space-y-4"
        >
          {/* Categoria */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Categoria <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full appearance-none bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 cursor-pointer"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Valor da Despesa */}
          <FormField
            label="Valor da Despesa"
            required
            mask="currency"
            prefix="R$"
            placeholder="0,00"
            value={expenseValue}
            onChange={setExpenseValue}
          />

          {/* Data */}
          <FormField
            label="Data"
            required
            type="date"
            value={expenseDate}
            onChange={setExpenseDate}
            icon={<Calendar className="w-4 h-4 text-slate-400" />}
          />

          {/* Descrição */}
          <FormField
            label="Descrição"
            mask="description"
            placeholder="Ex: Gasolina, Almoço, Troca de óleo..."
            value={description}
            onChange={setDescription}
            icon={<Tag className="w-4 h-4 text-slate-400" />}
          />

          {/* Foto do Comprovante */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Foto do Comprovante / Nota
            </label>
            {selectedPhoto ? (
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-3">
                  <img
                    src={selectedPhoto}
                    alt="Comprovante"
                    className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Comprovante Anexado</span>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Imagem pronta para salvar
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Remover comprovante"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center justify-center space-x-2 bg-slate-100/80 border border-slate-200/80 hover:bg-slate-200/80 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition active:scale-95"
                >
                  <Camera className="w-4 h-4 text-slate-600" />
                  <span>Câmera</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex items-center justify-center space-x-2 bg-slate-100/80 border border-slate-200/80 hover:bg-slate-200/80 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition active:scale-95"
                >
                  <ImageIcon className="w-4 h-4 text-slate-600" />
                  <span>Galeria</span>
                </button>
              </div>
            )}
          </div>

          {/* Erro de Validação de Despesa */}
          {expenseError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{expenseError}</span>
            </div>
          )}

          {/* Salvar Despesa Button */}
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-xl text-xs transition shadow-sm active:scale-98"
          >
            Salvar Despesa
          </button>
        </form>
      )}

      {/* Modal de Cobrança PIX */}
      {showCobrarModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Cobrar Passageiro via PIX</h3>
                  <p className="text-xs text-slate-500 font-medium">Gere o QR Code para o passageiro</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCobrarModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input de Valor */}
            <div className="space-y-1.5">
              <FormField
                label="Valor a Cobrar do Passageiro (R$)"
                mask="currency"
                prefix="R$"
                placeholder="0,00"
                value={cobrarAmount}
                onChange={handleCobrarAmountChange}
                autoFocus
              />
              <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <span>💡 Este valor preenche automaticamente o campo <strong>Valor Bruto</strong>.</span>
              </p>
            </div>

            {/* Seção da Chave PIX e QR Code */}
            {!profile?.pixKey ? (
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Nenhuma Chave PIX Cadastrada</span>
                </div>
                <p className="text-amber-700 font-medium leading-relaxed">
                  Para gerar o QR Code automaticamente, cadastre sua chave PIX na aba <strong>Perfil</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Badge Chave PIX */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">
                      Chave PIX ({profile.pixType || 'Cadastrada'})
                    </span>
                    <strong className="text-slate-900 font-bold block">{profile.pixKey}</strong>
                  </div>
                  {profile.name && (
                    <span className="text-[11px] font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      {profile.name}
                    </span>
                  )}
                </div>

                {/* Bloco QR Code */}
                <div
                  onClick={() => {
                    if (pixPayload) setIsQrExpanded(true);
                  }}
                  className="bg-white p-5 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/20 flex flex-col items-center justify-center cursor-pointer transition group relative shadow-inner"
                  title="Clique para expandir o QR Code em tela cheia"
                >
                  {pixPayload ? (
                    <>
                      <div className="bg-white p-3 rounded-xl shadow-md border border-slate-100 group-hover:scale-105 transition-transform">
                        <QRCodeSVG value={pixPayload} size={180} />
                      </div>
                      <div className="mt-3 flex items-center space-x-1.5 text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Clique no QR Code para expandir</span>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs font-medium">
                      Digite um valor acima para gerar o QR Code
                    </div>
                  )}
                </div>

                {/* Botão Copiar Código PIX */}
                {pixPayload && (
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="w-full py-3 px-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition active:scale-98"
                  >
                    {pixCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{pixCopied ? 'Código Pix Copiado!' : 'Copiar Pix Copia e Cola'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <button
              type="button"
              onClick={() => setShowCobrarModal(false)}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition shadow-xs"
            >
              Confirmar e Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal QR Code Expandido (Tela Cheia / Zoom) */}
      {isQrExpanded && pixPayload && (
        <div
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-[60] animate-in zoom-in-95 duration-200"
          onClick={() => setIsQrExpanded(false)}
        >
          <div
            className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-5 max-w-sm w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsQrExpanded(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 pt-2">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block">Pagamento PIX</span>
              <h3 className="text-3xl font-black text-slate-900">
                {cobrarAmount ? formatCurrency(parseCurrency(cobrarAmount)) : 'R$ 0,00'}
              </h3>
              {profile?.name && (
                <p className="text-xs text-slate-500 font-semibold">{profile.name}</p>
              )}
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-md">
              <QRCodeSVG value={pixPayload} size={260} />
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Mostre este QR Code para o passageiro escanear pelo aplicativo do banco.
            </p>

            <button
              type="button"
              onClick={() => setIsQrExpanded(false)}
              className="w-full py-3 bg-slate-900 text-white font-extrabold text-xs rounded-xl hover:bg-slate-800 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

