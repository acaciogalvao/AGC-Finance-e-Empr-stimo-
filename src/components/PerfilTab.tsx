import React, { useState, useEffect } from 'react';
import {
  User,
  Car,
  Smartphone,
  Mail,
  QrCode,
  Save,
  CheckCircle2,
  Trash2,
  Check,
  ShieldCheck,
  Sparkles,
  Layers,
  Fuel,
  ArrowLeft,
} from 'lucide-react';
import { useFinance, PLATFORMS, PlatformName, Profile } from '../context/FinanceContext';
import { FormField } from './FormField';
import { ConfirmModal } from './ConfirmModal';
import { formatCurrency } from '../utils/format';
import { maskPixKey } from '../utils/masks';

interface PerfilTabProps {
  onBackToInicio?: () => void;
}

export function PerfilTab({ onBackToInicio }: PerfilTabProps = {}) {
  const {
    profile,
    setProfile,
    rides,
    expenses,
    totalGross,
    totalNet,
    clearAllData
  } = useFinance();

  const [isDirty, setIsDirty] = useState(false);

  const [formData, setFormData] = useState<Profile>({
    name: profile?.name ?? '',
    vehicleType: profile?.vehicleType || 'Carro',
    activePlatforms: profile?.activePlatforms || ['Uber', '99'],
    vehicleModel: profile?.vehicleModel || '',
    vehiclePlate: profile?.vehiclePlate || '',
    fuelType: profile?.fuelType || 'Flex',
    phone: profile?.phone || '',
    email: profile?.email || '',
    pixKey: profile?.pixKey || '',
    pixType: profile?.pixType || 'celular',
  });

  const updateField = <K extends keyof Profile>(field: K, value: Profile[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  useEffect(() => {
    if (profile && !isDirty) {
      setFormData({
        name: profile.name ?? '',
        vehicleType: profile.vehicleType || 'Carro',
        activePlatforms: profile.activePlatforms || ['Uber', '99'],
        vehicleModel: profile.vehicleModel || '',
        vehiclePlate: profile.vehiclePlate || '',
        fuelType: profile.fuelType || 'Flex',
        phone: profile.phone || '',
        email: profile.email || '',
        pixKey: profile.pixKey || '',
        pixType: profile.pixType || 'celular',
      });
    }
  }, [profile, isDirty]);

  const handleTogglePlatform = (platform: PlatformName) => {
    setFormData((prev) => {
      const current = prev.activePlatforms || [];
      const exists = current.includes(platform);
      const updated = exists
        ? current.filter((p) => p !== platform)
        : [...current, platform];
      return { ...prev, activePlatforms: updated };
    });
    setIsDirty(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(formData);
    setIsDirty(false);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {onBackToInicio && (
        <button
          onClick={onBackToInicio}
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Voltar ao Início</span>
        </button>
      )}

      {/* Header Profile Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-emerald-400 font-extrabold text-2xl">
                {formData.name ? formData.name.charAt(0).toUpperCase() : 'M'}
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-extrabold text-white">{formData.name || 'Motorista'}</h2>
                <span className="inline-flex items-center space-x-1 bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Perfil Ativo</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
                <span>{formData.vehicleType || 'Carro'}</span>
                {formData.vehicleModel && <span>• {formData.vehicleModel}</span>}
                {formData.vehiclePlate && <span>• {formData.vehiclePlate}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-800/80 backdrop-blur-md px-3 py-2 rounded-xl text-xs font-semibold text-slate-300">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{formData.activePlatforms.length} Plataforma(s) Conectada(s)</span>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/60 text-xs">
          <div className="bg-slate-800/50 p-3 rounded-xl">
            <span className="text-slate-400 block font-medium text-[11px]">Total Corridas</span>
            <span className="text-base font-extrabold text-white">{rides.length}</span>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-xl">
            <span className="text-slate-400 block font-medium text-[11px]">Total Despesas</span>
            <span className="text-base font-extrabold text-rose-400">{expenses.length}</span>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-xl">
            <span className="text-slate-400 block font-medium text-[11px]">Faturamento Acumulado</span>
            <span className="text-base font-extrabold text-emerald-400">{formatCurrency(totalGross)}</span>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-xl">
            <span className="text-slate-400 block font-medium text-[11px]">Lucro Líquido</span>
            <span className="text-base font-extrabold text-teal-300">{formatCurrency(totalNet)}</span>
          </div>
        </div>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Details Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <User className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-800">Dados do Motorista</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Nome Completo"
              value={formData.name}
              onChange={(val) => updateField('name', val)}
              placeholder="Ex: Carlos Silva"
              mask="name"
            />

            <FormField
              label="Telefone / WhatsApp"
              value={formData.phone || ''}
              onChange={(val) => updateField('phone', val)}
              placeholder="(11) 99999-9999"
              mask="phone"
              icon={<Smartphone className="w-4 h-4 text-slate-400" />}
            />

            <FormField
              label="E-mail"
              value={formData.email || ''}
              onChange={(val) => updateField('email', val)}
              placeholder="motorista@email.com"
              type="email"
              icon={<Mail className="w-4 h-4 text-slate-400" />}
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Chave Pix</label>
              <select
                value={formData.pixType || 'celular'}
                onChange={(e) => {
                  const newType = e.target.value as 'celular' | 'cpf' | 'cnpj' | 'email' | 'aleatoria';
                  setFormData((prev) => ({
                    ...prev,
                    pixType: newType,
                    pixKey: maskPixKey(prev.pixKey || '', newType)
                  }));
                  setIsDirty(true);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm font-medium bg-slate-100/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 border-0 shadow-2xs"
              >
                <option value="celular">Celular (WhatsApp)</option>
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">E-mail</option>
                <option value="aleatoria">Chave Aleatória (EVP)</option>
              </select>
            </div>

            <FormField
              label="Chave PIX (para pagamentos/empréstimos)"
              value={formData.pixKey || ''}
              onChange={(val) => {
                const currentType = formData.pixType || 'celular';
                updateField('pixKey', maskPixKey(val, currentType));
              }}
              placeholder={
                formData.pixType === 'celular'
                  ? '(11) 99999-9999'
                  : formData.pixType === 'cpf'
                  ? '000.000.000-00'
                  : formData.pixType === 'cnpj'
                  ? '00.000.000/0001-00'
                  : formData.pixType === 'email'
                  ? 'motorista@email.com'
                  : 'Chave Aleatória (EVP)'
              }
              icon={<QrCode className="w-4 h-4 text-slate-400" />}
            />
          </div>
        </div>

        {/* Vehicle Information Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Car className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-800">Dados do Veículo</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Veículo</label>
              <select
                value={formData.vehicleType}
                onChange={(e) => updateField('vehicleType', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm font-medium bg-slate-100/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 border-0 shadow-2xs"
              >
                <option value="Carro">Carro (Passeio / SUV)</option>
                <option value="Moto">Moto</option>
                <option value="Van">Van / Micro-ônibus</option>
                <option value="Bicicleta">Bicicleta / Patinete</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <FormField
              label="Modelo do Veículo"
              value={formData.vehicleModel || ''}
              onChange={(val) => updateField('vehicleModel', val)}
              placeholder="Ex: Chevrolet Onix 1.0 Flex"
              mask="name"
            />

            <FormField
              label="Placa do Veículo"
              value={formData.vehiclePlate || ''}
              onChange={(val) => updateField('vehiclePlate', val)}
              placeholder="Ex: ABC-1D23"
              mask="plate"
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <Fuel className="w-3.5 h-3.5 text-slate-500" />
                <span>Combustível Principal</span>
              </label>
              <select
                value={formData.fuelType || 'Flex'}
                onChange={(e) => updateField('fuelType', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm font-medium bg-slate-100/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 border-0 shadow-2xs"
              >
                <option value="Flex">Flex (Gasolina / Etanol)</option>
                <option value="Gasolina">Gasolina</option>
                <option value="Etanol">Etanol</option>
                <option value="GNV">GNV (Gás Natural)</option>
                <option value="Elétrico">Elétrico / Híbrido</option>
                <option value="Diesel">Diesel</option>
              </select>
            </div>
          </div>
        </div>

        {/* Platforms Selection Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-800">Plataformas de Atuação</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">Selecione as que você utiliza</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {PLATFORMS.map((platform) => {
              const isSelected = formData.activePlatforms.includes(platform);
              return (
                <button
                  type="button"
                  key={platform}
                  onClick={() => handleTogglePlatform(platform)}
                  className={`p-3 rounded-xl text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-bold">{platform}</span>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-2 font-normal">
                    {isSelected ? 'Ativa' : 'Inativa'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Save & Danger Zone Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md transition flex items-center justify-center space-x-2"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                <span>Perfil Salvo com Sucesso!</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Salvar Alterações</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowClearModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition flex items-center justify-center space-x-2"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Resetar Todos os Dados do App</span>
          </button>
        </div>
      </form>

      {/* Clear Data Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearModal}
        title="Resetar Todos os Dados"
        message="Tem certeza que deseja apagar permanentemente todo o histórico de corridas, despesas, empréstimos e metas? Esta ação não poderá ser desfeita."
        confirmText="Sim, Apagar Tudo"
        cancelText="Cancelar"
        onConfirm={() => {
          clearAllData();
          setShowClearModal(false);
        }}
        onClose={() => setShowClearModal(false)}
      />
    </div>
  );
}
