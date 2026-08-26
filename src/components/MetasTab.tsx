import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  Plus,
  PiggyBank,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Calendar,
  X,
  DollarSign,
  User,
  ShieldCheck,
  Check,
  Edit2,
  History,
  ArrowRight,
  Sparkles,
  Info,
  CalendarDays,
  ListFilter,
} from 'lucide-react';
import {
  useFinance,
  SavingsGoal,
  GoalFrequency,
  GoalDurationUnit,
  GoalDeadlineType,
  computeGoalSchedule,
  countPeriods,
  durationToDays,
} from '../context/FinanceContext';
import { formatCurrency, formatDateDisplay, todayISO } from '../utils/format';
import { FormField } from './FormField';
import { ConfirmModal } from './ConfirmModal';
import { parseCurrency, parseInteger, parsePercentage, maskCurrency, maskInteger } from '../utils/masks';
import {
  validateGoalAmount,
  validatePercentage,
  validateWorkingDays,
  validateName,
} from '../utils/validation';

export function MetasTab() {
  const {
    goal,
    setGoal,
    savingsGoals,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addGoalPayment,
    removeGoalPayment,
  } = useFinance();

  // Operating Goal Form State
  const [monthlyGross, setMonthlyGross] = useState(
    goal?.monthlyGross ? maskCurrency(Math.round(goal.monthlyGross * 100).toString()) : ''
  );
  const [weeklyGross, setWeeklyGross] = useState(
    goal?.weeklyGross ? maskCurrency(Math.round(goal.weeklyGross * 100).toString()) : ''
  );
  const [dailyGross, setDailyGross] = useState(
    goal?.dailyGross ? maskCurrency(Math.round(goal.dailyGross * 100).toString()) : ''
  );
  const [meiTaxRate, setMeiTaxRate] = useState(
    goal?.meiTaxRate !== undefined ? goal.meiTaxRate.toString() : '6'
  );
  const [workingDaysPerMonth, setWorkingDaysPerMonth] = useState(
    goal?.workingDaysPerMonth !== undefined ? goal.workingDaysPerMonth.toString() : '22'
  );

  const [isGoalDirty, setIsGoalDirty] = useState(false);

  // Sync form state when goal changes in context
  useEffect(() => {
    if (goal && !isGoalDirty) {
      setMonthlyGross(
        goal.monthlyGross ? maskCurrency(Math.round(goal.monthlyGross * 100).toString()) : ''
      );
      setWeeklyGross(
        goal.weeklyGross ? maskCurrency(Math.round(goal.weeklyGross * 100).toString()) : ''
      );
      setDailyGross(
        goal.dailyGross ? maskCurrency(Math.round(goal.dailyGross * 100).toString()) : ''
      );
      setMeiTaxRate(goal.meiTaxRate !== undefined ? goal.meiTaxRate.toString() : '6');
      setWorkingDaysPerMonth(
        goal.workingDaysPerMonth !== undefined ? goal.workingDaysPerMonth.toString() : '22'
      );
    }
  }, [goal, isGoalDirty]);

  const [monthlyGrossError, setMonthlyGrossError] = useState<string | null>(null);
  const [meiTaxRateError, setMeiTaxRateError] = useState<string | null>(null);
  const [workingDaysError, setWorkingDaysError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleMonthlyChange = (val: string) => {
    setMonthlyGross(val);
    setIsGoalDirty(true);
    if (monthlyGrossError) setMonthlyGrossError(null);

    const mVal = parseCurrency(val);
    const daysVal = parseInteger(workingDaysPerMonth) || 22;
    if (mVal > 0) {
      const calcDaily = mVal / daysVal;
      const calcWeekly = calcDaily * 5;
      setDailyGross(maskCurrency(Math.round(calcDaily * 100).toString()));
      setWeeklyGross(maskCurrency(Math.round(calcWeekly * 100).toString()));
    }
  };

  const handleWorkingDaysChange = (val: string) => {
    setWorkingDaysPerMonth(val);
    setIsGoalDirty(true);
    if (workingDaysError) setWorkingDaysError(null);

    const daysVal = parseInteger(val) || 22;
    const mVal = parseCurrency(monthlyGross);
    if (mVal > 0 && daysVal > 0) {
      const calcDaily = mVal / daysVal;
      const calcWeekly = calcDaily * 5;
      setDailyGross(maskCurrency(Math.round(calcDaily * 100).toString()));
      setWeeklyGross(maskCurrency(Math.round(calcWeekly * 100).toString()));
    }
  };

  // Helper to get default target date (e.g. +30 days from today)
  const getDefaultTargetDate = (startDateStr: string, daysAhead = 30): string => {
    const [y, m, d] = (startDateStr || todayISO()).split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + daysAhead);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Helper to add days to ISO string
  const addDaysToISO = (baseISO: string, days: number): string => {
    const [y, m, d] = (baseISO || todayISO()).split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };

  // Helper to get end of current month
  const getEndOfMonthISO = (baseISO: string): string => {
    const [y, m] = (baseISO || todayISO()).split('-').map(Number);
    const dt = new Date(y, m, 0); // last day of month
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };

  // ─── NEW / EDIT SAVINGS GOAL MODAL STATE ─────────────────────────────────────
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalFreq, setGoalFreq] = useState<GoalFrequency>('daily');
  const [deadlineType, setDeadlineType] = useState<GoalDeadlineType>('dates');
  const [goalStartDate, setGoalStartDate] = useState(todayISO());
  const [goalTargetDate, setGoalTargetDate] = useState(getDefaultTargetDate(todayISO(), 30));
  const [goalDurationVal, setGoalDurationVal] = useState('30');
  const [goalDurationUnit, setGoalDurationUnit] = useState<GoalDurationUnit>('days');
  const [goalExcludeSundays, setGoalExcludeSundays] = useState(true);

  const [goalNameError, setGoalNameError] = useState<string | null>(null);
  const [goalAmountError, setGoalAmountError] = useState<string | null>(null);
  const [goalDateError, setGoalDateError] = useState<string | null>(null);

  // Deleting Goal State
  const [deletingGoal, setDeletingGoal] = useState<{ id: string; name: string } | null>(null);

  // Payment Deposit Modal State
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositAmountError, setDepositAmountError] = useState<string | null>(null);

  // Goal Details / Payments History Modal
  const [viewingHistoryGoal, setViewingHistoryGoal] = useState<SavingsGoal | null>(null);

  // Filter only savings / investment goals (excluding pure loans if separated)
  const metasOnly = useMemo(() => {
    return savingsGoals.filter((g) => g.category !== 'loan');
  }, [savingsGoals]);

  // Open modal for new goal
  const openNewGoalModal = () => {
    setEditingGoal(null);
    setGoalName('');
    setGoalAmount('');
    setGoalFreq('daily');
    setDeadlineType('dates');
    const start = todayISO();
    setGoalStartDate(start);
    setGoalTargetDate(getDefaultTargetDate(start, 30));
    setGoalDurationVal('30');
    setGoalDurationUnit('days');
    setGoalExcludeSundays(true);
    setGoalNameError(null);
    setGoalAmountError(null);
    setGoalDateError(null);
    setShowAddGoalModal(true);
  };

  // Open modal for editing existing goal
  const openEditGoalModal = (g: SavingsGoal) => {
    setEditingGoal(g);
    setGoalName(g.name || '');
    setGoalAmount(g.totalAmount ? maskCurrency(Math.round(g.totalAmount * 100).toString()) : '');
    setGoalFreq(g.frequency || 'daily');
    setDeadlineType(g.deadlineType || (g.targetDate ? 'dates' : 'dates'));
    const start = g.startDate || todayISO();
    setGoalStartDate(start);
    setGoalTargetDate(g.targetDate || getDefaultTargetDate(start, g.durationValue || 30));
    setGoalDurationVal(String(g.durationValue || 30));
    setGoalDurationUnit(g.durationUnit || 'days');
    setGoalExcludeSundays(g.excludeSundays !== undefined ? g.excludeSundays : true);
    setGoalNameError(null);
    setGoalAmountError(null);
    setGoalDateError(null);
    setShowAddGoalModal(true);
  };

  // Function to update frequency and adjust defaults
  const handleSelectFrequency = (freq: GoalFrequency) => {
    setGoalFreq(freq);
    if (!editingGoal) {
      if (freq === 'daily') {
        setGoalTargetDate(getDefaultTargetDate(goalStartDate, 30));
        setGoalDurationVal('30');
        setGoalDurationUnit('days');
      } else if (freq === 'weekly') {
        setGoalTargetDate(getDefaultTargetDate(goalStartDate, 28));
        setGoalDurationVal('4');
        setGoalDurationUnit('weeks');
      } else if (freq === 'monthly') {
        setGoalTargetDate(getDefaultTargetDate(goalStartDate, 180));
        setGoalDurationVal('6');
        setGoalDurationUnit('months');
      }
    }
  };

  // Dynamic simulation of the goal calculation inside modal
  const simulatedSchedule = useMemo(() => {
    const total = parseCurrency(goalAmount) || 0;
    const [sy, sm, sd] = (goalStartDate || todayISO()).split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);

    let end: Date;
    if (deadlineType === 'dates') {
      const [ey, em, ed] = (goalTargetDate || getDefaultTargetDate(goalStartDate, 30)).split('-').map(Number);
      end = new Date(ey, em - 1, ed);
    } else {
      const calDays = durationToDays(parseInteger(goalDurationVal) || 30, goalDurationUnit);
      end = new Date(start);
      end.setDate(start.getDate() + Math.max(1, calDays));
    }

    if (end < start) {
      end = new Date(start);
    }

    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));

    // Count sundays in range
    let sundaysCount = 0;
    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getDay() === 0) sundaysCount++;
      cur.setDate(cur.getDate() + 1);
    }

    const periodsCount =
      deadlineType === 'duration' && goalDurationVal
        ? parseInteger(goalDurationVal) || 1
        : countPeriods(start, end, goalFreq, goalExcludeSundays);
    const safePeriods = Math.max(1, periodsCount || 1);
    const perPeriodAmount = total > 0 ? Math.round((total / safePeriods) * 100) / 100 : 0;

    // First due date:
    const firstDue = new Date(start);
    if (goalFreq === 'daily') {
      firstDue.setDate(firstDue.getDate() + 1);
      while (goalExcludeSundays && firstDue.getDay() === 0) {
        firstDue.setDate(firstDue.getDate() + 1);
      }
    } else if (goalFreq === 'weekly') {
      firstDue.setDate(firstDue.getDate() + 7);
    } else if (goalFreq === 'monthly') {
      firstDue.setMonth(firstDue.getMonth() + 1);
    }
    const firstDueDateStr = `${firstDue.getFullYear()}-${String(firstDue.getMonth() + 1).padStart(2, '0')}-${String(firstDue.getDate()).padStart(2, '0')}`;

    let firstDueLabel = '';
    if (goalFreq === 'daily') {
      firstDueLabel = 'Amanhã';
    } else if (goalFreq === 'weekly') {
      firstDueLabel = 'Em 1 semana';
    } else {
      firstDueLabel = 'Em 1 mês';
    }

    // Working days vs Calendar days
    let workingDaysCount = 0;
    const curW = new Date(start);
    while (curW <= end) {
      if (!(goalExcludeSundays && curW.getDay() === 0)) workingDaysCount++;
      curW.setDate(curW.getDate() + 1);
    }
    workingDaysCount = Math.max(1, workingDaysCount);

    const dailyAmount = total > 0 ? Math.round((total / workingDaysCount) * 100) / 100 : 0;
    const weeklyAmount = Math.round(dailyAmount * (goalExcludeSundays ? 6 : 7) * 100) / 100;
    const monthsSpan = Math.max(1, totalDays / 30.416);
    const monthlyAmount = totalDays < 30 ? total : Math.round((total / monthsSpan) * 100) / 100;

    const endDateStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

    return {
      totalDays,
      workingDaysCount,
      sundaysCount,
      periodsCount: safePeriods,
      perPeriodAmount,
      firstDueDateStr,
      firstDueLabel,
      dailyAmount,
      weeklyAmount,
      monthlyAmount,
      endDateStr,
      isInvalidDate: goalTargetDate && goalTargetDate < goalStartDate,
    };
  }, [goalAmount, goalStartDate, goalTargetDate, goalFreq, deadlineType, goalDurationVal, goalDurationUnit, goalExcludeSundays]);

  const handleSaveOperationalGoals = (e: React.FormEvent) => {
    e.preventDefault();

    const mVal = parseCurrency(monthlyGross);
    const wVal = parseCurrency(weeklyGross);
    const dVal = parseCurrency(dailyGross);
    const taxVal = parsePercentage(meiTaxRate);
    const daysVal = parseInteger(workingDaysPerMonth) || 22;

    const mCheck = validateGoalAmount(mVal);
    const taxCheck = validatePercentage(taxVal);
    const daysCheck = validateWorkingDays(daysVal);

    setMonthlyGrossError(mCheck.errorMessage);
    setMeiTaxRateError(taxCheck.errorMessage);
    setWorkingDaysError(daysCheck.errorMessage);

    if (!mCheck.isValid || !taxCheck.isValid || !daysCheck.isValid) {
      return;
    }

    const calcDaily = dVal > 0 ? dVal : mVal / daysVal;
    const calcWeekly = wVal > 0 ? wVal : calcDaily * 5;

    setGoal({
      monthlyGross: mVal,
      weeklyGross: calcWeekly,
      dailyGross: calcDaily,
      meiTaxRate: taxVal,
      workingDaysPerMonth: daysVal,
      workingDaysPerWeek: 5,
    });

    setIsGoalDirty(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();

    const total = parseCurrency(goalAmount);
    const nameCheck = validateName(goalName);
    const totalCheck = validateGoalAmount(total);

    setGoalNameError(nameCheck.errorMessage);
    setGoalAmountError(totalCheck.errorMessage);

    if (!nameCheck.isValid || !totalCheck.isValid) {
      return;
    }

    if (deadlineType === 'dates' && goalTargetDate < goalStartDate) {
      setGoalDateError('A data final não pode ser anterior à data de início');
      return;
    }
    setGoalDateError(null);

    const calculatedTargetDate =
      deadlineType === 'dates'
        ? goalTargetDate
        : simulatedSchedule.endDateStr;

    const durVal =
      deadlineType === 'dates'
        ? simulatedSchedule.periodsCount
        : parseInteger(goalDurationVal) || 30;

    if (editingGoal) {
      // Update existing goal
      updateSavingsGoal(editingGoal.id, {
        name: goalName.trim(),
        totalAmount: total,
        frequency: goalFreq,
        startDate: goalStartDate,
        targetDate: calculatedTargetDate,
        deadlineType,
        durationValue: durVal,
        durationUnit: deadlineType === 'dates' ? 'days' : goalDurationUnit,
        excludeSundays: goalExcludeSundays,
      });
    } else {
      // Add new goal
      addSavingsGoal({
        name: goalName.trim(),
        totalAmount: total,
        frequency: goalFreq,
        startDate: goalStartDate,
        targetDate: calculatedTargetDate,
        deadlineType,
        durationValue: durVal,
        durationUnit: deadlineType === 'dates' ? 'days' : goalDurationUnit,
        excludeSundays: goalExcludeSundays,
        category: 'saving',
        goalType: 'individual',
      });
    }

    setShowAddGoalModal(false);
    setEditingGoal(null);
  };

  const handleMakeDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositGoalId) return;

    const amount = parseCurrency(depositAmount);
    const amountCheck = validateGoalAmount(amount);

    setDepositAmountError(amountCheck.errorMessage);
    if (!amountCheck.isValid) return;

    addGoalPayment(depositGoalId, amount, 'pix', 'Depósito Manual');
    setDepositAmount('');
    setDepositAmountError(null);
    setDepositGoalId(null);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Operating Targets Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Target className="w-5 h-5 text-emerald-600" />
            <span>Configurar Metas de Faturamento Operacional</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Defina suas metas brutas estimadas para acompanhar sua meta diária recomendada
          </p>
        </div>

        <form onSubmit={handleSaveOperationalGoals} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              label="Meta Mensal (R$)"
              required
              mask="currency"
              prefix="R$"
              value={monthlyGross}
              onChange={handleMonthlyChange}
              error={monthlyGrossError}
            />

            <FormField
              label="Meta Semanal (R$)"
              mask="currency"
              prefix="R$"
              value={weeklyGross}
              onChange={(val) => setWeeklyGross(val)}
              helperText="Calculada automaticamente ou personalizada"
            />

            <FormField
              label="Meta Diária (R$)"
              mask="currency"
              prefix="R$"
              value={dailyGross}
              onChange={(val) => setDailyGross(val)}
              helperText="Calculada com base nos dias úteis"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Alíquota Est. Imposto MEI (%)"
              mask="percentage"
              suffix="%"
              value={meiTaxRate}
              onChange={(val) => {
                setMeiTaxRate(val);
                setIsGoalDirty(true);
                if (meiTaxRateError) setMeiTaxRateError(null);
              }}
              error={meiTaxRateError}
            />

            <FormField
              label="Dias Úteis Trabalhados / Mês"
              mask="integer"
              suffix="dias"
              value={workingDaysPerMonth}
              onChange={handleWorkingDaysChange}
              error={workingDaysError}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSuccess ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1 animate-in fade-in">
                <Check className="w-4 h-4" />
                <span>Metas operacionais salvas com sucesso!</span>
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-xs cursor-pointer"
            >
              Atualizar Metas Operacionais
            </button>
          </div>
        </form>
      </div>

      {/* Savings & Investment Goals Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <PiggyBank className="w-5 h-5 text-emerald-600" />
              <span>Caixinhas de Economia & Metas Pessoais</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Escolha a data de início e término, defina se deseja contar domingos ou não e acompanhe os depósitos.
            </p>
          </div>

          <button
            onClick={openNewGoalModal}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Meta / Caixinha</span>
          </button>
        </div>

        {/* List of Savings Goals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metasOnly.length === 0 ? (
            <div className="col-span-full bg-white p-8 text-center rounded-2xl border border-slate-100 space-y-3">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <PiggyBank className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Nenhuma meta ou caixinha cadastrada</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Crie sua primeira meta escolhendo data inicial, data final e se deseja incluir ou excluir domingos.
                </p>
              </div>
              <button
                onClick={openNewGoalModal}
                className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Minha Primeira Meta</span>
              </button>
            </div>
          ) : (
            metasOnly.map((g, gIdx) => {
              const sched = computeGoalSchedule(g);
              const isFinished = sched.saved >= (g.totalAmount || 0);
              const remainingAmount = Math.max(0, (g.totalAmount || 0) - sched.saved);

              return (
                <div
                  key={g.id || `meta-card-${gIdx}`}
                  className={`bg-white p-5 rounded-2xl shadow-sm border space-y-4 flex flex-col justify-between transition ${
                    sched.isLate
                      ? 'border-rose-200 ring-1 ring-rose-100'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          {/* Frequency Badge */}
                          <span className="text-[10px] uppercase font-extrabold tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-100">
                            {g.frequency === 'daily'
                              ? 'Aporte Diário'
                              : g.frequency === 'weekly'
                              ? 'Aporte Semanal'
                              : 'Aporte Mensal'}
                          </span>

                          {/* Sundays Badge */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              g.excludeSundays
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {g.excludeSundays ? '🛑 Sem domingos' : '🟢 Com domingos'}
                          </span>

                          {/* Punctuality Status Badge */}
                          {isFinished ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>Meta Atingida!</span>
                            </span>
                          ) : sched.status === 'upcoming' ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-sky-600" />
                              <span>A iniciar</span>
                            </span>
                          ) : sched.isLate ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center space-x-1 animate-pulse">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              <span>Em atraso {sched.delayAmount > 0 ? `(-${formatCurrency(sched.delayAmount)})` : ''}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Em dia</span>
                            </span>
                          )}
                        </div>

                        <h3 className="font-extrabold text-slate-900 text-base">{g.name}</h3>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => openEditGoalModal(g)}
                          className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                          title="Editar Meta e Datas"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingGoal({ id: g.id, name: g.name })}
                          className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Date Range Badge */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Início: <strong>{formatDateDisplay(g.startDate || todayISO())}</strong>
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <div className="flex items-center space-x-1.5">
                        <span>
                          Término: <strong>{formatDateDisplay(sched.endDate)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">Progresso Acumulado</span>
                        <div className="text-right">
                          <strong className="text-slate-900 font-bold">
                            {formatCurrency(sched.saved)} / {formatCurrency(g.totalAmount)}
                          </strong>
                          <span className="text-slate-400 text-[11px] ml-1 font-semibold">
                            ({sched.progressPercent.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isFinished
                              ? 'bg-emerald-500'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          }`}
                          style={{ width: `${Math.min(100, sched.progressPercent)}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                        <span>
                          {sched.paidPeriods} de {sched.totalPeriods} depósitos concluídos
                        </span>
                        {!isFinished && (
                          <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                            Falta {formatCurrency(remainingAmount)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ─── VALORES DE PAGAMENTO: DIÁRIO, SEMANAL OU MENSAL ─── */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                        <span className="flex items-center space-x-1">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Divisão dos Valores a Guardar</span>
                        </span>
                        <span className="text-[10px] font-normal lowercase text-slate-400">
                          {sched.totalWorkingDays} dias ativos
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        {/* Diário */}
                        <div
                          className={`p-2 rounded-xl border text-xs transition ${
                            g.frequency === 'daily'
                              ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-200'
                              : 'bg-slate-50 border-slate-100'
                          }`}
                        >
                          <span className="text-[10px] font-bold text-slate-500 block">
                            Diariamente
                          </span>
                          <strong
                            className={`text-xs font-black block mt-0.5 ${
                              g.frequency === 'daily' ? 'text-emerald-800' : 'text-slate-800'
                            }`}
                          >
                            {formatCurrency(sched.dailyEquivalent)}
                          </strong>
                          <span className="text-[9px] text-slate-400 block font-medium">/ dia</span>
                        </div>

                        {/* Semanal */}
                        <div
                          className={`p-2 rounded-xl border text-xs transition ${
                            g.frequency === 'weekly'
                              ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-200'
                              : 'bg-slate-50 border-slate-100'
                          }`}
                        >
                          <span className="text-[10px] font-bold text-slate-500 block">
                            Semanalmente
                          </span>
                          <strong
                            className={`text-xs font-black block mt-0.5 ${
                              g.frequency === 'weekly' ? 'text-emerald-800' : 'text-slate-800'
                            }`}
                          >
                            {formatCurrency(sched.weeklyEquivalent)}
                          </strong>
                          <span className="text-[9px] text-slate-400 block font-medium">/ sem</span>
                        </div>

                        {/* Mensal */}
                        <div
                          className={`p-2 rounded-xl border text-xs transition ${
                            g.frequency === 'monthly'
                              ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-200'
                              : 'bg-slate-50 border-slate-100'
                          }`}
                        >
                          <span className="text-[10px] font-bold text-slate-500 block">
                            Mensalmente
                          </span>
                          <strong
                            className={`text-xs font-black block mt-0.5 ${
                              g.frequency === 'monthly' ? 'text-emerald-800' : 'text-slate-800'
                            }`}
                          >
                            {formatCurrency(sched.monthlyEquivalent)}
                          </strong>
                          <span className="text-[9px] text-slate-400 block font-medium">/ mês</span>
                        </div>
                      </div>
                    </div>

                    {/* ─── PRÓXIMO PAGAMENTO & CONTAGEM DE DIAS FALTANTES ─── */}
                    {!isFinished && (
                      <div
                        className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                          sched.isLate
                            ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                            : sched.daysToNext === 0
                            ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                            : 'bg-slate-50 border-slate-200/80 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5 font-bold text-[11px]">
                            <CalendarDays
                              className={`w-3.5 h-3.5 ${
                                sched.isLate
                                  ? 'text-rose-600'
                                  : sched.daysToNext === 0
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                              }`}
                            />
                            <span>Próximo Pagamento:</span>
                          </div>

                          <span className="font-extrabold text-xs">
                            {formatDateDisplay(sched.nextDueDate)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-0.5 border-t border-black/5">
                          <span className="text-[10px] font-medium opacity-80">
                            Status do Prazo:
                          </span>
                          <span
                            className={`font-black text-xs px-2 py-0.5 rounded-md ${
                              sched.isLate
                                ? 'bg-rose-100 text-rose-800'
                                : sched.daysToNext === 0
                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {sched.nextDueFormatted}
                          </span>
                        </div>

                        {sched.isLate && sched.delayAmount > 0 && (
                          <div className="text-[10px] font-semibold text-rose-700 bg-white/70 p-1.5 rounded-lg border border-rose-200/60 mt-1">
                            ⚠️ Atraso detectado: Deposite <strong>{formatCurrency(sched.delayAmount)}</strong> para regularizar e ficar em dia com o plano.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Payment Action & History */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setViewingHistoryGoal(g)}
                      className="text-xs text-slate-500 hover:text-emerald-700 font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5 text-slate-400" />
                      <span>{g.payments?.length || 0} depósitos</span>
                    </button>

                    <button
                      onClick={() => {
                        setDepositGoalId(g.id);
                        setDepositAmount(maskCurrency(Math.round(sched.installmentAmount * 100).toString()));
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs cursor-pointer flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Depositar</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── MODAL: CREATE OR EDIT SAVINGS GOAL ────────────────────────────── */}
      {showAddGoalModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg flex items-center space-x-2">
                <PiggyBank className="w-5 h-5 text-emerald-600" />
                <span>{editingGoal ? 'Editar Meta / Caixinha' : 'Nova Meta / Caixinha'}</span>
              </h3>
              <button
                onClick={() => setShowAddGoalModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <FormField
                label="Nome da Meta / Caixinha"
                required
                mask="name"
                value={goalName}
                onChange={(val) => {
                  setGoalName(val);
                  if (goalNameError) setGoalNameError(null);
                }}
                placeholder="Ex: IPVA 2027, Pneus Novos, Reserva de Emergência"
                error={goalNameError}
              />

              <FormField
                label="Valor Total Desejado (R$)"
                required
                mask="currency"
                prefix="R$"
                value={goalAmount}
                onChange={(val) => {
                  setGoalAmount(val);
                  if (goalAmountError) setGoalAmountError(null);
                }}
                placeholder="0,00"
                error={goalAmountError}
              />

              {/* Frequência do Aporte */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Frequência de Aporte
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'daily', label: 'Diário' },
                      { id: 'weekly', label: 'Semanal' },
                      { id: 'monthly', label: 'Mensal' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleSelectFrequency(f.id)}
                      className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        goalFreq === f.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modo de Escolha do Prazo */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Como deseja definir o prazo?
                  </label>
                  <div className="flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setDeadlineType('dates')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        deadlineType === 'dates'
                          ? 'bg-white text-emerald-700 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Por Datas
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeadlineType('duration')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        deadlineType === 'duration'
                          ? 'bg-white text-emerald-700 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Por Duração
                    </button>
                  </div>
                </div>

                {deadlineType === 'dates' ? (
                  <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Data de Início</span>
                        </label>
                        <input
                          type="date"
                          value={goalStartDate}
                          onChange={(e) => {
                            const newStart = e.target.value;
                            setGoalStartDate(newStart);
                            if (goalTargetDate < newStart) {
                              setGoalTargetDate(getDefaultTargetDate(newStart, 30));
                            }
                            if (goalDateError) setGoalDateError(null);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Data Final (Término)</span>
                        </label>
                        <input
                          type="date"
                          min={goalStartDate}
                          value={goalTargetDate}
                          onChange={(e) => {
                            setGoalTargetDate(e.target.value);
                            if (goalDateError) setGoalDateError(null);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Quick Date Range Shortcuts */}
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 text-[10px]">
                      <span className="text-slate-400 font-bold">Atalhos rápidos:</span>
                      <button
                        type="button"
                        onClick={() => setGoalTargetDate(addDaysToISO(goalStartDate, 15))}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 font-medium transition cursor-pointer"
                      >
                        +15 dias
                      </button>
                      <button
                        type="button"
                        onClick={() => setGoalTargetDate(addDaysToISO(goalStartDate, 30))}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 font-medium transition cursor-pointer"
                      >
                        +30 dias
                      </button>
                      <button
                        type="button"
                        onClick={() => setGoalTargetDate(addDaysToISO(goalStartDate, 60))}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 font-medium transition cursor-pointer"
                      >
                        +60 dias
                      </button>
                      <button
                        type="button"
                        onClick={() => setGoalTargetDate(addDaysToISO(goalStartDate, 90))}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 font-medium transition cursor-pointer"
                      >
                        +90 dias
                      </button>
                      <button
                        type="button"
                        onClick={() => setGoalTargetDate(getEndOfMonthISO(goalStartDate))}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 font-medium transition cursor-pointer"
                      >
                        Fim do Mês
                      </button>
                    </div>

                    {goalDateError && <p className="text-xs text-rose-500 font-medium">{goalDateError}</p>}
                  </div>
                ) : (
                  <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Data de Início
                        </label>
                        <input
                          type="date"
                          value={goalStartDate}
                          onChange={(e) => setGoalStartDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Quantidade
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={maskInteger(goalDurationVal)}
                            onChange={(e) => setGoalDurationVal(maskInteger(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Unidade
                          </label>
                          <select
                            value={goalDurationUnit}
                            onChange={(e) => setGoalDurationUnit(e.target.value as GoalDurationUnit)}
                            className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800"
                          >
                            <option value="days">Dias</option>
                            <option value="weeks">Semanas</option>
                            <option value="months">Meses</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ─── DOMINGOS TOGGLE OPTION (Contar domingos ou não) ────────── */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-extrabold text-slate-900 block">
                      Contagem de Domingos
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Defina se os domingos entram na meta de trabalho e depósito
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setGoalExcludeSundays(true)}
                    className={`p-3 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                      goalExcludeSundays
                        ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-extrabold text-slate-900">🛑 Não contar domingos</span>
                      {goalExcludeSundays && <Check className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Folga aos domingos. O valor é dividido apenas pelos dias de seg. a sábado.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGoalExcludeSundays(false)}
                    className={`p-3 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                      !goalExcludeSundays
                        ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-extrabold text-slate-900">🟢 Contar domingos</span>
                      {!goalExcludeSundays && <Check className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Trabalha todos os dias. O valor é dividido por todos os 7 dias da semana.
                    </p>
                  </button>
                </div>
              </div>

              {/* ─── LIVE SUMMARY SIMULATION BOX ────────────────────────────── */}
              <div className="bg-gradient-to-br from-emerald-950 to-slate-900 text-white p-4 rounded-2xl shadow-md space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-800/60 pb-2">
                  <div className="flex items-center space-x-1.5 text-xs font-extrabold text-emerald-400">
                    <Sparkles className="w-4 h-4" />
                    <span>Cálculo e Previsão da Meta</span>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-800/50 text-emerald-200 px-2 py-0.5 rounded-md">
                    {simulatedSchedule.totalDays} dias corridos
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Período</span>
                    <strong className="text-slate-100 text-[11px] block">
                      {formatDateDisplay(goalStartDate)} até {formatDateDisplay(simulatedSchedule.endDateStr)}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">1º Vencimento / Cobrança</span>
                    <strong className="text-amber-300 text-[11px] font-extrabold block">
                      {simulatedSchedule.firstDueLabel} ({formatDateDisplay(simulatedSchedule.firstDueDateStr)})
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      {goalFreq === 'daily' ? 'Dias de Aporte' : 'Total de Parcelas'}
                    </span>
                    <strong className="text-emerald-400 text-sm font-extrabold block">
                      {simulatedSchedule.periodsCount}{' '}
                      <span className="text-[10px] font-normal text-slate-300">
                        {goalExcludeSundays
                          ? `(${simulatedSchedule.sundaysCount} dom. excluídos)`
                          : `(com domingos)`}
                      </span>
                    </strong>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-400 block text-[10px]">
                      {goalFreq === 'daily'
                        ? 'Meta Diária Escolhida'
                        : goalFreq === 'weekly'
                        ? 'Meta Semanal Escolhida'
                        : 'Meta Mensal Escolhida'}
                    </span>
                    <strong className="text-emerald-300 text-sm font-black block">
                      {formatCurrency(simulatedSchedule.perPeriodAmount)}
                    </strong>
                  </div>
                </div>

                {/* 3 Frequency comparison preview */}
                <div className="pt-2 border-t border-emerald-800/50">
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block mb-1.5">
                    Equivalências por período ({simulatedSchedule.workingDaysCount} dias de trabalho):
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className={`p-1.5 rounded-lg border text-[11px] ${goalFreq === 'daily' ? 'bg-emerald-800/60 border-emerald-400' : 'bg-slate-800/40 border-emerald-900/60'}`}>
                      <span className="text-[9px] text-slate-400 block">Diário</span>
                      <strong className="text-emerald-200 block text-xs">{formatCurrency(simulatedSchedule.dailyAmount)}</strong>
                      <span className="text-[8px] text-slate-400">/ dia</span>
                    </div>

                    <div className={`p-1.5 rounded-lg border text-[11px] ${goalFreq === 'weekly' ? 'bg-emerald-800/60 border-emerald-400' : 'bg-slate-800/40 border-emerald-900/60'}`}>
                      <span className="text-[9px] text-slate-400 block">Semanal</span>
                      <strong className="text-emerald-200 block text-xs">{formatCurrency(simulatedSchedule.weeklyAmount)}</strong>
                      <span className="text-[8px] text-slate-400">/ sem</span>
                    </div>

                    <div className={`p-1.5 rounded-lg border text-[11px] ${goalFreq === 'monthly' ? 'bg-emerald-800/60 border-emerald-400' : 'bg-slate-800/40 border-emerald-900/60'}`}>
                      <span className="text-[9px] text-slate-400 block">Mensal</span>
                      <strong className="text-emerald-200 block text-xs">{formatCurrency(simulatedSchedule.monthlyAmount)}</strong>
                      <span className="text-[8px] text-slate-400">/ mês</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddGoalModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                >
                  {editingGoal ? 'Salvar Alterações' : 'Criar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: DEPOSIT PAYMENT ────────────────────────────────────────── */}
      {depositGoalId && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>Registrar Depósito na Caixinha</span>
              </h3>
              <button
                onClick={() => setDepositGoalId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMakeDeposit} className="space-y-4">
              <FormField
                label="Valor do Depósito (R$)"
                required
                mask="currency"
                prefix="R$"
                value={depositAmount}
                onChange={(val) => {
                  setDepositAmount(val);
                  if (depositAmountError) setDepositAmountError(null);
                }}
                error={depositAmountError}
              />

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDepositGoalId(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2 rounded-xl transition shadow-sm cursor-pointer"
                >
                  Confirmar Depósito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: VIEW DEPOSITS HISTORY ──────────────────────────────────── */}
      {viewingHistoryGoal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Histórico de Depósitos</h3>
                <p className="text-xs text-slate-500">{viewingHistoryGoal.name}</p>
              </div>
              <button
                onClick={() => setViewingHistoryGoal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {(!viewingHistoryGoal.payments || viewingHistoryGoal.payments.length === 0) ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Nenhum depósito realizado ainda para esta caixinha.
                </div>
              ) : (
                viewingHistoryGoal.payments.map((p, pIdx) => (
                  <div
                    key={p.id || `deposit-${p.date}-${p.amount}-${pIdx}`}
                    className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs"
                  >
                    <div>
                      <strong className="text-slate-900 block font-extrabold">{formatCurrency(p.amount)}</strong>
                      <span className="text-[10px] text-slate-500">
                        {formatDateDisplay(p.date)} {p.timeStr ? ` às ${p.timeStr}` : ''}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        removeGoalPayment(viewingHistoryGoal.id, p.id);
                        setViewingHistoryGoal((prev) =>
                          prev
                            ? {
                                ...prev,
                                payments: (prev.payments || []).filter((item) => item.id !== p.id),
                              }
                            : null
                        );
                      }}
                      className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                      title="Excluir depósito"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingHistoryGoal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Caixinha Modal */}
      <ConfirmModal
        isOpen={!!deletingGoal}
        title="Excluir Meta"
        message={
          deletingGoal
            ? `Tem certeza que deseja excluir a caixinha "${deletingGoal.name}"? Todo o histórico de depósitos desta caixinha será removido.`
            : ''
        }
        confirmText="Excluir Meta"
        variant="danger"
        onConfirm={() => {
          if (deletingGoal) {
            deleteSavingsGoal(deletingGoal.id);
            setDeletingGoal(null);
          }
        }}
        onClose={() => setDeletingGoal(null)}
      />
    </div>
  );
}
