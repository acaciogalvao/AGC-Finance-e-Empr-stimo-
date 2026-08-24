export interface Ride {
  id: string;
  date: string;
  driverGross: number;
  totalAppKm: number;
  totalAppMinutes: number;
  platform: 'uber' | '99' | 'indrive' | 'particular' | 'outros';
  notes?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: 'combustivel' | 'alimentacao' | 'manutencao' | 'aluguel_veiculo' | 'seguro' | 'lava_jato' | 'outros';
  amount: number;
  paymentMethod?: 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito';
  description?: string;
}

export interface Installment {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  isPaid: boolean;
  paidDate?: string;
  paidAmount?: number;
}

export interface Loan {
  id: string;
  clientName: string;
  clientPhone: string;
  clientPixKey?: string;
  pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'chave_aleatoria';
  borrowedAmount: number;
  interestRate: number; // %
  totalToPay: number;
  installmentsCount: number;
  paymentFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  startDate: string;
  installments: Installment[];
  status: 'active' | 'completed' | 'late';
  notes?: string;
}

export interface GoalPayment {
  id: string;
  date: string;
  amount: number;
  notes?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  totalAmount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  excludeSundays: boolean;
  startDate: string;
  targetDate: string;
  payments: GoalPayment[];
  category?: string;
}

export interface UserProfile {
  name: string;
  carModel?: string;
  licensePlate?: string;
  dailyGoal: number;
  weeklyGoal: number;
  monthlyGoal: number;
  meiTaxRate: number;
  workDaysPerMonth: number;
}
