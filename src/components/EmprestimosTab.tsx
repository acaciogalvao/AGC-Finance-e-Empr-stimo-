import React, { useState, useMemo, useEffect } from 'react';
import {
  Landmark,
  Plus,
  Pencil,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Trash2,
  X,
  DollarSign,
  User,
  QrCode,
  Copy,
  Check,
  Search,
  Receipt,
  MessageSquare,
  Phone,
  Key,
  ShieldCheck,
  Percent,
  FileText,
  Printer,
  ArrowDownCircle,
  AlertTriangle,
  LayoutDashboard,
  PieChart,
  Target,
  Car,
  Calendar,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  useFinance,
  SavingsGoal,
  GoalPayment,
  computeGoalSchedule,
  generateLoanDueDates,
  GoalFrequency,
  GoalDurationUnit,
} from '../context/FinanceContext';
import { formatCurrency, formatDateDisplay, todayISO, tomorrowISO } from '../utils/format';
import { ConfirmModal } from './ConfirmModal';
import {
  maskCurrency,
  maskInteger,
  parseCurrency,
  parseInteger,
  maskPhone,
  maskPixKey,
  maskPercentage,
} from '../utils/masks';
import { validateName, validateGoalAmount } from '../utils/validation';
import { generatePixPayload } from '../utils/pix';

type SubTab = 'inicio' | 'calendario' | 'historico' | 'painel';
type PaymentMethod = 'pix' | 'dinheiro' | 'recibo';
type PixType = 'celular' | 'cpf' | 'cnpj' | 'email' | 'aleatoria';

export function EmprestimosTab() {
  const {
    savingsGoals,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addGoalPayment,
    removeGoalPayment,
    totalGross,
    totalNet,
    totalExpenses,
    totalRides,
  } = useFinance();

  // Filter goals that are loans
  const loans = useMemo(() => {
    const list = savingsGoals.filter((g) => g.category === 'loan');
    if (list.length > 0) return list;
    return savingsGoals;
  }, [savingsGoals]);

  const [selectedLoanId, setSelectedLoanId] = useState<string>(() => {
    return loans.length > 0 ? loans[0].id : '';
  });

  const activeLoan = useMemo(() => {
    if (!selectedLoanId && loans.length > 0) return loans[0];
    return loans.find((l) => l.id === selectedLoanId) || loans[0] || null;
  }, [loans, selectedLoanId]);

  // Sub tab view
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('inicio');

  // Calendar Date State
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date());

  // Modal States
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [deletingLoan, setDeletingLoan] = useState<{ id: string; name: string } | null>(null);
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState<GoalPayment | null>(null);
  const [showConfirmDeletePayment, setShowConfirmDeletePayment] = useState(false);
  const [copiedTxId, setCopiedTxId] = useState(false);

  // Form States for New Loan
  const [loanType, setLoanType] = useState<'shared' | 'individual'>('shared');
  const [loanTitle, setLoanTitle] = useState('');
  const [rawTotalAmount, setRawTotalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('20');
  const [applySpecialRule, setApplySpecialRule] = useState(true);
  const [deadlineFormat, setDeadlineFormat] = useState<'duration' | 'dates'>('duration');
  const [timeQuantity, setTimeQuantity] = useState('12');
  const [timeUnit, setTimeUnit] = useState<GoalDurationUnit>('months');
  const [loanStartDate, setLoanStartDate] = useState<string>(() => todayISO());
  const [loanTargetDate, setLoanTargetDate] = useState<string>(() => {
    const [y, m, d] = todayISO().split('-').map(Number);
    return `${y + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  });
  const [excludeSundays, setExcludeSundays] = useState(false);
  const [divisionP1, setDivisionP1] = useState(50); // 50 = 50% / 50%

  // Holder 1 Data
  const [nameP1, setNameP1] = useState('Você');
  const [phoneP1, setPhoneP1] = useState('');
  const [pixTypeP1, setPixTypeP1] = useState<PixType>('celular');
  const [pixKeyP1, setPixKeyP1] = useState('');
  const [frequencyP1, setFrequencyP1] = useState<GoalFrequency>('monthly');

  // Holder 2 Data
  const [nameP2, setNameP2] = useState('Seu Amor');
  const [phoneP2, setPhoneP2] = useState('');
  const [pixTypeP2, setPixTypeP2] = useState<PixType>('celular');
  const [pixKeyP2, setPixKeyP2] = useState('');
  const [frequencyP2, setFrequencyP2] = useState<GoalFrequency>('monthly');

  const [loanTitleError, setLoanTitleError] = useState<string | null>(null);
  const [totalAmountError, setTotalAmountError] = useState<string | null>(null);

  // Form States for Payment Modal
  const [paymentParcelCount, setPaymentParcelCount] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [customPixKeyType, setCustomPixKeyType] = useState<PixType>('celular');
  const [customPixKey, setCustomPixKey] = useState('83999999999');
  const [pixCopied, setPixCopied] = useState(false);
  const [paymentAmountRaw, setPaymentAmountRaw] = useState<string>('');
  const [isCustomPaymentAmount, setIsCustomPaymentAmount] = useState<boolean>(false);

  // History Filter States
  const [historySearch, setHistorySearch] = useState('');
  const [historyMethodFilter, setHistoryMethodFilter] = useState<'todos' | 'pix' | 'dinheiro'>('todos');

  // Calculate periods from Datas Abertas
  const computedPeriodsFromDates = useMemo(() => {
    if (!loanStartDate || !loanTargetDate) return 12;
    const [sy, sm, sd] = loanStartDate.split('-').map(Number);
    const [ey, em, ed] = loanTargetDate.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);

    if (start >= end) return 1;

    if (frequencyP1 === 'monthly') {
      let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      if (end.getDate() < start.getDate()) months--;
      return Math.max(1, months);
    } else if (frequencyP1 === 'weekly') {
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
      return Math.max(1, Math.floor(diffDays / 7));
    } else {
      // daily: first payment is on day after loan start date (start + 1 day) up to end date inclusive
      let count = 0;
      const cur = new Date(start);
      cur.setDate(cur.getDate() + 1);
      while (cur <= end) {
        if (!excludeSundays || cur.getDay() !== 0) count++;
        cur.setDate(cur.getDate() + 1);
      }
      return Math.max(1, count);
    }
  }, [loanStartDate, loanTargetDate, frequencyP1, excludeSundays]);

  const activeSched = useMemo(() => {
    return activeLoan ? computeGoalSchedule(activeLoan) : null;
  }, [activeLoan]);

  const dueDates = useMemo(() => {
    return activeLoan ? generateLoanDueDates(activeLoan) : [];
  }, [activeLoan]);

  // Unpaid installments list (oldest overdue first)
  const unpaidInstallments = useMemo(() => {
    return dueDates.filter((d) => !d.isPaid);
  }, [dueDates]);

  // Overdue installments list
  const overdueInstallments = useMemo(() => {
    return dueDates.filter((d) => !d.isPaid && d.status === 'atrasado');
  }, [dueDates]);

  // Oldest overdue installment
  const oldestOverdueInstallment = useMemo(() => {
    return overdueInstallments.length > 0 ? overdueInstallments[0] : null;
  }, [overdueInstallments]);

  // Participants summary list for calendar cards
  const participants = useMemo(() => {
    if (!activeLoan || !activeSched) return [];
    if (activeLoan.goalType === 'shared') {
      return [
        {
          id: 'P1',
          name: activeLoan.nameP1 || activeLoan.name || 'Você',
          phone: activeLoan.phoneP1,
          paidPeriods: Math.ceil(activeSched.paidPeriods / 2),
        },
        {
          id: 'P2',
          name: activeLoan.nameP2 || 'Titular 2',
          phone: activeLoan.phoneP2,
          paidPeriods: Math.floor(activeSched.paidPeriods / 2),
        },
      ];
    }
    return [
      {
        id: 'P1',
        name: activeLoan.nameP1 || activeLoan.name || 'Você',
        phone: activeLoan.phoneP1,
        paidPeriods: activeSched.paidPeriods,
      },
    ];
  }, [activeLoan, activeSched]);

  // Single installment value
  const singleInstallmentValue = useMemo(() => {
    if (!activeSched || activeSched.totalPeriods === 0) return 30;
    return activeSched.installmentAmount;
  }, [activeSched]);

  // ─── PAINEL GERAL MEMOIZED DATA ─────────────────────────────────────────────
  const allLoans = useMemo(() => {
    return savingsGoals.filter((g) => g.category === 'loan');
  }, [savingsGoals]);

  const allMetas = useMemo(() => {
    return savingsGoals.filter((g) => g.category !== 'loan');
  }, [savingsGoals]);

  const loansSummary = useMemo(() => {
    let totalAmount = 0;
    let totalPaid = 0;
    allLoans.forEach((l) => {
      totalAmount += l.totalAmount || 0;
      const sched = computeGoalSchedule(l);
      totalPaid += sched.saved;
    });
    const remaining = Math.max(0, totalAmount - totalPaid);
    const percent = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;
    return { totalAmount, totalPaid, remaining, percent, count: allLoans.length };
  }, [allLoans]);

  const metasSummary = useMemo(() => {
    let totalAmount = 0;
    let totalSaved = 0;
    allMetas.forEach((m) => {
      totalAmount += m.totalAmount || 0;
      const sched = computeGoalSchedule(m);
      totalSaved += sched.saved;
    });
    const remaining = Math.max(0, totalAmount - totalSaved);
    const percent = totalAmount > 0 ? (totalSaved / totalAmount) * 100 : 0;
    return { totalAmount, totalSaved, remaining, percent, count: allMetas.length };
  }, [allMetas]);

  const totalPortfolio = useMemo(() => {
    return loansSummary.totalAmount + metasSummary.totalAmount;
  }, [loansSummary, metasSummary]);

  const donutData = useMemo(() => {
    const total = totalPortfolio > 0 ? totalPortfolio : 1;
    const loansFrac = (loansSummary.totalAmount / total) * 238.76;
    const metasFrac = (metasSummary.totalAmount / total) * 238.76;
    return { loansFrac, metasFrac, total };
  }, [totalPortfolio, loansSummary, metasSummary]);

  const upcomingInstallmentsList = useMemo(() => {
    const list: {
      loanId: string;
      loanName: string;
      payerName: string;
      installmentNumber: number;
      amount: number;
      dueDateStr: string;
      daysToNext: number;
      isOverdue: boolean;
      pixKeyP1?: string;
      pixTypeP1?: string;
      totalAmount: number;
      savedAmount: number;
      remainingAmount: number;
      unpaidParcelsCount: number;
    }[] = [];

    savingsGoals.forEach((goalItem) => {
      if (goalItem.category === 'loan') {
        const sched = computeGoalSchedule(goalItem);
        const dueDates = generateLoanDueDates(goalItem);
        const nextUnpaid = dueDates.find((d) => !d.isPaid);
        const unpaidParcels = dueDates.filter((d) => !d.isPaid);
        const totalAmount = goalItem.totalAmount || 0;
        const remainingAmount = Math.max(0, totalAmount - sched.saved);

        if (nextUnpaid) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const [y, m, d] = nextUnpaid.dueDateStr.split('-').map(Number);
          const due = new Date(y, m - 1, d);
          due.setHours(0, 0, 0, 0);

          const diffMs = due.getTime() - today.getTime();
          const daysToNext = Math.round(diffMs / (1000 * 60 * 60 * 24));

          list.push({
            loanId: goalItem.id,
            loanName: goalItem.name,
            payerName: goalItem.nameP1 || goalItem.name || 'Você',
            installmentNumber: nextUnpaid.installmentNumber,
            amount: nextUnpaid.amount,
            dueDateStr: nextUnpaid.dueDateStr,
            daysToNext,
            isOverdue: daysToNext < 0,
            pixKeyP1: goalItem.pixKeyP1,
            pixTypeP1: goalItem.pixTypeP1,
            totalAmount,
            savedAmount: sched.saved,
            remainingAmount,
            unpaidParcelsCount: unpaidParcels.length,
          });
        }
      }
    });

    return list.sort((a, b) => a.daysToNext - b.daysToNext);
  }, [savingsGoals]);

  // Remaining unpaid total
  const remainingTotal = useMemo(() => {
    if (!activeLoan || !activeSched) return 0;
    return Math.max(0, activeLoan.totalAmount - activeSched.saved);
  }, [activeLoan, activeSched]);

  // Calculated Payment total
  const calculatedPaymentTotal = useMemo(() => {
    if (!activeLoan) return 0;
    if (paymentParcelCount >= unpaidInstallments.length && unpaidInstallments.length > 0) {
      return remainingTotal;
    }
    return Math.min(remainingTotal, Math.round(singleInstallmentValue * paymentParcelCount * 100) / 100);
  }, [paymentParcelCount, singleInstallmentValue, remainingTotal, activeLoan, unpaidInstallments]);

  useEffect(() => {
    if (showPaymentModal && !isCustomPaymentAmount) {
      if (calculatedPaymentTotal > 0) {
        setPaymentAmountRaw(formatCurrency(calculatedPaymentTotal).replace('R$', '').trim());
      } else {
        setPaymentAmountRaw('');
      }
    }
  }, [calculatedPaymentTotal, showPaymentModal, isCustomPaymentAmount]);

  // Installment numbers string for the current payment e.g. "07-08-09-10-11/20" or "04/20"
  const selectedInstallmentRangeStr = useMemo(() => {
    if (!activeLoan || unpaidInstallments.length === 0) return '01/01';
    const totalInst = activeSched?.totalPeriods || activeLoan.durationValue || 30;
    const selectedList = unpaidInstallments.slice(0, paymentParcelCount);
    if (selectedList.length === 1) {
      const num = String(selectedList[0].installmentNumber).padStart(2, '0');
      return `${num}/${totalInst}`;
    }
    const numbers = selectedList.map((d) => String(d.installmentNumber).padStart(2, '0')).join('-');
    return `${numbers}/${totalInst}`;
  }, [activeLoan, unpaidInstallments, paymentParcelCount, activeSched]);

  // Calculate real time total to pay with interest in New Loan Form
  const calculatedLoanTotalWithInterest = useMemo(() => {
    const principal = parseCurrency(rawTotalAmount);
    if (principal <= 0) return 0;
    const rate = parseFloat(interestRate.replace(',', '.')) || 0;
    return principal * (1 + rate / 100);
  }, [rawTotalAmount, interestRate]);

  // Pix Payload generated dynamically and offline
  const pixPayload = useMemo(() => {
    const rawKey = customPixKey || activeLoan?.pixKeyP1 || '83999999999';
    const type = customPixKeyType || activeLoan?.pixTypeP1 || 'celular';
    return generatePixPayload({
      key: rawKey,
      keyType: type,
      name: activeLoan?.nameP1 || activeLoan?.name || 'RECEBEDOR',
      city: 'BRASILIA',
      amount: calculatedPaymentTotal,
      description: `PARCELA ${selectedInstallmentRangeStr}`,
    });
  }, [customPixKey, customPixKeyType, activeLoan, calculatedPaymentTotal, selectedInstallmentRangeStr]);

  // Handlers for Month Navigation in Calendar
  const prevMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthYearLabel = useMemo(() => {
    const mStr = calendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return mStr.charAt(0).toUpperCase() + mStr.slice(1);
  }, [calendarDate]);

  // Calendar Days Grid
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();

    const dueDatesMap = new Map(dueDates.map((d) => [d.dueDateStr, d]));

    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isInstallmentDue: boolean;
      status: 'pago' | 'futuro' | 'atrasado' | 'nenhum';
    }> = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, pDay);
      const dStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
      days.push({
        dayNumber: pDay,
        dateStr: dStr,
        isCurrentMonth: false,
        isToday: false,
        isInstallmentDue: false,
        status: 'nenhum',
      });
    }

    const todayStr = todayISO();

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;

      const dueInfo = dueDatesMap.get(dateStr);
      const isInstallmentDue = !!dueInfo;
      const status = dueInfo ? dueInfo.status : 'nenhum';

      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isToday,
        isInstallmentDue,
        status,
      });
    }

    return days;
  }, [calendarDate, dueDates]);

  const handleOpenCreateModal = () => {
    setEditingLoanId(null);
    setLoanType('shared');
    setLoanTitle('');
    setRawTotalAmount('');
    setInterestRate('20');
    setApplySpecialRule(true);
    setDeadlineFormat('duration');
    setTimeQuantity('12');
    setTimeUnit('months');
    setLoanStartDate(todayISO());
    setLoanTargetDate(() => {
      const [y, m, d] = todayISO().split('-').map(Number);
      return `${y + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    });
    setExcludeSundays(false);
    setDivisionP1(50);
    setNameP1('Você');
    setPhoneP1('');
    setPixTypeP1('celular');
    setPixKeyP1('');
    setFrequencyP1('monthly');
    setNameP2('Seu Amor');
    setPhoneP2('');
    setPixTypeP2('celular');
    setPixKeyP2('');
    setFrequencyP2('monthly');
    setLoanTitleError(null);
    setTotalAmountError(null);
    setShowAddLoanModal(true);
  };

  const handleOpenEditModal = (loan: SavingsGoal) => {
    setEditingLoanId(loan.id);
    setLoanType(loan.goalType === 'individual' ? 'individual' : 'shared');
    setLoanTitle(loan.name || '');
    setRawTotalAmount(loan.totalAmount ? formatCurrency(loan.totalAmount).replace('R$', '').trim() : '');
    setInterestRate(String(loan.interestRate ?? 20));
    setApplySpecialRule(loan.applyLateFees ?? true);
    setDeadlineFormat(loan.deadlineType || 'duration');
    setTimeQuantity(String(loan.durationValue || 12));
    setTimeUnit(loan.durationUnit || 'months');
    setLoanStartDate(loan.startDate || todayISO());
    setLoanTargetDate(loan.targetDate || todayISO());
    setExcludeSundays(loan.excludeSundays ?? false);
    setDivisionP1(loan.contributionP1 ?? 50);
    setNameP1(loan.nameP1 || loan.name || 'Você');
    setPhoneP1(loan.phoneP1 || '');
    setPixTypeP1(loan.pixTypeP1 || 'celular');
    setPixKeyP1(loan.pixKeyP1 || '');
    setFrequencyP1(loan.frequency || 'monthly');
    setNameP2(loan.nameP2 || 'Seu Amor');
    setPhoneP2(loan.phoneP2 || '');
    setPixTypeP2(loan.pixTypeP2 || 'celular');
    setPixKeyP2(loan.pixKeyP2 || '');
    setFrequencyP2(loan.frequencyP2 || 'monthly');
    setLoanTitleError(null);
    setTotalAmountError(null);
    setShowAddLoanModal(true);
  };

  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();

    const principal = parseCurrency(rawTotalAmount);
    const rateNum = parseFloat(interestRate.replace(',', '.')) || 0;
    const finalAmount = calculatedLoanTotalWithInterest > 0 ? calculatedLoanTotalWithInterest : principal;
    const instVal = deadlineFormat === 'dates' ? computedPeriodsFromDates : parseInteger(timeQuantity) || 12;

    const titleCheck = validateName(loanTitle);
    const amtCheck = validateGoalAmount(principal);

    setLoanTitleError(titleCheck.errorMessage);
    setTotalAmountError(amtCheck.errorMessage);

    if (!titleCheck.isValid || !amtCheck.isValid) return;

    const payload = {
      name: loanTitle.trim(),
      totalAmount: finalAmount,
      frequency: frequencyP1,
      frequencyP2: loanType === 'shared' ? frequencyP2 : undefined,
      durationValue: instVal,
      durationUnit: deadlineFormat === 'dates'
        ? (frequencyP1 === 'daily' ? 'days' : frequencyP1 === 'weekly' ? 'weeks' : 'months')
        : timeUnit,
      deadlineType: deadlineFormat,
      excludeSundays,
      startDate: deadlineFormat === 'dates' ? loanStartDate : tomorrowISO(),
      targetDate: deadlineFormat === 'dates' ? loanTargetDate : undefined,
      category: 'loan' as const,
      goalType: loanType,
      interestRate: rateNum,
      applyLateFees: applySpecialRule,
      contributionP1: divisionP1,
      nameP1: nameP1.trim() || 'Você',
      nameP2: loanType === 'shared' ? nameP2.trim() || 'Seu Amor' : undefined,
      phoneP1: phoneP1.trim() || undefined,
      phoneP2: loanType === 'shared' ? phoneP2.trim() || undefined : undefined,
      pixKeyP1: pixKeyP1.trim() || undefined,
      pixKeyP2: loanType === 'shared' ? pixKeyP2.trim() || undefined : undefined,
      pixTypeP1,
      pixTypeP2: loanType === 'shared' ? pixTypeP2 : undefined,
    };

    if (editingLoanId) {
      updateSavingsGoal(editingLoanId, payload);
    } else {
      addSavingsGoal(payload);
    }

    // Reset Form
    setEditingLoanId(null);
    setLoanTitle('');
    setRawTotalAmount('');
    setInterestRate('20');
    setLoanTitleError(null);
    setTotalAmountError(null);
    setShowAddLoanModal(false);
  };

  const handleConfirmPayment = () => {
    if (!activeLoan) return;

    const finalAmount = isCustomPaymentAmount
      ? parseCurrency(paymentAmountRaw)
      : calculatedPaymentTotal;

    if (finalAmount <= 0) return;

    addGoalPayment(
      activeLoan.id,
      finalAmount,
      paymentMethod,
      selectedInstallmentRangeStr,
      todayISO()
    );

    setShowPaymentModal(false);
    setPaymentParcelCount(1);
    setIsCustomPaymentAmount(false);
    setPaymentAmountRaw('');
    setPixCopied(false);
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixPayload);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2500);
  };

  // Filtered payments history
  const paymentHistoryList = useMemo(() => {
    if (!activeLoan || !activeLoan.payments) return [];
    return activeLoan.payments.filter((p) => {
      const matchMethod =
        historyMethodFilter === 'todos' || (p.method || 'pix') === historyMethodFilter;
      const matchSearch =
        !historySearch ||
        formatCurrency(p.amount).includes(historySearch) ||
        (p.installmentInfo || '').includes(historySearch);
      return matchMethod && matchSearch;
    });
  }, [activeLoan, historySearch, historyMethodFilter]);

  const payerDisplayName = activeLoan?.nameP1 || activeLoan?.name || 'Acácio';

  return (
    <div className="space-y-4 pb-20 max-w-xl mx-auto text-slate-100 font-sans">
      {/* App Shell Header Standard Theme */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                <span>GESTÃO DE EMPRÉSTIMOS</span>
              </h1>
              <p className="text-[11px] font-bold tracking-wide text-emerald-400">
                AGC Finance
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition shadow flex items-center space-x-1"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Empréstimo</span>
          </button>
        </div>

        {/* Loan selector dropdown if multiple loans */}
        {loans.length > 0 && (
          <div className="pt-1">
            <select
              value={activeLoan?.id || ''}
              onChange={(e) => setSelectedLoanId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {loans.map((l, lIdx) => (
                <option key={l.id || (l as any)._id || `loan-opt-${lIdx}`} value={l.id || (l as any)._id}>
                  ● {l.name} ({formatCurrency(l.totalAmount)})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation SubTabs Bar Standard AGC Finance Theme */}
        <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-center text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('inicio')}
            className={`py-2 rounded-lg transition ${
              activeSubTab === 'inicio'
                ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            INÍCIO
          </button>
          <button
            onClick={() => setActiveSubTab('calendario')}
            className={`py-2 rounded-lg transition ${
              activeSubTab === 'calendario'
                ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            CALENDÁRIO
          </button>
          <button
            onClick={() => setActiveSubTab('historico')}
            className={`py-2 rounded-lg transition ${
              activeSubTab === 'historico'
                ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            HISTÓRICO
          </button>
          <button
            onClick={() => setActiveSubTab('painel')}
            className={`py-2 rounded-lg transition ${
              activeSubTab === 'painel'
                ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            PAINEL
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'painel' ? (
        <div className="space-y-6">
          {/* PAINEL GERAL Header Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl">
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center space-x-2">
                <LayoutDashboard className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>PAINEL GERAL</span>
              </h2>
              <p className="text-xs font-bold text-slate-400">
                VISÃO CONSOLIDADA DE TODOS COMPROMISSOS E GANHOS
              </p>
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-md self-stretch sm:self-auto justify-center"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>NOVA META / EMPRÉSTIMO</span>
            </button>
          </div>

          {/* RESUMO GERAL - Donut Portfolio Chart & Legend */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center space-x-2">
                <PieChart className="w-4 h-4 text-emerald-400" />
                <span>RESUMO GERAL</span>
              </h3>
              <span className="text-[11px] font-extrabold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
                Gigi / AGC Finance
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
              {/* SVG Donut Chart */}
              <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="#1e293b" strokeWidth="12" />
                  {totalPortfolio > 0 ? (
                    <>
                      {/* Slice 1: Empréstimos (Pink/Rose) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#f43f5e"
                        strokeWidth="12"
                        strokeDasharray={`${donutData.loansFrac} 238.76`}
                        strokeDashoffset="0"
                        className="transition-all duration-700"
                      />
                      {/* Slice 2: Metas (Sky/Cyan) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#38bdf8"
                        strokeWidth="12"
                        strokeDasharray={`${donutData.metasFrac} 238.76`}
                        strokeDashoffset={`-${donutData.loansFrac}`}
                        className="transition-all duration-700"
                      />
                    </>
                  ) : (
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#334155" strokeWidth="12" />
                  )}
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center p-2">
                  <PieChart className="w-4 h-4 text-emerald-400 mb-0.5" />
                  <span className="text-[10px] font-black text-white tracking-widest uppercase">
                    PORTFÓLIO
                  </span>
                </div>
              </div>

              {/* Legend Items */}
              <div className="space-y-2.5 w-full max-w-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-200">Empréstimos</span>
                  </div>
                  <strong className="text-xs font-black text-white">
                    {formatCurrency(loansSummary.totalAmount)}
                  </strong>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-sky-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-200">Metas</span>
                  </div>
                  <strong className="text-xs font-black text-white">
                    {formatCurrency(metasSummary.totalAmount)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* EMPRÉSTIMOS SUMMARY CARD */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center font-black text-sm shrink-0">
                  <Landmark className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-white text-base">
                  Empréstimos ({loansSummary.count} {loansSummary.count === 1 ? 'ativo' : 'ativos'})
                </h3>
              </div>
              <span className="text-xs font-extrabold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
                {loansSummary.percent.toFixed(0)}% quitado
              </span>
            </div>

            {/* 3 Stats Box */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-800/90 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">$ TOTAL</span>
                <strong className="text-white text-xs sm:text-sm font-black">
                  {formatCurrency(loansSummary.totalAmount)}
                </strong>
              </div>

              <div className="bg-slate-800/90 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">PAGO</span>
                <strong className="text-emerald-400 text-xs sm:text-sm font-black">
                  {formatCurrency(loansSummary.totalPaid)}
                </strong>
              </div>

              <div className="bg-slate-800/90 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">RESTANTE</span>
                <strong className="text-rose-400 text-xs sm:text-sm font-black">
                  {formatCurrency(loansSummary.remaining)}
                </strong>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-purple-500 via-rose-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, loansSummary.percent)}%` }}
                />
              </div>
            </div>

            {/* Individual Loans Breakdown */}
            {allLoans.length > 0 && (
              <div className="pt-2 space-y-2 border-t border-slate-800">
                {allLoans.map((l, lIdx) => {
                  const sched = computeGoalSchedule(l);
                  const payerName = l.nameP1 || l.name || 'Você';
                  return (
                    <div
                      key={l.id || (l as any)._id || `loan-card-${lIdx}`}
                      onClick={() => {
                        setSelectedLoanId(l.id || (l as any)._id);
                        setActiveSubTab('inicio');
                      }}
                      className="flex items-center justify-between bg-slate-800/60 hover:bg-slate-800 p-3 rounded-xl border border-slate-700/80 cursor-pointer transition active:scale-[0.99]"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-white text-xs">{l.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              sched.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : sched.status === 'late'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {sched.status === 'completed'
                              ? 'QUITADO'
                              : sched.status === 'late'
                              ? 'EM ATRASO'
                              : 'EM DIA'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-bold">
                          Titular: {payerName} • Parcela: {formatCurrency(sched.installmentAmount)}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <strong className="text-xs font-black text-white block">
                            {formatCurrency(sched.saved)} / {formatCurrency(l.totalAmount)}
                          </strong>
                          <span className="text-[10px] font-bold text-slate-400 block">
                            {sched.paidPeriods} de {sched.totalPeriods} pagas
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(l);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition"
                          title="Editar empréstimo"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* METAS SUMMARY CARD */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center font-black text-sm shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-white text-base">
                  Metas ({metasSummary.count} {metasSummary.count === 1 ? 'ativa' : 'ativas'})
                </h3>
              </div>
              <span className="text-xs font-extrabold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
                {metasSummary.percent.toFixed(0)}% concluído
              </span>
            </div>

            {/* 3 Stats Box */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-800/90 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">$ OBJETIVO</span>
                <strong className="text-white text-xs sm:text-sm font-black">
                  {formatCurrency(metasSummary.totalAmount)}
                </strong>
              </div>

              <div className="bg-slate-800/90 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">GUARDADO</span>
                <strong className="text-emerald-400 text-xs sm:text-sm font-black">
                  {formatCurrency(metasSummary.totalSaved)}
                </strong>
              </div>

              <div className="bg-slate-800/90 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">FALTANDO</span>
                <strong className="text-amber-400 text-xs sm:text-sm font-black">
                  {formatCurrency(metasSummary.remaining)}
                </strong>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, metasSummary.percent)}%` }}
                />
              </div>
            </div>

            {/* Individual Metas Breakdown */}
            {allMetas.length > 0 && (
              <div className="pt-2 space-y-2 border-t border-slate-800">
                {allMetas.map((m, mIdx) => {
                  const sched = computeGoalSchedule(m);
                  return (
                    <div
                      key={m.id || (m as any)._id || `meta-item-${mIdx}`}
                      className="flex items-center justify-between bg-slate-800/60 p-3 rounded-xl border border-slate-700/80"
                    >
                      <div>
                        <span className="font-extrabold text-white text-xs block">{m.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 block">
                          Aporte: {formatCurrency(sched.installmentAmount)} / {m.frequency === 'daily' ? 'dia' : m.frequency === 'weekly' ? 'semana' : 'mês'}
                        </span>
                      </div>

                      <div className="text-right">
                        <strong className="text-xs font-black text-sky-400 block">
                          {formatCurrency(sched.saved)} / {formatCurrency(m.totalAmount)}
                        </strong>
                        <span className="text-[10px] font-bold text-slate-400 block">
                          {sched.progressPercent.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PRÓXIMOS VENCIMENTOS SECTION */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2 text-white font-black text-sm uppercase tracking-wider px-1">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>PRÓXIMOS VENCIMENTOS</span>
            </div>

            {upcomingInstallmentsList.length === 0 ? (
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs font-bold">
                Nenhum vencimento pendente no momento. Todos os compromissos estão quitados!
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingInstallmentsList.map((item, idx) => {
                  return (
                    <div
                      key={`upcoming-${item.loanId}-${item.installmentNumber || idx}-${idx}`}
                      className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative overflow-hidden"
                    >
                      <div className="flex items-center space-x-3">
                        {/* Avatar circle */}
                        <div className="w-11 h-11 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center font-black text-white text-base shadow-sm shrink-0">
                          {item.loanName.charAt(0).toUpperCase()}
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-extrabold text-white text-sm">{item.loanName}</h4>
                            <span className="text-[11px] font-bold text-slate-400">({item.payerName})</span>
                          </div>

                          <div>
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${
                                item.daysToNext < 0
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                  : item.daysToNext === 0
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {item.daysToNext < 0
                                ? `ATRASADO ${Math.abs(item.daysToNext)} DIA(S)`
                                : item.daysToNext === 0
                                ? 'VENCE HOJE'
                                : `PRÓXIMO EM ${item.daysToNext} DIA(S)`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Price & Action button */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-800">
                        <div className="text-left sm:text-right space-y-0.5">
                          <div className="text-[10px] font-bold text-slate-400">
                            Parcela: <strong className="text-amber-400 font-black text-sm">{formatCurrency(item.amount)}</strong>
                          </div>
                          <div className="text-[11px] font-extrabold text-rose-400">
                            Restante: {formatCurrency(item.remainingAmount)}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedLoanId(item.loanId);
                            setPaymentParcelCount(item.unpaidParcelsCount || 999);
                            if (item.pixKeyP1) setCustomPixKey(item.pixKeyP1);
                            if (item.pixTypeP1) setCustomPixKeyType(item.pixTypeP1 as PixType);
                            setShowPaymentModal(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs transition shadow-md shrink-0 flex items-center justify-center space-x-1"
                        >
                          <span>Quitar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : !activeLoan ? (
        <div className="bg-slate-900 p-10 text-center rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <Landmark className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-extrabold text-white text-base">Nenhum empréstimo cadastrado</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Cadastre seus financiamentos ou empréstimos para gerar o calendário e cobranças Pix.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition inline-flex items-center space-x-2 shadow-lg"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Cadastrar Primeiro Empréstimo</span>
          </button>
        </div>
      ) : (
        <>
          {/* TAB 1: INÍCIO / QUITAÇÕES */}
          {activeSubTab === 'inicio' && activeSched && (
            <div className="space-y-4">
              <div className="text-xs font-extrabold tracking-widest text-slate-400 uppercase px-1">
                QUITAÇÕES
              </div>

              {/* Driver Quitação Card Standard System Style */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {/* Circle Avatar */}
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 font-extrabold text-xl shadow-sm">
                      {payerDisplayName.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-black text-white">{payerDisplayName}</h2>
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${
                            activeSched.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : activeSched.status === 'late'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {activeSched.status === 'completed'
                            ? 'QUITADO'
                            : activeSched.status === 'late'
                            ? 'EM ATRASO'
                            : 'EM DIA'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-bold">
                        {activeSched.progressPercent.toFixed(0)}% do empréstimo
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEditModal(activeLoan)}
                      className="text-slate-400 hover:text-amber-400 p-1.5 rounded-lg transition"
                      title="Editar empréstimo"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingLoan({ id: activeLoan.id, name: activeLoan.name })}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition"
                      title="Excluir empréstimo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Vencimento Pill */}
                <div className="inline-block bg-slate-800 border border-slate-700 px-3 py-1 rounded-xl text-xs font-bold text-slate-200">
                  Próximo:{' '}
                  <span className="text-emerald-400 font-extrabold">
                    {activeSched.daysToNext === 0
                      ? 'vence hoje'
                      : activeSched.daysToNext < 0
                      ? `atrasado há ${Math.abs(activeSched.daysToNext)} dias`
                      : `vence em ${activeSched.daysToNext} dias`}
                  </span>
                </div>

                {/* Emerald Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, activeSched.progressPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 divide-x divide-slate-800 pt-2 text-center text-xs">
                  <div className="pr-2">
                    <span className="text-[10px] text-slate-400 font-bold block">Pago</span>
                    <strong className="text-white font-extrabold text-sm">
                      {formatCurrency(activeSched.saved)}
                    </strong>
                  </div>
                  <div className="px-2">
                    <span className="text-[10px] text-slate-400 font-bold block">Restante</span>
                    <strong className="text-rose-400 font-extrabold text-sm">
                      {formatCurrency(remainingTotal)}
                    </strong>
                  </div>
                  <div className="pl-2">
                    <span className="text-[10px] text-slate-400 font-bold block">Por dia</span>
                    <strong className="text-emerald-400 font-extrabold text-sm">
                      {formatCurrency(singleInstallmentValue)}
                    </strong>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setPaymentParcelCount(1);
                      if (activeLoan.pixKeyP1) {
                        setCustomPixKey(activeLoan.pixKeyP1);
                      }
                      if (activeLoan.pixTypeP1) {
                        setCustomPixKeyType(activeLoan.pixTypeP1);
                      }
                      setShowPaymentModal(true);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-2xl text-xs uppercase tracking-wider transition shadow-lg active:scale-98 flex items-center justify-center space-x-2"
                  >
                    <span>NOVA QUITAÇÃO</span>
                  </button>
                </div>

                {/* Histórico Recente de Pagamentos com Opção de Excluir */}
                {(activeLoan.payments || []).length > 0 && (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                      PARCELAS QUITADAS ({activeLoan.payments.length})
                    </span>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {activeLoan.payments.map((p, pIdx) => (
                        <div
                          key={p.id || (p as any)._id || `loan-payment-${p.date}-${p.amount}-${pIdx}`}
                          className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80 text-xs hover:border-slate-600 transition"
                        >
                          <div>
                            <span className="font-extrabold text-white block">
                              {p.installmentInfo || 'Parcela'} • {formatCurrency(p.amount)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {formatDateDisplay(p.date)} {p.timeStr ? `às ${p.timeStr}` : ''} ({(p.method || 'pix').toUpperCase()})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPaymentDetails(p);
                              setShowConfirmDeletePayment(true);
                            }}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition font-bold text-[11px] flex items-center space-x-1"
                            title="Excluir Parcela"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Excluir</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CALENDÁRIO Standard System Colors */}
          {activeSubTab === 'calendario' && (
            <div className="bg-slate-900 text-white p-3 sm:p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4 max-w-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xs sm:text-sm font-extrabold tracking-wide text-emerald-400">
                  {monthYearLabel}
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 text-center text-[8px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-tight sm:tracking-wider">
                <span>DOM</span>
                <span>SEG</span>
                <span>TER</span>
                <span>QUA</span>
                <span>QUI</span>
                <span>SEX</span>
                <span>SÁB</span>
              </div>

              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center text-xs">
                {calendarDays.map((d, idx) => {
                  if (!d.isCurrentMonth) {
                    return (
                      <div key={`cal-other-${d.dateStr || idx}`} className="h-8 sm:h-9 flex items-center justify-center text-slate-700 text-[10px] sm:text-[11px]">
                        {d.dayNumber}
                      </div>
                    );
                  }

                  return (
                    <div key={`cal-day-${d.dateStr || idx}`} className="h-8 sm:h-9 flex items-center justify-center relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (d.status === 'pago') {
                            const p = (activeLoan?.payments || []).find((pm) => pm.date === d.dateStr) || activeLoan?.payments?.[0];
                            if (p) setSelectedPaymentDetails(p);
                          } else if (d.status === 'atrasado' || d.status === 'futuro') {
                            setPaymentParcelCount(unpaidInstallments.length || 999);
                            if (activeLoan?.pixKeyP1) setCustomPixKey(activeLoan.pixKeyP1);
                            if (activeLoan?.pixTypeP1) setCustomPixKeyType(activeLoan.pixTypeP1);
                            setShowPaymentModal(true);
                          }
                        }}
                        className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-[11px] transition ${
                          d.status === 'pago'
                            ? 'bg-emerald-500 text-slate-950 font-black shadow-md hover:scale-110 active:scale-95 cursor-pointer'
                            : d.status === 'atrasado'
                            ? 'bg-rose-500 text-white font-black shadow-md hover:scale-110 active:scale-95 cursor-pointer'
                            : d.status === 'futuro'
                            ? 'bg-amber-500 text-slate-950 font-black shadow-md hover:scale-110 active:scale-95 cursor-pointer'
                            : d.isToday
                            ? 'ring-2 ring-emerald-400 text-emerald-300 font-black hover:scale-110 cursor-pointer'
                            : 'text-slate-300 hover:bg-slate-800 cursor-pointer'
                        }`}
                      >
                        {d.dayNumber}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[9px] sm:text-[10px] font-bold text-slate-300">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Pago</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span>Vencimento futuro</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <span>Vencimento atrasado</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-400 inline-block" />
                  <span>Hoje</span>
                </div>
              </div>

              {/* PARTICIPANT / PAYER SUMMARY CARDS BELOW CALENDAR */}
              {activeSched && participants.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {participants.map((p, pIdx) => {
                      return (
                        <div
                          key={p.id || `participant-${p.name}-${pIdx}`}
                          className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3 relative overflow-hidden flex flex-col justify-between"
                        >
                          <div className="space-y-1">
                            {/* Avatar Circle with Initial */}
                            <div className="w-10 h-10 rounded-full bg-orange-500/20 border-2 border-orange-500/60 flex items-center justify-center font-black text-orange-400 text-base shadow-sm">
                              {p.name.charAt(0).toUpperCase()}
                            </div>

                            {/* Participant / Payer Name */}
                            <h3 className="font-extrabold text-white text-base pt-1">{p.name}</h3>

                            {/* Próximo Pagamento Info */}
                            <p className="text-xs font-bold text-slate-300">
                              {activeSched.status === 'completed'
                                ? 'Empréstimo Quitado'
                                : activeSched.daysToNext < 0
                                ? `Atrasado há ${Math.abs(activeSched.daysToNext)} dias`
                                : activeSched.daysToNext === 0
                                ? 'Vence hoje'
                                : `Próximo em ${activeSched.daysToNext} dias`}
                            </p>

                            {/* Quantidade de Parcelas Pagas */}
                            <p className="text-xs font-bold text-slate-300">
                              Pagas: {p.paidPeriods} parcelas
                            </p>
                          </div>

                          {/* Próxima Parcela Label & Value + Restante */}
                          <div className="pt-3 border-t border-slate-800/80 flex items-end justify-between gap-2">
                            <div>
                              <span className="text-[11px] font-bold text-slate-400 block">
                                Parcela: <strong className="text-amber-400 font-black text-sm">{formatCurrency(activeSched.installmentAmount)}</strong>
                              </span>
                              <span className="text-xs font-extrabold text-rose-400 block mt-0.5">
                                Restante: {formatCurrency(remainingTotal)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setPaymentParcelCount(unpaidInstallments.length || 999);
                                if (activeLoan?.pixKeyP1) setCustomPixKey(activeLoan.pixKeyP1);
                                if (activeLoan?.pixTypeP1) setCustomPixKeyType(activeLoan.pixTypeP1);
                                setShowPaymentModal(true);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs transition shadow-md flex items-center space-x-1 shrink-0"
                            >
                              <span>Quitar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HISTÓRICO */}
          {activeSubTab === 'historico' && (
            <div className="space-y-3">
              <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 shadow-xl space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar valor ou parcela..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  <button
                    onClick={() => setHistoryMethodFilter('todos')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      historyMethodFilter === 'todos'
                        ? 'bg-emerald-600 text-white font-extrabold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setHistoryMethodFilter('pix')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      historyMethodFilter === 'pix'
                        ? 'bg-emerald-600 text-white font-extrabold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Pix
                  </button>
                  <button
                    onClick={() => setHistoryMethodFilter('dinheiro')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      historyMethodFilter === 'dinheiro'
                        ? 'bg-emerald-600 text-white font-extrabold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Dinheiro
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                {paymentHistoryList.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-medium">
                    Nenhum pagamento registrado nesta busca.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
                    {paymentHistoryList.map((p, pIdx) => {
                      const itemPayerName = p.payerId === 'P2'
                        ? (activeLoan?.nameP2 || 'Titular 2')
                        : (activeLoan?.nameP1 || activeLoan?.name || 'Você');

                      return (
                        <div
                          key={p.id || (p as any)._id || `history-item-${p.date}-${p.amount}-${pIdx}`}
                          onClick={() => setSelectedPaymentDetails(p)}
                          className="relative flex items-center justify-between bg-slate-800/80 hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-700 hover:border-emerald-500/50 shadow-md cursor-pointer transition active:scale-[0.99]"
                        >
                          <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-[10px] font-black text-emerald-400">
                            {itemPayerName.charAt(0).toUpperCase()}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-extrabold text-white text-xs">{itemPayerName}</span>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase">
                                {(p.method || 'PIX').toUpperCase()}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-200 text-[9px] font-extrabold">
                                {p.installmentInfo || '01/30'}
                              </span>
                            </div>

                            <p className="text-[10px] text-slate-400 font-bold">
                              {formatDateDisplay(p.date)} {p.timeStr ? `Às ${p.timeStr}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center space-x-2">
                            <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 font-extrabold text-emerald-400 text-xs">
                              + {formatCurrency(p.amount)}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPaymentDetails(p);
                                setShowConfirmDeletePayment(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                              title="Excluir pagamento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* REGISTRAR PAGAMENTO MODAL Standard AGC Theme */}
      {showPaymentModal && activeLoan && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-800 text-white animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-white text-base">Registrar Pagamento</h3>
                <p className="text-xs text-emerald-400 font-bold">
                  Pagador: {payerDisplayName}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overdue Installment Warning Banner */}
            {oldestOverdueInstallment && (
              <div className="bg-rose-500/15 border border-rose-500/40 p-3 rounded-2xl text-left space-y-1 shadow-md">
                <div className="flex items-center space-x-1.5 text-rose-400 font-extrabold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Parcela em Atraso Detectada</span>
                </div>
                <p className="text-[11px] font-bold text-slate-200">
                  Pagamento direcionado para a parcela mais antiga em atraso:{' '}
                  <strong className="text-amber-300">
                    Parcela {String(oldestOverdueInstallment.installmentNumber).padStart(2, '0')}
                  </strong>{' '}
                  (Vencida em {formatDateDisplay(oldestOverdueInstallment.dueDateStr)}).
                </p>
              </div>
            )}

            {/* Editable Payment Amount Box */}
            <div className="bg-slate-800 border border-slate-700 p-3.5 rounded-2xl space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Valor a Pagar (R$)
                </span>
                {isCustomPaymentAmount && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomPaymentAmount(false);
                      setPaymentAmountRaw(formatCurrency(calculatedPaymentTotal).replace('R$', '').trim());
                    }}
                    className="text-[10px] font-bold text-emerald-400 hover:underline"
                  >
                    Restaurar cálculo
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 font-black text-slate-400 text-base">R$</span>
                <input
                  type="text"
                  value={paymentAmountRaw}
                  onChange={(e) => {
                    setIsCustomPaymentAmount(true);
                    setPaymentAmountRaw(maskCurrency(e.target.value));
                  }}
                  placeholder="0,00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-11 pr-3 py-2 text-xl font-black text-emerald-400 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* QTD PARCELAS Selector */}
            <div className="bg-slate-800 border border-slate-700 p-2.5 rounded-2xl flex items-center justify-between">
              <span className="text-xs font-black tracking-wider uppercase text-slate-300 pl-2">
                QTD. PARCELAS
              </span>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentParcelCount((prev) => Math.max(1, prev - 1));
                    setIsCustomPaymentAmount(false);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-700 text-white font-black text-lg flex items-center justify-center hover:bg-slate-600 active:scale-95 transition shadow-sm"
                >
                  -
                </button>

                <span className="text-lg font-black text-white min-w-5 text-center">
                  {paymentParcelCount}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentParcelCount((prev) =>
                      Math.min(unpaidInstallments.length || 30, prev + 1)
                    );
                    setIsCustomPaymentAmount(false);
                  }}
                  className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-lg flex items-center justify-center hover:bg-emerald-500 active:scale-95 transition shadow-sm"
                >
                  +
                </button>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setPaymentParcelCount(1);
                  setIsCustomPaymentAmount(false);
                }}
                className={`py-2 px-2.5 rounded-xl border font-bold text-[11px] transition flex items-center justify-center space-x-1 ${
                  paymentParcelCount === 1 && !isCustomPaymentAmount
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-extrabold'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>⚡ 1 Parcela: {formatCurrency(singleInstallmentValue)}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentParcelCount(Math.max(1, unpaidInstallments.length));
                  setIsCustomPaymentAmount(false);
                }}
                className={`py-2 px-2.5 rounded-xl border font-bold text-[11px] transition flex items-center justify-center space-x-1 ${
                  paymentParcelCount >= unpaidInstallments.length && unpaidInstallments.length > 0 && !isCustomPaymentAmount
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-extrabold'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>☑ Quitar tudo: {formatCurrency(remainingTotal)}</span>
              </button>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`py-2.5 rounded-xl text-xs font-extrabold transition border flex items-center justify-center space-x-1.5 ${
                  paymentMethod === 'pix'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Pix</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('dinheiro')}
                className={`py-2.5 rounded-xl text-xs font-extrabold transition border flex items-center justify-center space-x-1.5 ${
                  paymentMethod === 'dinheiro'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Dinheiro</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('recibo')}
                className={`py-2.5 rounded-xl text-xs font-extrabold transition border flex items-center justify-center space-x-1.5 ${
                  paymentMethod === 'recibo'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Recibo</span>
              </button>
            </div>

            {/* DETALHES DO PAGAMENTO Box */}
            <div className="pt-2">
              <div className="text-center text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                DETALHES DO PAGAMENTO
              </div>

              <div className="bg-slate-800/80 border border-dashed border-slate-700 rounded-2xl p-4 text-center space-y-3">
                {paymentMethod === 'pix' && (
                  <div className="space-y-3">
                    {/* QR Code Container Generated Offline */}
                    <div className="bg-white p-3 rounded-xl inline-block shadow-md">
                      <QRCodeSVG
                        value={pixPayload}
                        size={140}
                        level="M"
                        includeMargin={false}
                      />
                    </div>

                    <p className="text-[11px] font-bold text-slate-300 max-w-xs mx-auto">
                      Escaneie o QR Code acima para pagar via Pix
                    </p>

                    <button
                      type="button"
                      onClick={copyPixCode}
                      className="w-full bg-slate-900 hover:bg-slate-950 text-emerald-400 border border-emerald-500/30 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
                    >
                      {pixCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{pixCopied ? 'Código Copiado!' : 'Copiar Pix Copia e Cola'}</span>
                    </button>
                  </div>
                )}

                {paymentMethod === 'dinheiro' && (
                  <div className="py-4 space-y-2">
                    <DollarSign className="w-10 h-10 text-emerald-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-200">
                      Pagamento em Dinheiro Físico
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Será dado baixa na parcela selecionada ({selectedInstallmentRangeStr}).
                    </p>
                  </div>
                )}

                {paymentMethod === 'recibo' && (
                  <div className="py-4 space-y-2">
                    <Receipt className="w-10 h-10 text-emerald-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-200">
                      Geração de Recibo Comprovante
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Registra a quitação e disponibiliza recibo em PDF/comprovante.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Confirm Payment Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-2xl text-xs uppercase tracking-wider transition shadow-lg active:scale-98 flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>CONFIRMAR E REGISTRAR PAGAMENTO</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL NOVO EMPRÉSTIMO MODAL Standard System Colors */}
      {showAddLoanModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 overflow-y-auto p-3 sm:p-5 flex justify-center">
          <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full my-auto border border-slate-800 text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between bg-slate-950 px-4 py-3.5 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddLoanModal(false)}
                className="text-slate-400 hover:text-white font-bold text-xs"
              >
                Cancelar
              </button>
              <h2 className="font-extrabold text-white text-base tracking-tight">
                {editingLoanId ? 'Editar Empréstimo' : 'Novo Empréstimo'}
              </h2>
              <button
                type="button"
                onClick={handleCreateLoan}
                className="text-emerald-400 hover:text-emerald-300 font-extrabold text-xs uppercase"
              >
                Salvar
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateLoan} className="p-4 sm:p-5 space-y-4 text-xs font-sans">
              {/* TIPO DE EMPRÉSTIMO */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">
                  TIPO DE EMPRÉSTIMO
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setLoanType('shared')}
                    className={`py-2 rounded-lg font-extrabold transition text-[11px] ${
                      loanType === 'shared'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Em Casal (Dividido)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoanType('individual')}
                    className={`py-2 rounded-lg font-extrabold transition text-[11px] ${
                      loanType === 'individual'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Individual (Só eu)
                  </button>
                </div>
              </div>

              {/* QUAL O TÍTULO DO EMPRÉSTIMO? */}
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">
                  QUAL O TÍTULO DO EMPRÉSTIMO? *
                </label>
                <input
                  type="text"
                  value={loanTitle}
                  onChange={(e) => {
                    setLoanTitle(e.target.value);
                    if (loanTitleError) setLoanTitleError(null);
                  }}
                  placeholder="Ex: Empréstimo do Carro"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {loanTitleError && (
                  <p className="text-rose-400 text-[10px] font-bold">{loanTitleError}</p>
                )}
              </div>

              {/* VALOR TOTAL & % JUROS (AO MÊS) */}
              <div className="grid grid-cols-3 gap-2 items-end">
                <div className="col-span-2 space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">
                    VALOR TOTAL *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      R$
                    </span>
                    <input
                      type="text"
                      value={rawTotalAmount}
                      onChange={(e) => {
                        setRawTotalAmount(maskCurrency(e.target.value));
                        if (totalAmountError) setTotalAmountError(null);
                      }}
                      placeholder="0,00"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-extrabold uppercase text-slate-300 tracking-wider">
                    % JUROS (AO MÊS)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={interestRate}
                      onChange={(e) => setInterestRate(maskPercentage(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-center text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      %
                    </span>
                  </div>
                </div>
              </div>
              {totalAmountError && (
                <p className="text-rose-400 text-[10px] font-bold">{totalAmountError}</p>
              )}

              {/* APLICAR REGRA ESPECIAL Box */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="text-[10px] font-extrabold uppercase text-slate-300 leading-tight">
                  APLICAR REGRA ESPECIAL (TABELA PRICE: 7.73% A.M. | ATRASO: 1.076% AO DIA)
                </div>
                <button
                  type="button"
                  onClick={() => setApplySpecialRule(!applySpecialRule)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors ${
                    applySpecialRule ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      applySpecialRule ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Pill Total a pagar com Juros */}
              <div className="bg-slate-800 border border-emerald-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <span className="text-slate-300 font-bold text-xs">Total a pagar com Juros:</span>
                <strong className="text-emerald-400 font-black text-sm">
                  {formatCurrency(calculatedLoanTotalWithInterest)}
                </strong>
              </div>

              {/* FORMATO DE PRAZO */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">
                  FORMATO DE PRAZO
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setDeadlineFormat('duration')}
                    className={`py-2 rounded-lg font-extrabold transition text-[11px] ${
                      deadlineFormat === 'duration'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Duração
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeadlineFormat('dates')}
                    className={`py-2 rounded-lg font-extrabold transition text-[11px] ${
                      deadlineFormat === 'dates'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Datas Abertas
                  </button>
                </div>
              </div>

              {/* QUANTIDADE DE TEMPO / DATAS ABERTAS */}
              {deadlineFormat === 'duration' ? (
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">
                    QUANTIDADE DE TEMPO *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={maskInteger(timeQuantity)}
                      onChange={(e) => setTimeQuantity(maskInteger(e.target.value))}
                      placeholder="Ex: 12"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <select
                      value={timeUnit}
                      onChange={(e) => setTimeUnit(e.target.value as GoalDurationUnit)}
                      className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="days">Dias</option>
                      <option value="weeks">Semanas</option>
                      <option value="months">Meses</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">
                        DATA INÍCIO *
                      </label>
                      <input
                        type="date"
                        value={loanStartDate}
                        onChange={(e) => setLoanStartDate(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">
                        DATA FINAL *
                      </label>
                      <input
                        type="date"
                        value={loanTargetDate}
                        onChange={(e) => setLoanTargetDate(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="text-[10px] font-extrabold text-emerald-400 bg-slate-800/80 p-2 rounded-xl border border-slate-700/60 flex items-center justify-between">
                    <span>Total de parcelas calculadas:</span>
                    <span className="bg-emerald-500/20 px-2.5 py-0.5 rounded-lg text-emerald-300 font-black">
                      {computedPeriodsFromDates} {frequencyP1 === 'daily' ? 'dias' : frequencyP1 === 'weekly' ? 'semanas' : 'meses'}
                    </span>
                  </div>
                </div>
              )}

              {/* DESCONTAR DOMINGOS */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="chkSundays"
                  checked={excludeSundays}
                  onChange={(e) => setExcludeSundays(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-slate-800 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="chkSundays" className="text-xs text-slate-300 font-extrabold cursor-pointer uppercase">
                  DESCONTAR DOMINGOS DA CONTAGEM DE DIAS
                </label>
              </div>

              {/* DIVISÃO */}
              {loanType === 'shared' && (
                <div className="space-y-2 pt-1">
                  <div className="text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">
                    DIVISÃO: VOCÊ {divisionP1}% / SEU AMOR {100 - divisionP1}%
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${divisionP1}%` }}
                    />
                  </div>

                  {/* Percentage buttons 10% - 90% */}
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setDivisionP1(pct)}
                        className={`py-1 rounded-lg font-extrabold text-[10px] transition border ${
                          divisionP1 === pct
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* DADOS DO TITULAR 1 */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <div className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
                  Dados do Titular 1
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">
                    NOME (QUEM ESTÁ PAGANDO) *
                  </label>
                  <input
                    type="text"
                    value={nameP1}
                    onChange={(e) => setNameP1(e.target.value)}
                    placeholder="Você"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">
                    WHATSAPP
                  </label>
                  <input
                    type="text"
                    value={phoneP1}
                    onChange={(e) => setPhoneP1(maskPhone(e.target.value))}
                    placeholder="(99) 99999-9999"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">
                    CHAVE PIX (QUEM VAI RECEBER)
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={pixTypeP1}
                      onChange={(e) => {
                        const newType = e.target.value as PixType;
                        setPixTypeP1(newType);
                        setPixKeyP1(maskPixKey(pixKeyP1, newType));
                      }}
                      className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-emerald-400 font-bold focus:outline-none"
                    >
                      <option value="celular">Celular</option>
                      <option value="cpf">CPF</option>
                      <option value="cnpj">CNPJ</option>
                      <option value="email">E-mail</option>
                      <option value="aleatoria">Aleatória</option>
                    </select>

                    <input
                      type="text"
                      value={pixKeyP1}
                      onChange={(e) => setPixKeyP1(maskPixKey(e.target.value, pixTypeP1))}
                      placeholder={
                        pixTypeP1 === 'celular'
                          ? '(99) 99999-9999'
                          : pixTypeP1 === 'cpf'
                          ? '000.000.000-00'
                          : pixTypeP1 === 'cnpj'
                          ? '00.000.000/0001-00'
                          : pixTypeP1 === 'email'
                          ? 'nome@email.com'
                          : 'Chave Aleatória'
                      }
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  {pixTypeP1 === 'celular' && (
                    <p className="text-[10px] text-emerald-400 font-extrabold pt-0.5">
                      ✓ O prefixo +55 é inserido automaticamente no código do Pix.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">
                    FREQUÊNCIA DE PAGAMENTO
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setFrequencyP1('daily')}
                      className={`py-1.5 rounded-lg font-extrabold transition text-[10px] ${
                        frequencyP1 === 'daily'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Diário
                    </button>
                    <button
                      type="button"
                      onClick={() => setFrequencyP1('weekly')}
                      className={`py-1.5 rounded-lg font-extrabold transition text-[10px] ${
                        frequencyP1 === 'weekly'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Semanal
                    </button>
                    <button
                      type="button"
                      onClick={() => setFrequencyP1('monthly')}
                      className={`py-1.5 rounded-lg font-extrabold transition text-[10px] ${
                        frequencyP1 === 'monthly'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Mensal
                    </button>
                  </div>
                </div>
              </div>

              {/* DADOS DO TITULAR 2 */}
              {loanType === 'shared' && (
                <div className="space-y-2.5 pt-2 border-t border-slate-800">
                  <div className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
                    Dados do Titular 2
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">
                      NOME (QUEM ESTÁ PAGANDO) *
                    </label>
                    <input
                      type="text"
                      value={nameP2}
                      onChange={(e) => setNameP2(e.target.value)}
                      placeholder="Seu Amor"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">
                      WHATSAPP
                    </label>
                    <input
                      type="text"
                      value={phoneP2}
                      onChange={(e) => setPhoneP2(maskPhone(e.target.value))}
                      placeholder="(99) 99999-9999"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">
                      CHAVE PIX (QUEM VAI RECEBER)
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        value={pixTypeP2}
                        onChange={(e) => {
                          const newType = e.target.value as PixType;
                          setPixTypeP2(newType);
                          setPixKeyP2(maskPixKey(pixKeyP2, newType));
                        }}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-emerald-400 font-bold focus:outline-none"
                      >
                        <option value="celular">Celular</option>
                        <option value="cpf">CPF</option>
                        <option value="cnpj">CNPJ</option>
                        <option value="email">E-mail</option>
                        <option value="aleatoria">Aleatória</option>
                      </select>

                      <input
                        type="text"
                        value={pixKeyP2}
                        onChange={(e) => setPixKeyP2(maskPixKey(e.target.value, pixTypeP2))}
                        placeholder={
                          pixTypeP2 === 'celular'
                            ? '(99) 99999-9999'
                            : pixTypeP2 === 'cpf'
                            ? '000.000.000-00'
                            : pixTypeP2 === 'cnpj'
                            ? '00.000.000/0001-00'
                            : pixTypeP2 === 'email'
                            ? 'nome@email.com'
                            : 'Chave Aleatória'
                        }
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    {pixTypeP2 === 'celular' && (
                      <p className="text-[10px] text-emerald-400 font-extrabold pt-0.5">
                        ✓ O prefixo +55 é inserido automaticamente no código do Pix.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">
                      FREQUÊNCIA DE PAGAMENTO
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
                      <button
                        type="button"
                        onClick={() => setFrequencyP2('daily')}
                        className={`py-1.5 rounded-lg font-extrabold transition text-[10px] ${
                          frequencyP2 === 'daily'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Diário
                      </button>
                      <button
                        type="button"
                        onClick={() => setFrequencyP2('weekly')}
                        className={`py-1.5 rounded-lg font-extrabold transition text-[10px] ${
                          frequencyP2 === 'weekly'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Semanal
                      </button>
                      <button
                        type="button"
                        onClick={() => setFrequencyP2('monthly')}
                        className={`py-1.5 rounded-lg font-extrabold transition text-[10px] ${
                          frequencyP2 === 'monthly'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Mensal
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddLoanModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 font-bold text-xs hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition shadow-lg active:scale-98"
                >
                  Salvar Empréstimo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deletingLoan}
        title="Excluir Empréstimo"
        message={
          deletingLoan
            ? `Tem certeza que deseja excluir o empréstimo "${deletingLoan.name}"? Todos os registros de pagamentos serão removidos.`
            : ''
        }
        confirmText="Excluir"
        variant="danger"
        onConfirm={() => {
          if (deletingLoan) {
            deleteSavingsGoal(deletingLoan.id);
            setDeletingLoan(null);
          }
        }}
        onClose={() => setDeletingLoan(null)}
      />

      {/* DETALHES DO PAGAMENTO MODAL */}
      {selectedPaymentDetails && activeLoan && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-800 text-white animate-in fade-in zoom-in-95 duration-200 relative">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-white text-base">Detalhes do Pagamento</h3>
              </div>
              <button
                onClick={() => setSelectedPaymentDetails(null)}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Amount Box - Amber Pill Style */}
            <div className="bg-gradient-to-r from-amber-600/20 via-orange-500/20 to-amber-600/20 border border-amber-500/40 p-3.5 rounded-2xl text-center flex items-center justify-center space-x-2.5 shadow-lg shadow-amber-950/30">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-inner">
                <ArrowDownCircle className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-2xl font-black text-amber-300 tracking-tight">
                {formatCurrency(selectedPaymentDetails.amount)}
              </span>
            </div>

            {/* Details List */}
            <div className="space-y-2.5 text-xs">
              {/* Pagador */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 font-bold">Pagador</span>
                <span className="font-extrabold text-white">
                  {selectedPaymentDetails.payerId === 'P2'
                    ? (activeLoan.nameP2 || 'Titular 2')
                    : (activeLoan.nameP1 || activeLoan.name || 'Você')}
                </span>
              </div>

              {/* Data e Hora */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 font-bold">Data e Hora</span>
                <span className="font-extrabold text-white">
                  {formatDateDisplay(selectedPaymentDetails.date)} {selectedPaymentDetails.timeStr ? `às ${selectedPaymentDetails.timeStr}` : ''}
                </span>
              </div>

              {/* Forma */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 font-bold">Forma</span>
                <span className="font-extrabold text-white capitalize">
                  {selectedPaymentDetails.method || 'Pix'}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 font-bold">Status</span>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-300 font-black text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {selectedPaymentDetails.method === 'pix' ? 'Pix Confirmado' : 'Pago'}
                  </span>
                </span>
              </div>

              {/* Parcela */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 font-bold">Parcela</span>
                <span className="font-extrabold text-amber-400">
                  {selectedPaymentDetails.installmentInfo || '01/30'}
                </span>
              </div>

              {/* ID da Transação */}
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400 font-bold">ID da Transação</span>
                <div className="flex items-center space-x-1">
                  <span className="font-mono text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                    pag_{selectedPaymentDetails.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`pag_${selectedPaymentDetails.id}`);
                      setCopiedTxId(true);
                      setTimeout(() => setCopiedTxId(false), 2000);
                    }}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                    title="Copiar ID"
                  >
                    {copiedTxId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="grid grid-cols-2 gap-2">
                {/* Send via WhatsApp */}
                <button
                  type="button"
                  onClick={() => {
                    const payerName = selectedPaymentDetails.payerId === 'P2'
                      ? (activeLoan.nameP2 || 'Titular 2')
                      : (activeLoan.nameP1 || activeLoan.name || 'Você');
                    const rawPhone = selectedPaymentDetails.payerId === 'P2'
                      ? (activeLoan.phoneP2 || activeLoan.phoneP1)
                      : (activeLoan.phoneP1 || activeLoan.phoneP2);
                    
                    let cleanPhone = (rawPhone || '').replace(/\D/g, '');
                    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
                      cleanPhone = `55${cleanPhone}`;
                    }

                    const message = `🧾 *COMPROVANTE DE PAGAMENTO*\n` +
                      `----------------------------------\n` +
                      `*Empréstimo:* ${activeLoan.name}\n` +
                      `*Pagador:* ${payerName}\n` +
                      `*Valor Pago:* ${formatCurrency(selectedPaymentDetails.amount)}\n` +
                      `*Data e Hora:* ${formatDateDisplay(selectedPaymentDetails.date)} ${selectedPaymentDetails.timeStr ? 'às ' + selectedPaymentDetails.timeStr : ''}\n` +
                      `*Forma:* ${(selectedPaymentDetails.method || 'pix').toUpperCase()}\n` +
                      `*Parcela:* ${selectedPaymentDetails.installmentInfo || '01'}\n` +
                      `*ID da Transação:* pag_${selectedPaymentDetails.id}\n` +
                      `----------------------------------\n` +
                      `✓ Pagamento Registrado com Sucesso!`;

                    const url = cleanPhone
                      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
                      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
                    
                    window.open(url, '_blank');
                  }}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs transition shadow-md flex items-center justify-center space-x-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>

                {/* Imprimir */}
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 font-extrabold text-xs transition shadow-md flex items-center justify-center space-x-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir</span>
                </button>
              </div>

              {/* Excluir pagamento */}
              <button
                type="button"
                onClick={() => setShowConfirmDeletePayment(true)}
                className="w-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir pagamento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE PAYMENT MODAL */}
      <ConfirmModal
        isOpen={showConfirmDeletePayment}
        title="Excluir Pagamento"
        message={
          selectedPaymentDetails
            ? `Tem certeza que deseja excluir o pagamento de ${formatCurrency(selectedPaymentDetails.amount)} do histórico?`
            : ''
        }
        confirmText="Sim, Excluir"
        variant="danger"
        onConfirm={() => {
          if (selectedPaymentDetails && activeLoan) {
            removeGoalPayment(activeLoan.id, selectedPaymentDetails.id);
            setShowConfirmDeletePayment(false);
            setSelectedPaymentDetails(null);
          }
        }}
        onClose={() => setShowConfirmDeletePayment(false)}
      />
    </div>
  );
}
