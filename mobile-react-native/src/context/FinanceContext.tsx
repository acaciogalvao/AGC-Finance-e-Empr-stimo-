import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ride, Expense, Loan, SavingsGoal, UserProfile } from '../types';
import { todayISO } from '../utils/format';

interface FinanceContextData {
  rides: Ride[];
  expenses: Expense[];
  loans: Loan[];
  savingsGoals: SavingsGoal[];
  profile: UserProfile;
  addRide: (ride: Omit<Ride, 'id'>) => Promise<void>;
  deleteRide: (id: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addLoan: (loan: Omit<Loan, 'id'>) => Promise<void>;
  updateLoan: (loan: Loan) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  addGoal: (goal: Omit<SavingsGoal, 'id'>) => Promise<void>;
  addGoalDeposit: (goalId: string, amount: number) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const STORAGE_KEYS = {
  RIDES: '@agc_rides',
  EXPENSES: '@agc_expenses',
  LOANS: '@agc_loans',
  GOALS: '@agc_goals',
  PROFILE: '@agc_profile',
};

const defaultProfile: UserProfile = {
  name: 'Acácio Galvão',
  carModel: 'Veículo de Trabalho',
  licensePlate: '',
  dailyGoal: 150,
  weeklyGoal: 900,
  monthlyGoal: 3600,
  meiTaxRate: 5,
  workDaysPerMonth: 26,
};

const FinanceContext = createContext<FinanceContextData>({} as FinanceContextData);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);

  // Load from local AsyncStorage on boot
  useEffect(() => {
    const loadData = async () => {
      try {
        const [rData, eData, lData, gData, pData] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.RIDES),
          AsyncStorage.getItem(STORAGE_KEYS.EXPENSES),
          AsyncStorage.getItem(STORAGE_KEYS.LOANS),
          AsyncStorage.getItem(STORAGE_KEYS.GOALS),
          AsyncStorage.getItem(STORAGE_KEYS.PROFILE),
        ]);

        if (rData) setRides(JSON.parse(rData));
        if (eData) setExpenses(JSON.parse(eData));
        if (lData) setLoans(JSON.parse(lData));
        if (gData) setSavingsGoals(JSON.parse(gData));
        if (pData) setProfile(JSON.parse(pData));
      } catch (err) {
        console.error('Error loading AsyncStorage data:', err);
      }
    };
    loadData();
  }, []);

  const addRide = async (rideData: Omit<Ride, 'id'>) => {
    const newRide: Ride = { ...rideData, id: 'ride_' + Date.now() };
    const updated = [newRide, ...rides];
    setRides(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.RIDES, JSON.stringify(updated));
  };

  const deleteRide = async (id: string) => {
    const updated = rides.filter(r => r.id !== id);
    setRides(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.RIDES, JSON.stringify(updated));
  };

  const addExpense = async (expData: Omit<Expense, 'id'>) => {
    const newExp: Expense = { ...expData, id: 'exp_' + Date.now() };
    const updated = [newExp, ...expenses];
    setExpenses(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(updated));
  };

  const deleteExpense = async (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(updated));
  };

  const addLoan = async (loanData: Omit<Loan, 'id'>) => {
    const newLoan: Loan = { ...loanData, id: 'loan_' + Date.now() };
    const updated = [newLoan, ...loans];
    setLoans(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(updated));
  };

  const updateLoan = async (loan: Loan) => {
    const updated = loans.map(l => (l.id === loan.id ? loan : l));
    setLoans(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(updated));
  };

  const deleteLoan = async (id: string) => {
    const updated = loans.filter(l => l.id !== id);
    setLoans(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(updated));
  };

  const addGoal = async (goalData: Omit<SavingsGoal, 'id'>) => {
    const newGoal: SavingsGoal = { ...goalData, id: 'goal_' + Date.now(), payments: [] };
    const updated = [newGoal, ...savingsGoals];
    setSavingsGoals(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(updated));
  };

  const addGoalDeposit = async (goalId: string, amount: number) => {
    const updated = savingsGoals.map(g => {
      if (g.id === goalId) {
        const payment = { id: 'pmt_' + Date.now(), date: todayISO(), amount };
        return { ...g, payments: [...(g.payments || []), payment] };
      }
      return g;
    });
    setSavingsGoals(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(updated));
  };

  const deleteGoal = async (id: string) => {
    const updated = savingsGoals.filter(g => g.id !== id);
    setSavingsGoals(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(updated));
  };

  const updateProfile = async (p: Partial<UserProfile>) => {
    const updated = { ...profile, ...p };
    setProfile(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
  };

  return (
    <FinanceContext.Provider
      value={{
        rides,
        expenses,
        loans,
        savingsGoals,
        profile,
        addRide,
        deleteRide,
        addExpense,
        deleteExpense,
        addLoan,
        updateLoan,
        deleteLoan,
        addGoal,
        addGoalDeposit,
        deleteGoal,
        updateProfile,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => useContext(FinanceContext);
