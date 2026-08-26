import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { todayISO, tomorrowISO, dateInputToISO, formatDateDisplay } from '../utils/format';
import { CopilotRideOffer, CopilotConfig, DEFAULT_COPILOT_CONFIG } from '../utils/copilotEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PlatformName = 'Uber' | '99' | 'InDrive' | 'Rappi' | 'Outro';
export type ExpenseCategory =
  | 'Combustível'
  | 'Manutenção'
  | 'Alimentação'
  | 'Pedágio'
  | 'Limpeza'
  | 'Seguro'
  | 'Outros';
export type Period = 'hoje' | 'semanal' | 'mensal' | 'personalizado';

export interface Ride {
  id: string;
  date: string; // YYYY-MM-DD
  platform: PlatformName;
  grossValue: number; // Valor realmente recebido
  offeredValue?: number; // Valor ofertado ao motorista pela plataforma
  passengerValue?: number; // Valor pago pelo passageiro à plataforma
  distance: number; // km
  duration: number; // minutes
  observations?: string;
  photo?: string;
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  value: number;
  description: string;
}

export interface Goal {
  monthlyGross: number;
  weeklyGross: number;
  dailyGross: number;
  meiTaxRate: number; // percentage, e.g. 6 = 6%
  workingDaysPerMonth: number; // e.g. 22
  workingDaysPerWeek: number;  // e.g. 5
}

// ─── Savings Goals (Moob-style) ───────────────────────────────────────────────

export type GoalFrequency = 'daily' | 'weekly' | 'monthly';
export type GoalDurationUnit = 'days' | 'weeks' | 'months';
export type GoalCategory = 'saving' | 'loan';
export type GoalType = 'individual' | 'shared';
export type GoalDeadlineType = 'duration' | 'dates';

export interface GoalPayment {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  payerId?: 'P1' | 'P2';
  method?: 'pix' | 'dinheiro' | 'recibo';
  installmentInfo?: string;
  timeStr?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  totalAmount: number;
  frequency: GoalFrequency;
  frequencyP2?: GoalFrequency;
  durationValue: number;
  durationUnit: GoalDurationUnit;
  deadlineType?: GoalDeadlineType;
  excludeSundays: boolean;
  startDate: string;
  targetDate?: string;
  payments: GoalPayment[];
  createdAt: string;
  category?: GoalCategory;
  goalType?: GoalType;
  interestRate?: number;
  applyLateFees?: boolean;
  contributionP1?: number;
  nameP1?: string;
  nameP2?: string;
  phoneP1?: string;
  phoneP2?: string;
  pixKeyP1?: string;
  pixKeyP2?: string;
  pixTypeP1?: 'celular' | 'cpf' | 'cnpj' | 'email' | 'aleatoria';
  pixTypeP2?: 'celular' | 'cpf' | 'cnpj' | 'email' | 'aleatoria';
}

const _parseLocalDate = (iso?: string | null): Date => {
  if (!iso || typeof iso !== 'string') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const parts = iso.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }
  d.setHours(0, 0, 0, 0);
  return d;
};
const _fmtLocal = (d?: Date | null): string => {
  if (!d || isNaN(d.getTime())) return todayISO();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function durationToDays(value: number, unit: GoalDurationUnit): number {
  switch (unit) {
    case 'days':   return value;
    case 'weeks':  return value * 7;
    case 'months': return value * 30;
    default: return value || 30;
  }
}

export function countPeriods(
  start: Date,
  end: Date,
  frequency: GoalFrequency,
  excludeSundays: boolean,
): number {
  if (!start || isNaN(start.getTime()) || !end || isNaN(end.getTime()) || start >= end) return 1;

  if (frequency === 'daily') {
    let count = 0;
    const cur = new Date(start);
    // 1st charge is always tomorrow (start + 1 day)
    cur.setDate(cur.getDate() + 1);
    let guard = 0;
    while (cur <= end && guard < 5000) {
      guard++;
      if (!excludeSundays || cur.getDay() !== 0) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return Math.max(1, count);
  }
  if (frequency === 'weekly') {
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    const weeks = Math.floor(diffDays / 7);
    return Math.max(1, weeks || 1);
  }
  // monthly: first payment is 1 month after start
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months--;
  return Math.max(1, months || 1);
}

function getNextDueDate(
  start: Date,
  frequency: GoalFrequency,
  excludeSundays: boolean,
): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cursor = start && !isNaN(start.getTime()) ? new Date(start) : new Date(today);
  cursor.setHours(0, 0, 0, 0);

  if (frequency === 'daily') {
    const next = new Date(today);
    next.setDate(next.getDate() + 1);
    let guard = 0;
    while (excludeSundays && next.getDay() === 0 && guard < 10) {
      guard++;
      next.setDate(next.getDate() + 1);
    }
    return next;
  }
  if (frequency === 'weekly') {
    const next = new Date(cursor);
    next.setDate(next.getDate() + 7);
    let guard = 0;
    while (next <= today && guard < 1000) {
      guard++;
      next.setDate(next.getDate() + 7);
    }
    return next;
  }
  // monthly: 1 month after start, advancing until future
  const next = new Date(cursor);
  next.setMonth(next.getMonth() + 1);
  let guard = 0;
  while (next <= today && guard < 1000) {
    guard++;
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export interface LoanDueDateInfo {
  installmentNumber: number;
  dueDateStr: string;
  amount: number;
  isPaid: boolean;
  status: 'pago' | 'futuro' | 'atrasado';
}

export function generateLoanDueDates(goal: SavingsGoal): LoanDueDateInfo[] {
  if (!goal) return [];
  const totalInstallments = Math.max(1, goal.durationValue || 1);
  const rawInstallmentAmount = (goal.totalAmount || 0) / totalInstallments;
  const installmentAmount = Math.round(rawInstallmentAmount * 100) / 100;

  const totalSaved = (goal.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const paidCount = Math.min(totalInstallments, Math.floor((totalSaved + 0.01) / (installmentAmount || 1)));

  const todayStr = todayISO();
  const startISO = goal.startDate || todayISO();
  const start = _parseLocalDate(startISO);
  let current = new Date(start);

  // First installment is due on the next period:
  if (goal.frequency === 'daily') {
    current.setDate(current.getDate() + 1);
  } else if (goal.frequency === 'weekly') {
    current.setDate(current.getDate() + 7);
  } else if (goal.frequency === 'monthly') {
    current.setMonth(current.getMonth() + 1);
  } else {
    current.setDate(current.getDate() + 1);
  }

  const dueDates: LoanDueDateInfo[] = [];
  let safetyLoopCounter = 0;
  const maxIterations = Math.max(1000, totalInstallments * 15);

  while (dueDates.length < totalInstallments && safetyLoopCounter < maxIterations) {
    safetyLoopCounter++;
    const isSunday = current.getDay() === 0;

    if (!(goal.excludeSundays && isSunday)) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dueDateStr = `${year}-${month}-${day}`;

      const installmentIndex = dueDates.length;
      const isPaid = installmentIndex < paidCount;

      let status: 'pago' | 'futuro' | 'atrasado';
      if (isPaid) {
        status = 'pago';
      } else if (dueDateStr < todayStr) {
        status = 'atrasado';
      } else {
        status = 'futuro';
      }

      dueDates.push({
        installmentNumber: installmentIndex + 1,
        dueDateStr,
        amount: installmentAmount,
        isPaid,
        status,
      });
    }

    if (goal.frequency === 'daily') {
      current.setDate(current.getDate() + 1);
    } else if (goal.frequency === 'weekly') {
      current.setDate(current.getDate() + 7);
    } else if (goal.frequency === 'monthly') {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
  }

  return dueDates;
}

export function generateSavingsGoalDueDates(goal: SavingsGoal): LoanDueDateInfo[] {
  if (!goal) return [];
  const totalAmount = goal.totalAmount || 0;
  const {
    frequency = 'daily',
    excludeSundays = false,
    durationValue,
    durationUnit,
    startDate,
    targetDate,
    deadlineType = 'dates',
  } = goal;

  const startISO = startDate || todayISO();
  const start = _parseLocalDate(startISO);
  let end: Date;
  if (deadlineType === 'dates' && targetDate) {
    end = _parseLocalDate(targetDate);
    if (end < start) end = new Date(start);
  } else {
    const calDays = durationToDays(durationValue || 30, durationUnit || 'days');
    end = new Date(start);
    end.setDate(start.getDate() + Math.max(1, calDays));
  }

  const totalPeriods =
    deadlineType === 'duration' && durationValue
      ? durationValue
      : countPeriods(start, end, frequency, excludeSundays);

  const safePeriods = Math.max(1, totalPeriods || 1);
  const installmentAmount = Math.round((totalAmount / safePeriods) * 100) / 100;

  const totalSaved = (goal.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const paidCount = Math.min(safePeriods, Math.floor((totalSaved + 0.01) / (installmentAmount || 1)));

  const todayStr = todayISO();
  const dueDates: LoanDueDateInfo[] = [];
  let safetyLoopCounter = 0;
  const maxIterations = Math.max(1000, safePeriods * 15);

  let current = new Date(start);
  // 1st payment is always due on next period:
  if (frequency === 'daily') {
    current.setDate(current.getDate() + 1);
  } else if (frequency === 'weekly') {
    current.setDate(current.getDate() + 7);
  } else if (frequency === 'monthly') {
    current.setMonth(current.getMonth() + 1);
  } else {
    current.setDate(current.getDate() + 1);
  }

  while (dueDates.length < safePeriods && safetyLoopCounter < maxIterations) {
    safetyLoopCounter++;
    const isSunday = current.getDay() === 0;

    if (!(excludeSundays && isSunday)) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dueDateStr = `${year}-${month}-${day}`;

      const installmentIndex = dueDates.length;
      const isPaid = installmentIndex < paidCount;

      let status: 'pago' | 'futuro' | 'atrasado';
      if (isPaid) {
        status = 'pago';
      } else if (dueDateStr < todayStr) {
        status = 'atrasado';
      } else {
        status = 'futuro';
      }

      dueDates.push({
        installmentNumber: installmentIndex + 1,
        dueDateStr,
        amount: installmentAmount,
        isPaid,
        status,
      });
    }

    if (frequency === 'daily') {
      current.setDate(current.getDate() + 1);
    } else if (frequency === 'weekly') {
      current.setDate(current.getDate() + 7);
    } else if (frequency === 'monthly') {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
  }

  return dueDates;
}

export interface GoalSchedule {
  totalPeriods: number;
  installmentAmount: number;
  endDate: string;
  saved: number;
  paidPeriods: number;
  progressPercent: number;
  nextDueDate: string;
  isLate: boolean;
  daysToNext: number;
  status: 'completed' | 'late' | 'active' | 'upcoming';
  statusLabel: string;
  dailyEquivalent: number;
  weeklyEquivalent: number;
  monthlyEquivalent: number;
  expectedSaved: number;
  delayAmount: number;
  delayPeriods: number;
  totalWorkingDays: number;
  totalCalendarDays: number;
  nextDueFormatted: string;
}

export function computeGoalSchedule(goal?: SavingsGoal | null): GoalSchedule {
  if (!goal) {
    return {
      totalPeriods: 1,
      installmentAmount: 0,
      endDate: todayISO(),
      saved: 0,
      paidPeriods: 0,
      progressPercent: 0,
      nextDueDate: todayISO(),
      isLate: false,
      daysToNext: 0,
      status: 'active',
      statusLabel: 'Em dia',
      dailyEquivalent: 0,
      weeklyEquivalent: 0,
      monthlyEquivalent: 0,
      expectedSaved: 0,
      delayAmount: 0,
      delayPeriods: 0,
      totalWorkingDays: 1,
      totalCalendarDays: 1,
      nextDueFormatted: 'Em dia',
    };
  }

  const totalAmount = goal.totalAmount || 0;
  const saved = (goal.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
  const progressPercent = totalAmount > 0 ? Math.min(100, Math.max(0, (saved / totalAmount) * 100)) : 0;
  const isCompleted = totalAmount > 0 && saved >= totalAmount;

  const todayStr = todayISO();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDates =
    goal.category === 'loan'
      ? generateLoanDueDates(goal)
      : generateSavingsGoalDueDates(goal);

  const totalPeriods = dueDates.length || 1;
  const installmentAmount = dueDates.length > 0 ? dueDates[0].amount : totalAmount;
  const paidPeriods = dueDates.filter((d) => d.isPaid).length;

  const nextUnpaid = dueDates.find((d) => !d.isPaid);
  const nextDueDateStr = nextUnpaid
    ? nextUnpaid.dueDateStr
    : dueDates[dueDates.length - 1]?.dueDateStr || todayStr;

  const nextDue = _parseLocalDate(nextDueDateStr);
  const diffMs = nextDue.getTime() - today.getTime();
  const daysToNext = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const overdueCount = dueDates.filter((d) => !d.isPaid && d.dueDateStr < todayStr).length;
  const isLate = !isCompleted && overdueCount > 0;

  const start = _parseLocalDate(goal.startDate || todayStr);
  const isUpcoming = today < start && overdueCount === 0;

  let status: GoalSchedule['status'] = 'active';
  let statusLabel = 'Em dia';

  if (isCompleted) {
    status = 'completed';
    statusLabel = goal.category === 'loan' ? 'Quitado' : 'Meta Atingida!';
  } else if (isLate) {
    status = 'late';
    statusLabel = overdueCount === 1 ? '1 parcela em atraso' : `${overdueCount} parcelas em atraso`;
  } else if (isUpcoming) {
    status = 'upcoming';
    statusLabel = 'A iniciar';
  } else {
    status = 'active';
    statusLabel = 'Em dia';
  }

  let nextDueFormatted = '';
  if (isCompleted) {
    nextDueFormatted = 'Concluído';
  } else if (daysToNext === 0) {
    nextDueFormatted = 'Vence hoje!';
  } else if (daysToNext === 1) {
    nextDueFormatted = 'Vence amanhã';
  } else if (daysToNext > 1) {
    nextDueFormatted = `Faltam ${daysToNext} dias (${formatDateDisplay(nextDueDateStr)})`;
  } else {
    nextDueFormatted = `Atrasado há ${Math.abs(daysToNext)} dias`;
  }

  const lastDueDateStr = dueDates[dueDates.length - 1]?.dueDateStr || todayStr;

  // Working / Active days vs Calendar days
  const calDays = Math.max(1, totalPeriods * (goal.frequency === 'weekly' ? 7 : goal.frequency === 'monthly' ? 30 : 1));
  const dailyEquivalent = totalAmount / calDays;
  const weeklyEquivalent = dailyEquivalent * 7;
  const monthlyEquivalent = dailyEquivalent * 30.416;

  return {
    totalPeriods,
    installmentAmount,
    endDate: lastDueDateStr,
    saved,
    paidPeriods,
    progressPercent,
    nextDueDate: nextDueDateStr,
    isLate,
    daysToNext,
    status,
    statusLabel,
    dailyEquivalent: Math.round(dailyEquivalent * 100) / 100,
    weeklyEquivalent: Math.round(weeklyEquivalent * 100) / 100,
    monthlyEquivalent: Math.round(monthlyEquivalent * 100) / 100,
    expectedSaved: Math.min(totalAmount, paidPeriods * installmentAmount),
    delayAmount: overdueCount * installmentAmount,
    delayPeriods: overdueCount,
    totalWorkingDays: calDays,
    totalCalendarDays: calDays,
    nextDueFormatted,
  };
}

export interface Profile {
  name: string;
  vehicleType: string;
  activePlatforms: PlatformName[];
  vehicleModel?: string;
  vehiclePlate?: string;
  fuelType?: string;
  phone?: string;
  email?: string;
  pixKey?: string;
  pixType?: 'celular' | 'cpf' | 'cnpj' | 'email' | 'aleatoria';
}

export interface PlatformStats {
  count: number;
  gross: number;
  net: number;
  distance: number;
  duration: number;
  revenuePerHour: number;
  revenuePerKm: number;
  offeredTotal: number;
  passengerTotal: number;
  appFee: number;
  appFeeBalance: number; // Positivo = Ganhando (plataforma pagou a mais / bônus), Negativo = Devendo (taxa cobrada da corrida)
}

export interface TrendPoint {
  label: string;
  date: string;
  gross: number;
  net: number;
}

export const PLATFORM_COMMISSION: Record<PlatformName, number> = {
  Uber: 0.25,
  '99': 0.2,
  InDrive: 0.2,
  Rappi: 0.3,
  Outro: 0.2,
};

export const PLATFORM_COLORS: Record<PlatformName, string> = {
  Uber: '#18181B',
  '99': '#EAB308',
  InDrive: '#10B981',
  Rappi: '#EF4444',
  Outro: '#6B7280',
};

export const PLATFORM_TEXT_COLORS: Record<PlatformName, string> = {
  Uber: '#FFFFFF',
  '99': '#18181B',
  InDrive: '#FFFFFF',
  Rappi: '#FFFFFF',
  Outro: '#FFFFFF',
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Combustível',
  'Manutenção',
  'Alimentação',
  'Pedágio',
  'Limpeza',
  'Seguro',
  'Outros',
];

export const PLATFORMS: PlatformName[] = [
  'Uber',
  '99',
  'InDrive',
  'Rappi',
  'Outro',
];

interface FinanceContextType {
  rides: Ride[];
  expenses: Expense[];
  goal: Goal;
  savingsGoals: SavingsGoal[];
  profile: Profile;
  period: Period;
  customDateRange: { start: string; end: string };
  isLoading: boolean;
  onboardingCompleted: boolean;

  addRide: (ride: Omit<Ride, 'id'>) => void;
  updateRide: (id: string, data: Partial<Omit<Ride, 'id'>>) => void;
  deleteRide: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, data: Partial<Omit<Expense, 'id'>>) => void;
  deleteExpense: (id: string) => void;
  setGoal: (goal: Goal) => void;
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'payments'>) => void;
  updateSavingsGoal: (id: string, data: Partial<Omit<SavingsGoal, 'id' | 'createdAt' | 'payments'>>) => void;
  deleteSavingsGoal: (id: string) => void;
  addGoalPayment: (
    goalId: string,
    amount: number,
    method?: 'pix' | 'dinheiro' | 'recibo',
    installmentInfo?: string,
    date?: string
  ) => void;
  addGoalPaymentForPayer: (goalId: string, amount: number, payerId: 'P1' | 'P2') => void;
  removeGoalPayment: (goalId: string, paymentId: string) => void;
  setProfile: (profile: Profile) => void;
  setPeriod: (period: Period, dateRange?: { start: string; end: string }) => void;
  clearAllData: () => Promise<void>;
  setOnboardingCompleted: () => void;

  filteredRides: Ride[];
  filteredExpenses: Expense[];
  totalGross: number;
  totalNet: number;
  totalExpenses: number;
  totalCommissions: number;
  totalDistance: number;
  totalDuration: number;
  totalRides: number;
  totalAppFeeBalance: number;
  ridesByPlatform: Record<PlatformName, PlatformStats>;
  expensesByCategory: Record<ExpenseCategory, number>;
  daysWorked: number;
  monthGross: number;
  monthlyGoalProgress: number;
  remainingToGoal: number;
  suggestedDailyGoal: number;
  workingDaysLeft: number;
  periodLabel: string;
  dateRange: { start: string; end: string };

  meiTax: number;
  totalAfterMeiTax: number;

  weeklyGross: number;
  weeklyGoalProgress: number;
  weeklyRemainingToGoal: number;
  todayGross: number;
  todayGoalProgress: number;
  todayRemainingToGoal: number;

  previousPeriodGross: number;
  previousPeriodNet: number;
  grossChangePercent: number | null;
  netChangePercent: number | null;

  trendData: TrendPoint[];

  isOnline: boolean;
  isSyncing: boolean;
  syncStatus: 'idle' | 'synced' | 'offline' | 'error';
  performSync: () => Promise<void>;

  // Copiloto Integrado Uber & 99
  copilotConfig: CopilotConfig;
  updateCopilotConfig: (cfg: Partial<CopilotConfig>) => void;
  copilotHistory: CopilotRideOffer[];
  addCopilotOffer: (offer: CopilotRideOffer) => void;
  clearCopilotHistory: () => void;
  activeCopilotRide: CopilotRideOffer | null;
  setActiveCopilotRide: (offer: CopilotRideOffer | null) => void;
}

const SK = {
  RIDES: '@agcfinance/rides',
  EXPENSES: '@agcfinance/expenses',
  GOAL: '@agcfinance/goal',
  SAVINGS_GOALS: '@agcfinance/savings_goals',
  PROFILE: '@agcfinance/profile',
  ONBOARDING: '@agcfinance/onboarding',
  COPILOT_CONFIG: '@agcfinance/copilot_config',
  COPILOT_HISTORY: '@agcfinance/copilot_history',
} as const;

const DEFAULT_GOAL: Goal = {
  monthlyGross: 5000,
  weeklyGross: 1250,
  dailyGross: 200,
  meiTaxRate: 6,
  workingDaysPerMonth: 22,
  workingDaysPerWeek: 5,
};
const DEFAULT_PROFILE: Profile = {
  name: 'Motorista',
  vehicleType: 'Carro',
  activePlatforms: ['Uber', '99'],
  vehicleModel: '',
  vehiclePlate: '',
  fuelType: 'Flex',
  phone: '',
  email: '',
  pixKey: '',
  pixType: 'celular',
};

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getWeekRange = (): { start: string; end: string } => {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: fmt(monday), end: fmt(sunday) };
};

const getMonthRange = (): { start: string; end: string } => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${year}-${String(month).padStart(2, '0')}-01`,
    end: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
};

const getDaysInRange = (start: string, end: string): string[] => {
  const days: string[] = [];
  if (!start || !end) return [todayISO()];
  let cur = _parseLocalDate(start);
  let endDate = _parseLocalDate(end);
  if (isNaN(cur.getTime()) || isNaN(endDate.getTime())) return [todayISO()];
  if (cur > endDate) {
    const temp = cur;
    cur = endDate;
    endDate = temp;
  }
  let count = 0;
  while (cur <= endDate && count < 366) {
    days.push(fmt(cur));
    cur.setDate(cur.getDate() + 1);
    count++;
  }
  return days.length > 0 ? days : [todayISO()];
};

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const generateId = (): string => Date.now().toString() + Math.random().toString(36).substring(2, 7);

const DEFAULT_CONTEXT_VALUE: FinanceContextType = {
  rides: [],
  expenses: [],
  goal: DEFAULT_GOAL,
  savingsGoals: [],
  profile: DEFAULT_PROFILE,
  period: 'mensal',
  customDateRange: { start: todayISO(), end: todayISO() },
  isLoading: false,
  onboardingCompleted: true,
  addRide: () => {},
  updateRide: () => {},
  deleteRide: () => {},
  addExpense: () => {},
  updateExpense: () => {},
  deleteExpense: () => {},
  setGoal: () => {},
  addSavingsGoal: () => {},
  updateSavingsGoal: () => {},
  deleteSavingsGoal: () => {},
  addGoalPayment: () => {},
  addGoalPaymentForPayer: () => {},
  removeGoalPayment: () => {},
  setProfile: () => {},
  setPeriod: () => {},
  clearAllData: async () => {},
  setOnboardingCompleted: () => {},
  filteredRides: [],
  filteredExpenses: [],
  totalGross: 0,
  totalNet: 0,
  totalExpenses: 0,
  totalCommissions: 0,
  totalDistance: 0,
  totalDuration: 0,
  totalRides: 0,
  totalAppFeeBalance: 0,
  ridesByPlatform: {
    Uber: { count: 0, gross: 0, net: 0, distance: 0, duration: 0, revenuePerHour: 0, revenuePerKm: 0, offeredTotal: 0, passengerTotal: 0, appFee: 0, appFeeBalance: 0 },
    '99': { count: 0, gross: 0, net: 0, distance: 0, duration: 0, revenuePerHour: 0, revenuePerKm: 0, offeredTotal: 0, passengerTotal: 0, appFee: 0, appFeeBalance: 0 },
    InDrive: { count: 0, gross: 0, net: 0, distance: 0, duration: 0, revenuePerHour: 0, revenuePerKm: 0, offeredTotal: 0, passengerTotal: 0, appFee: 0, appFeeBalance: 0 },
    Rappi: { count: 0, gross: 0, net: 0, distance: 0, duration: 0, revenuePerHour: 0, revenuePerKm: 0, offeredTotal: 0, passengerTotal: 0, appFee: 0, appFeeBalance: 0 },
    Outro: { count: 0, gross: 0, net: 0, distance: 0, duration: 0, revenuePerHour: 0, revenuePerKm: 0, offeredTotal: 0, passengerTotal: 0, appFee: 0, appFeeBalance: 0 },
  },
  expensesByCategory: {
    Combustível: 0,
    Manutenção: 0,
    Alimentação: 0,
    Pedágio: 0,
    Limpeza: 0,
    Seguro: 0,
    Outros: 0,
  },
  daysWorked: 0,
  monthGross: 0,
  monthlyGoalProgress: 0,
  remainingToGoal: 0,
  suggestedDailyGoal: 0,
  workingDaysLeft: 1,
  periodLabel: 'Este Mês',
  dateRange: { start: todayISO(), end: todayISO() },
  meiTax: 0,
  totalAfterMeiTax: 0,
  weeklyGross: 0,
  weeklyGoalProgress: 0,
  weeklyRemainingToGoal: 0,
  todayGross: 0,
  todayGoalProgress: 0,
  todayRemainingToGoal: 0,
  previousPeriodGross: 0,
  previousPeriodNet: 0,
  grossChangePercent: null,
  netChangePercent: null,
  trendData: [],
  isOnline: true,
  isSyncing: false,
  syncStatus: 'idle',
  performSync: async () => {},

  // Copiloto
  copilotConfig: DEFAULT_COPILOT_CONFIG,
  updateCopilotConfig: () => {},
  copilotHistory: [],
  addCopilotOffer: () => {},
  clearCopilotHistory: () => {},
  activeCopilotRide: null,
  setActiveCopilotRide: () => {},
};

const FinanceContext = createContext<FinanceContextType>(DEFAULT_CONTEXT_VALUE);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [copilotConfig, setCopilotConfigState] = useState<CopilotConfig>(() => {
    try {
      const saved = localStorage.getItem(SK.COPILOT_CONFIG);
      return saved ? { ...DEFAULT_COPILOT_CONFIG, ...JSON.parse(saved) } : DEFAULT_COPILOT_CONFIG;
    } catch {
      return DEFAULT_COPILOT_CONFIG;
    }
  });

  const [copilotHistory, setCopilotHistoryState] = useState<CopilotRideOffer[]>(() => {
    try {
      const saved = localStorage.getItem(SK.COPILOT_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeCopilotRide, setActiveCopilotRide] = useState<CopilotRideOffer | null>(null);

  const updateCopilotConfig = useCallback((newCfg: Partial<CopilotConfig>) => {
    setCopilotConfigState((prev) => {
      const updated = { ...prev, ...newCfg };
      try {
        localStorage.setItem(SK.COPILOT_CONFIG, JSON.stringify(updated));
      } catch (err) {
        console.warn('Error saving copilot config', err);
      }
      return updated;
    });
  }, []);

  const addCopilotOffer = useCallback((offer: CopilotRideOffer) => {
    setCopilotHistoryState((prev) => {
      const updated = [offer, ...prev.filter((o) => o.id !== offer.id)].slice(0, 100);
      try {
        localStorage.setItem(SK.COPILOT_HISTORY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Error saving copilot history', err);
      }
      return updated;
    });
  }, []);

  const clearCopilotHistory = useCallback(() => {
    setCopilotHistoryState([]);
    try {
      localStorage.removeItem(SK.COPILOT_HISTORY);
    } catch (err) {
      console.warn('Error clearing copilot history', err);
    }
  }, []);
  const [rides, setRides] = useState<Ride[]>(() => {
    try {
      const saved = localStorage.getItem(SK.RIDES);
      return saved ? JSON.parse(saved) : [
        { id: '1', date: todayISO(), platform: 'Uber', grossValue: 180.5, distance: 85, duration: 240, observations: 'Turno da manhã' },
        { id: '2', date: todayISO(), platform: '99', grossValue: 120.0, distance: 55, duration: 180, observations: 'Turno da tarde' },
      ];
    } catch {
      return [];
    }
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem(SK.EXPENSES);
      return saved ? JSON.parse(saved) : [
        { id: '1', date: todayISO(), category: 'Combustível', value: 95.0, description: 'Gasolina Comum' },
        { id: '2', date: todayISO(), category: 'Alimentação', value: 25.0, description: 'Almoço no posto' },
      ];
    } catch {
      return [];
    }
  });

  const [goal, setGoalState] = useState<Goal>(() => {
    try {
      const saved = localStorage.getItem(SK.GOAL);
      if (!saved) return DEFAULT_GOAL;
      const parsed = JSON.parse(saved);
      return parsed && typeof parsed === 'object' ? parsed : DEFAULT_GOAL;
    } catch {
      return DEFAULT_GOAL;
    }
  });

  const [savingsGoals, setSavingsGoalsState] = useState<SavingsGoal[]>(() => {
    try {
      const saved = localStorage.getItem(SK.SAVINGS_GOALS);
      return saved ? JSON.parse(saved) : [
        {
          id: 'loan1',
          name: 'Empréstimo com Sebastião (Indivíduo)',
          totalAmount: 1500,
          frequency: 'daily',
          durationValue: 30,
          durationUnit: 'days',
          excludeSundays: true,
          startDate: tomorrowISO(),
          payments: [{ id: 'lp1', amount: 350, date: todayISO() }],
          createdAt: todayISO(),
          category: 'loan',
          goalType: 'individual',
          nameP1: 'Sebastião',
        },
        {
          id: 'sg1',
          name: 'Reserva de Emergência',
          totalAmount: 2000,
          frequency: 'daily',
          durationValue: 30,
          durationUnit: 'days',
          excludeSundays: true,
          startDate: todayISO(),
          payments: [{ id: 'p1', amount: 300, date: todayISO(), payerId: 'P1' }],
          createdAt: todayISO(),
          category: 'saving',
          goalType: 'individual',
        }
      ];
    } catch {
      return [];
    }
  });

  const [profile, setProfileState] = useState<Profile>(() => {
    try {
      const saved = localStorage.getItem(SK.PROFILE);
      if (!saved) return DEFAULT_PROFILE;
      const parsed = JSON.parse(saved);
      return parsed && typeof parsed === 'object' ? parsed : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  const [period, setPeriodState] = useState<Period>('mensal');
  const [customDateRange, setCustomDateRange] = useState({
    start: todayISO(),
    end: todayISO(),
  });
  const [isLoading] = useState(false);
  const [onboardingCompleted, setOnboardingCompletedState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SK.ONBOARDING);
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'synced' | 'offline' | 'error'>('idle');
  const isClearingRef = useRef(false);

  const performSync = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.onLine || isClearingRef.current) {
      setSyncStatus('offline');
      return;
    }
    try {
      setIsSyncing(true);
      const localRides = JSON.parse(localStorage.getItem(SK.RIDES) || '[]');
      const localExpenses = JSON.parse(localStorage.getItem(SK.EXPENSES) || '[]');
      const localSavings = JSON.parse(localStorage.getItem(SK.SAVINGS_GOALS) || '[]');
      const localProfile = JSON.parse(localStorage.getItem(SK.PROFILE) || 'null');
      const localGoal = JSON.parse(localStorage.getItem(SK.GOAL) || 'null');

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rides: localRides,
          expenses: localExpenses,
          savingsGoals: localSavings,
          profile: localProfile,
          goal: localGoal,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data && !isClearingRef.current) {
          if (Array.isArray(json.data.rides)) {
            setRides((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(json.data.rides)) {
                localStorage.setItem(SK.RIDES, JSON.stringify(json.data.rides));
                return json.data.rides;
              }
              return prev;
            });
          }
          if (Array.isArray(json.data.expenses)) {
            setExpenses((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(json.data.expenses)) {
                localStorage.setItem(SK.EXPENSES, JSON.stringify(json.data.expenses));
                return json.data.expenses;
              }
              return prev;
            });
          }
          if (Array.isArray(json.data.savingsGoals)) {
            setSavingsGoalsState((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(json.data.savingsGoals)) {
                localStorage.setItem(SK.SAVINGS_GOALS, JSON.stringify(json.data.savingsGoals));
                return json.data.savingsGoals;
              }
              return prev;
            });
          }
          if (json.data.profile) {
            setProfileState((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(json.data.profile)) {
                localStorage.setItem(SK.PROFILE, JSON.stringify(json.data.profile));
                return json.data.profile;
              }
              return prev;
            });
          }
          if (json.data.goal) {
            setGoalState((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(json.data.goal)) {
                localStorage.setItem(SK.GOAL, JSON.stringify(json.data.goal));
                return json.data.goal;
              }
              return prev;
            });
          }
          setIsOnline(true);
          setSyncStatus('synced');
        }
      } else {
        setSyncStatus('offline');
      }
    } catch (err) {
      console.warn('[Sync] API ou MongoDB offline/indisponível - operando em modo offline:', err);
      setSyncStatus('offline');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const clearAllData = useCallback(async () => {
    isClearingRef.current = true;

    // Clear local storage completely FIRST
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SK.RIDES);
      localStorage.removeItem(SK.EXPENSES);
      localStorage.removeItem(SK.SAVINGS_GOALS);
      localStorage.removeItem(SK.GOAL);
      localStorage.removeItem(SK.PROFILE);
      localStorage.removeItem(SK.ONBOARDING);
    }

    // Clear react state
    setRides([]);
    setExpenses([]);
    setSavingsGoalsState([]);
    setProfileState(DEFAULT_PROFILE);
    setGoalState(DEFAULT_GOAL);

    try {
      if (typeof window !== 'undefined' && navigator.onLine) {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isReset: true }),
        });
      }
    } catch (err) {
      console.warn('Erro ao limpar banco de dados remoto:', err);
    } finally {
      setTimeout(() => {
        isClearingRef.current = false;
      }, 2500);
    }

    setSyncStatus('synced');
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      performSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync
    performSync();

    // Periodic auto-sync every 30 seconds if online to sync new entries seamlessly
    const interval = setInterval(() => {
      if (navigator.onLine) {
        performSync();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [performSync]);

  useEffect(() => {
    localStorage.setItem(SK.RIDES, JSON.stringify(rides));
  }, [rides]);


  useEffect(() => {
    localStorage.setItem(SK.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(SK.GOAL, JSON.stringify(goal));
  }, [goal]);

  useEffect(() => {
    localStorage.setItem(SK.SAVINGS_GOALS, JSON.stringify(savingsGoals));
  }, [savingsGoals]);

  useEffect(() => {
    localStorage.setItem(SK.PROFILE, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(SK.ONBOARDING, JSON.stringify(onboardingCompleted));
  }, [onboardingCompleted]);

  const addRide = useCallback((ride: Omit<Ride, 'id'>) => {
    const isoDate = dateInputToISO(ride.date);
    const newRide = { ...ride, date: isoDate, id: generateId() };
    setRides((prev) => {
      const updated = [newRide, ...prev].sort((a, b) => b.date.localeCompare(a.date));
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SK.RIDES, JSON.stringify(updated));
      }
      return updated;
    });
    if (typeof window !== 'undefined' && navigator.onLine) {
      fetch('/api/corridas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRide),
      }).catch(() => {});
    }
  }, []);

  const updateRide = useCallback((id: string, data: Partial<Omit<Ride, 'id'>>) => {
    setRides((prev) => {
      const updated = prev.map((r) => {
        if (r.id !== id) return r;
        const updatedDate = data.date ? dateInputToISO(data.date) : r.date;
        return { ...r, ...data, date: updatedDate };
      });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SK.RIDES, JSON.stringify(updated));
      }
      const targetRide = updated.find((r) => r.id === id);
      if (targetRide && typeof window !== 'undefined' && navigator.onLine) {
        fetch(`/api/corridas/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(targetRide),
        }).catch(() => {});
      }
      return updated;
    });
  }, []);

  const deleteRide = useCallback((id: string) => {
    setRides((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SK.RIDES, JSON.stringify(updated));
      }
      return updated;
    });
    if (typeof window !== 'undefined' && navigator.onLine) {
      fetch(`/api/corridas/${id}`, { method: 'DELETE' }).catch(() => {});
    }
  }, []);

  const addExpense = useCallback((expense: Omit<Expense, 'id'>) => {
    const isoDate = dateInputToISO(expense.date);
    const newExpense = { ...expense, date: isoDate, id: generateId() };
    setExpenses((prev) => {
      const updated = [newExpense, ...prev].sort((a, b) => b.date.localeCompare(a.date));
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SK.EXPENSES, JSON.stringify(updated));
      }
      return updated;
    });
    if (typeof window !== 'undefined' && navigator.onLine) {
      fetch('/api/despesas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense),
      }).catch(() => {});
    }
  }, []);

  const updateExpense = useCallback((id: string, data: Partial<Omit<Expense, 'id'>>) => {
    setExpenses((prev) => {
      const updated = prev.map((e) => {
        if (e.id !== id) return e;
        const updatedDate = data.date ? dateInputToISO(data.date) : e.date;
        return { ...e, ...data, date: updatedDate };
      });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SK.EXPENSES, JSON.stringify(updated));
      }
      const targetExpense = updated.find((e) => e.id === id);
      if (targetExpense && typeof window !== 'undefined' && navigator.onLine) {
        fetch(`/api/despesas/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(targetExpense),
        }).catch(() => {});
      }
      return updated;
    });
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SK.EXPENSES, JSON.stringify(updated));
      }
      return updated;
    });
    if (typeof window !== 'undefined' && navigator.onLine) {
      fetch(`/api/despesas/${id}`, { method: 'DELETE' }).catch(() => {});
    }
  }, []);

  const safeGoal = goal || DEFAULT_GOAL;
  const safeProfile = profile || DEFAULT_PROFILE;

  const setGoal = useCallback((g: Goal) => {
    setGoalState(g || DEFAULT_GOAL);
  }, []);

  const addSavingsGoal = useCallback((data: Omit<SavingsGoal, 'id' | 'createdAt' | 'payments'>) => {
    const newGoal: SavingsGoal = {
      ...data,
      id: generateId(),
      payments: [],
      createdAt: todayISO(),
    };
    setSavingsGoalsState((prev) => {
      const updated = [newGoal, ...prev];
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SK.SAVINGS_GOALS, JSON.stringify(updated));
      }
      return updated;
    });
    if (typeof window !== 'undefined' && navigator.onLine) {
      const endpoint = newGoal.category === 'loan' ? '/api/emprestimos' : '/api/metas';
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGoal),
      }).catch((err) => console.warn('[SavingsGoal API Error]', err));
    }
  }, []);

  const updateSavingsGoal = useCallback((id: string, data: Partial<Omit<SavingsGoal, 'id' | 'createdAt' | 'payments'>>) => {
    setSavingsGoalsState((prev) => {
      const updated = prev.map((g) => (g.id === id ? { ...g, ...data } : g));
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SK.SAVINGS_GOALS, JSON.stringify(updated));
      }
      const targetGoal = updated.find((g) => g.id === id);
      if (targetGoal && typeof window !== 'undefined' && navigator.onLine) {
        const endpoint = targetGoal.category === 'loan' ? `/api/emprestimos/${id}` : `/api/metas/${id}`;
        fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(targetGoal),
        }).catch((err) => console.warn('[SavingsGoal API Error]', err));
      }
      return updated;
    });
  }, []);

  const deleteSavingsGoal = useCallback((id: string) => {
    setSavingsGoalsState((prev) => {
      const updated = prev.filter((g) => g.id !== id);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SK.SAVINGS_GOALS, JSON.stringify(updated));
      }
      return updated;
    });
    if (typeof window !== 'undefined' && navigator.onLine) {
      fetch(`/api/metas/${id}`, { method: 'DELETE' }).catch(() => {});
      fetch(`/api/emprestimos/${id}`, { method: 'DELETE' }).catch(() => {});
    }
  }, []);

  const addGoalPayment = useCallback(
    (
      goalId: string,
      amount: number,
      method: 'pix' | 'dinheiro' | 'recibo' = 'pix',
      installmentInfo?: string,
      date?: string
    ) => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');

      const payment: GoalPayment = {
        id: generateId(),
        amount,
        date: date || todayISO(),
        payerId: 'P1',
        method,
        installmentInfo,
        timeStr: `${hours}:${mins}`,
      };
      setSavingsGoalsState((prev) => {
        const updated = prev.map((g) => (g.id === goalId ? { ...g, payments: [payment, ...(g.payments || [])] } : g));
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(SK.SAVINGS_GOALS, JSON.stringify(updated));
        }
        const targetGoal = updated.find((g) => g.id === goalId);
        if (targetGoal && typeof window !== 'undefined' && navigator.onLine) {
          const endpoint = targetGoal.category === 'loan' ? `/api/emprestimos/${goalId}` : `/api/metas/${goalId}`;
          fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(targetGoal),
          }).catch(() => {});
        }
        return updated;
      });
    },
    []
  );

  const addGoalPaymentForPayer = useCallback((goalId: string, amount: number, payerId: 'P1' | 'P2') => {
    const payment: GoalPayment = {
      id: generateId(),
      amount,
      date: todayISO(),
      payerId,
    };
    setSavingsGoalsState((prev) => {
      const updated = prev.map((g) => (g.id === goalId ? { ...g, payments: [payment, ...(g.payments || [])] } : g));
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SK.SAVINGS_GOALS, JSON.stringify(updated));
      }
      const targetGoal = updated.find((g) => g.id === goalId);
      if (targetGoal && typeof window !== 'undefined' && navigator.onLine) {
        const endpoint = targetGoal.category === 'loan' ? `/api/emprestimos/${goalId}` : `/api/metas/${goalId}`;
        fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(targetGoal),
        }).catch(() => {});
      }
      return updated;
    });
  }, []);

  const removeGoalPayment = useCallback((goalId: string, paymentId: string) => {
    setSavingsGoalsState((prev) => {
      const updated = prev.map((g) => (g.id === goalId ? { ...g, payments: (g.payments || []).filter((p) => p.id !== paymentId) } : g));
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SK.SAVINGS_GOALS, JSON.stringify(updated));
      }
      const targetGoal = updated.find((g) => g.id === goalId);
      if (targetGoal && typeof window !== 'undefined' && navigator.onLine) {
        const endpoint = targetGoal.category === 'loan' ? `/api/emprestimos/${goalId}` : `/api/metas/${goalId}`;
        fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(targetGoal),
        }).catch(() => {});
      }
      return updated;
    });
  }, []);

  const setProfile = useCallback((p: Profile) => {
    const newProfile = p || DEFAULT_PROFILE;
    setProfileState(newProfile);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SK.PROFILE, JSON.stringify(newProfile));
    }
    if (typeof window !== 'undefined' && navigator.onLine) {
      fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile),
      }).catch((err) => console.warn('[Profile API Error]', err));
    }
  }, []);

  const setPeriod = useCallback((p: Period, dr?: { start: string; end: string }) => {
    setPeriodState(p);
    if (dr) setCustomDateRange(dr);
  }, []);

  const setOnboardingCompleted = useCallback(() => {
    setOnboardingCompletedState(true);
  }, []);



  const dateRange = useMemo(() => {
    switch (period) {
      case 'hoje':
        return { start: todayISO(), end: todayISO() };
      case 'semanal':
        return getWeekRange();
      case 'mensal':
        return getMonthRange();
      case 'personalizado':
      case 'custom' as any:
        return customDateRange || { start: todayISO(), end: todayISO() };
      default:
        return customDateRange || { start: todayISO(), end: todayISO() };
    }
  }, [period, customDateRange]);

  const filteredRides = useMemo(
    () =>
      rides.filter((r) => {
        const d = dateInputToISO(r.date);
        return d >= dateRange.start && d <= dateRange.end;
      }),
    [rides, dateRange]
  );

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((e) => {
        const d = dateInputToISO(e.date);
        return d >= dateRange.start && d <= dateRange.end;
      }),
    [expenses, dateRange]
  );

  const { totalGross, totalCommissions } = useMemo(() => {
    let grossAcc = 0;
    let commAcc = 0;
    filteredRides.forEach((r) => {
      // Contabilidade do motorista é baseada no valor bruto do motorista (grossValue / offeredValue)
      const rideGross = r.grossValue > 0 ? r.grossValue : (r.offeredValue || 0);
      const passenger = r.passengerValue !== undefined && r.passengerValue > 0 ? r.passengerValue : undefined;
      let fee = 0;
      if (passenger !== undefined && passenger > rideGross) {
        fee = passenger - rideGross;
      } else {
        fee = rideGross * (PLATFORM_COMMISSION[r.platform] || 0.2);
      }
      grossAcc += rideGross;
      commAcc += fee;
    });
    return { totalGross: grossAcc, totalCommissions: commAcc };
  }, [filteredRides]);

  const totalExpenses = useMemo(() => filteredExpenses.reduce((s, e) => s + e.value, 0), [filteredExpenses]);

  // Receita Líquida Real do Motorista (Faturamento Bruto - Despesas Operacionais)
  const totalNet = useMemo(() => totalGross - totalExpenses, [totalGross, totalExpenses]);

  const totalDistance = useMemo(() => filteredRides.reduce((s, r) => s + r.distance, 0), [filteredRides]);

  const totalDuration = useMemo(() => filteredRides.reduce((s, r) => s + r.duration, 0), [filteredRides]);

  const totalRides = filteredRides.length;

  const ridesByPlatform = useMemo(() => {
    const result = {} as Record<PlatformName, PlatformStats>;
    PLATFORMS.forEach(
      (p) =>
        (result[p] = {
          count: 0,
          gross: 0,
          net: 0,
          distance: 0,
          duration: 0,
          revenuePerHour: 0,
          revenuePerKm: 0,
          offeredTotal: 0,
          passengerTotal: 0,
          appFee: 0,
          appFeeBalance: 0,
        })
    );
    filteredRides.forEach((r) => {
      if (!result[r.platform]) return;
      const rideGross = r.grossValue > 0 ? r.grossValue : (r.offeredValue || 0);
      const offered = r.offeredValue !== undefined ? r.offeredValue : rideGross;
      const passenger = r.passengerValue !== undefined ? r.passengerValue : undefined;

      result[r.platform].count++;
      result[r.platform].gross += rideGross;
      result[r.platform].offeredTotal += offered;

      if (passenger !== undefined) {
        result[r.platform].passengerTotal += passenger;
        const fee = Math.max(0, passenger - rideGross);
        const balance = rideGross - passenger;
        result[r.platform].appFee += fee;
        result[r.platform].appFeeBalance += balance;
      } else {
        const stdFee = rideGross * (PLATFORM_COMMISSION[r.platform] || 0.2);
        result[r.platform].appFee += stdFee;
        result[r.platform].appFeeBalance += -stdFee;
      }

      result[r.platform].net += rideGross;
      result[r.platform].distance += r.distance;
      result[r.platform].duration += r.duration;
    });
    PLATFORMS.forEach((p) => {
      const s = result[p];
      s.revenuePerHour = s.duration > 0 ? (s.net / s.duration) * 60 : 0;
      s.revenuePerKm = s.distance > 0 ? s.net / s.distance : 0;
    });
    return result;
  }, [filteredRides]);

  const totalAppFeeBalance = useMemo(
    () => Object.values(ridesByPlatform).reduce((s, p) => s + p.appFeeBalance, 0),
    [ridesByPlatform]
  );

  const expensesByCategory = useMemo(() => {
    const result = {} as Record<ExpenseCategory, number>;
    EXPENSE_CATEGORIES.forEach((c) => (result[c] = 0));
    filteredExpenses.forEach((e) => {
      if (result[e.category] !== undefined) result[e.category] += e.value;
    });
    return result;
  }, [filteredExpenses]);

  const daysWorked = useMemo(() => new Set(filteredRides.map((r) => r.date)).size, [filteredRides]);

  const monthRange = useMemo(() => getMonthRange(), []);

  const monthGross = useMemo(() => {
    return rides
      .filter((r) => {
        const d = dateInputToISO(r.date);
        return d >= monthRange.start && d <= monthRange.end;
      })
      .reduce((acc, r) => acc + (r.grossValue > 0 ? r.grossValue : (r.offeredValue || 0)), 0);
  }, [rides, monthRange]);

  const monthlyGoalProgress = useMemo(
    () => (safeGoal.monthlyGross > 0 ? Math.min(100, (monthGross / safeGoal.monthlyGross) * 100) : 0),
    [monthGross, safeGoal.monthlyGross]
  );

  const remainingToGoal = useMemo(() => Math.max(0, safeGoal.monthlyGross - monthGross), [safeGoal.monthlyGross, monthGross]);

  const workingDaysLeft = useMemo(() => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return Math.max(1, endOfMonth.getDate() - now.getDate());
  }, []);

  const suggestedDailyGoal = useMemo(() => remainingToGoal / workingDaysLeft, [remainingToGoal, workingDaysLeft]);

  const meiTax = useMemo(() => Math.max(0, totalNet) * (safeGoal.meiTaxRate / 100), [totalNet, safeGoal.meiTaxRate]);

  const totalAfterMeiTax = useMemo(() => totalNet - meiTax, [totalNet, meiTax]);

  const weeklyRange = useMemo(() => getWeekRange(), []);

  const weeklyGross = useMemo(
    () =>
      rides
        .filter((r) => {
          const d = dateInputToISO(r.date);
          return d >= weeklyRange.start && d <= weeklyRange.end;
        })
        .reduce((acc, r) => acc + (r.grossValue > 0 ? r.grossValue : (r.offeredValue || 0)), 0),
    [rides, weeklyRange]
  );

  const weeklyGoalProgress = useMemo(
    () => (safeGoal.weeklyGross > 0 ? Math.min(100, (weeklyGross / safeGoal.weeklyGross) * 100) : 0),
    [weeklyGross, safeGoal.weeklyGross]
  );

  const weeklyRemainingToGoal = useMemo(() => Math.max(0, safeGoal.weeklyGross - weeklyGross), [safeGoal.weeklyGross, weeklyGross]);

  const todayGross = useMemo(
    () =>
      rides
        .filter((r) => dateInputToISO(r.date) === todayISO())
        .reduce((acc, r) => acc + (r.grossValue > 0 ? r.grossValue : (r.offeredValue || 0)), 0),
    [rides]
  );

  const todayGoalProgress = useMemo(
    () => (safeGoal.dailyGross > 0 ? Math.min(100, (todayGross / safeGoal.dailyGross) * 100) : 0),
    [todayGross, safeGoal.dailyGross]
  );

  const todayRemainingToGoal = useMemo(() => Math.max(0, safeGoal.dailyGross - todayGross), [safeGoal.dailyGross, todayGross]);

  const previousPeriodGross = 0;
  const previousPeriodNet = 0;
  const grossChangePercent = null;
  const netChangePercent = null;

  const trendData = useMemo((): TrendPoint[] => {
    const days = getDaysInRange(dateRange.start, dateRange.end);
    const dayMap = new Map<string, { gross: number; net: number }>(
      days.map((d) => [d, { gross: 0, net: 0 }])
    );
    filteredRides.forEach((r) => {
      const v = dayMap.get(r.date);
      if (v) {
        const rideGross = r.grossValue > 0 ? r.grossValue : (r.offeredValue || 0);
        v.gross += rideGross;
        v.net += rideGross;
      }
    });
    filteredExpenses.forEach((e) => {
      const v = dayMap.get(e.date);
      if (v) v.net -= e.value;
    });
    return days.map((date) => {
      const d = _parseLocalDate(date);
      const dayIdx = isNaN(d.getTime()) ? 0 : d.getDay();
      const label = days.length <= 7 ? (DAY_LABELS[dayIdx] || date) : `${date.slice(8)}/${date.slice(5, 7)}`;
      return { date, label, ...(dayMap.get(date) ?? { gross: 0, net: 0 }) };
    });
  }, [dateRange, filteredRides, filteredExpenses]);

  const periodLabel = useMemo(() => {
    switch (period) {
      case 'hoje': return 'Hoje';
      case 'semanal': return 'Esta Semana';
      case 'mensal': return 'Este Mês';
      case 'personalizado':
      case 'custom' as any:
        return customDateRange?.start && customDateRange?.end
          ? `${customDateRange.start.split('-').reverse().join('/')} até ${customDateRange.end.split('-').reverse().join('/')}`
          : 'Personalizado';
      default:
        return 'Personalizado';
    }
  }, [period, customDateRange]);

  const value: FinanceContextType = {
    rides,
    expenses,
    goal: safeGoal,
    savingsGoals,
    profile: safeProfile,
    period,
    customDateRange,
    isLoading,
    onboardingCompleted,
    addRide,
    updateRide,
    deleteRide,
    addExpense,
    updateExpense,
    deleteExpense,
    setGoal,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addGoalPayment,
    addGoalPaymentForPayer,
    removeGoalPayment,
    setProfile,
    setPeriod,
    clearAllData,
    setOnboardingCompleted,
    filteredRides,
    filteredExpenses,
    totalGross,
    totalNet,
    totalExpenses,
    totalCommissions,
    totalDistance,
    totalDuration,
    totalRides,
    totalAppFeeBalance,
    ridesByPlatform,
    expensesByCategory,
    daysWorked,
    monthGross,
    monthlyGoalProgress,
    remainingToGoal,
    suggestedDailyGoal,
    workingDaysLeft,
    periodLabel,
    dateRange,
    meiTax,
    totalAfterMeiTax,
    weeklyGross,
    weeklyGoalProgress,
    weeklyRemainingToGoal,
    todayGross,
    todayGoalProgress,
    todayRemainingToGoal,
    previousPeriodGross,
    previousPeriodNet,
    grossChangePercent,
    netChangePercent,
    trendData,
    isOnline,
    isSyncing,
    syncStatus,
    performSync,
    copilotConfig,
    updateCopilotConfig,
    copilotHistory,
    addCopilotOffer,
    clearCopilotHistory,
    activeCopilotRide,
    setActiveCopilotRide,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextType {
  const ctx = useContext(FinanceContext);
  return ctx ?? DEFAULT_CONTEXT_VALUE;
}
