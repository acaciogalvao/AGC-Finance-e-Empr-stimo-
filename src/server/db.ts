import mongoose from 'mongoose';

const DEFAULT_URI = 'mongodb+srv://AGCFinance:agcfinance1182@cluster0.e9fpbec.mongodb.net/agc_finance?retryWrites=true&w=majority';
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_URI;

let isConnected = false;
let lastAttemptTime = 0;
const RETRY_INTERVAL_MS = 15000; // Throttle retries to every 15s if connection failed

export async function connectDB(): Promise<boolean> {
  if (isConnected && mongoose.connection.readyState === 1) return true;

  const now = Date.now();
  if (now - lastAttemptTime < RETRY_INTERVAL_MS) {
    return false;
  }
  lastAttemptTime = now;

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    isConnected = true;
    console.log('✅ [DB] Conectado ao MongoDB Atlas com sucesso!');
    return true;
  } catch (err: any) {
    isConnected = false;
    console.warn(`⚠️ [DB] MongoDB Atlas indisponível (${err?.name || 'Error'}). Operando em modo offline / cache local.`);
    return false;
  }
}

export function getDBStatus() {
  return {
    isConnected: mongoose.connection.readyState === 1,
    mongoUriConfigured: Boolean(MONGODB_URI),
    readyState: mongoose.connection.readyState,
  };
}

export function buildIdQuery(...ids: (string | mongoose.Types.ObjectId | any)[]) {
  const conditions: any[] = [];
  const seenStr = new Set<string>();

  for (const item of ids) {
    if (!item) continue;
    if (typeof item === 'object' && !item._bsontype) {
      if (item._id) {
        const idStr = String(item._id);
        if (!seenStr.has(idStr)) {
          seenStr.add(idStr);
          if (mongoose.Types.ObjectId.isValid(idStr) && idStr.length === 24) {
            conditions.push({ _id: new mongoose.Types.ObjectId(idStr) });
          }
          conditions.push({ customId: idStr });
        }
      }
      if (item.customId) {
        const idStr = String(item.customId);
        if (!seenStr.has(idStr)) {
          seenStr.add(idStr);
          conditions.push({ customId: idStr });
        }
      }
      if (item.id) {
        const idStr = String(item.id);
        if (!seenStr.has(idStr)) {
          seenStr.add(idStr);
          if (mongoose.Types.ObjectId.isValid(idStr) && idStr.length === 24) {
            conditions.push({ _id: new mongoose.Types.ObjectId(idStr) });
          }
          conditions.push({ customId: idStr });
        }
      }
      continue;
    }

    const strId = String(item);
    if (strId && !seenStr.has(strId)) {
      seenStr.add(strId);
      const isValidObjectId = mongoose.Types.ObjectId.isValid(strId) && strId.length === 24;
      if (isValidObjectId) {
        conditions.push({ _id: new mongoose.Types.ObjectId(strId) });
      }
      conditions.push({ customId: strId });
    }
  }

  if (conditions.length === 0) return { customId: '___invalid_id___' };
  if (conditions.length === 1) return conditions[0];
  return { $or: conditions };
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

// 1. Corridas (Rides)
const CorridaSchema = new mongoose.Schema({
  customId: { type: String, index: true },
  platform: { type: String, required: true },
  grossValue: { type: Number, required: true },
  offeredValue: Number,
  passengerValue: Number,
  distance: Number,
  duration: Number,
  date: { type: String, required: true, index: true },
  observations: String,
  photo: String,
  createdAt: { type: Date, default: Date.now },
});

// 2. Despesas (Expenses)
const DespesaSchema = new mongoose.Schema({
  customId: { type: String, index: true },
  date: { type: String, required: true, index: true },
  category: { type: String, required: true },
  value: { type: Number, required: true },
  description: String,
  createdAt: { type: Date, default: Date.now },
});

// 3. Metas de Economia / Empréstimos (Savings & Loans Goals)
const PaymentSchema = new mongoose.Schema({
  customId: String,
  amount: { type: Number, required: true },
  date: String,
  payerId: String,
  method: String,
  installmentInfo: String,
  timeStr: String,
});

const SavingsGoalSchema = new mongoose.Schema({
  customId: { type: String, index: true },
  name: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  frequency: { type: String, default: 'daily' },
  frequencyP2: String,
  durationValue: { type: Number, default: 30 },
  durationUnit: { type: String, default: 'days' },
  deadlineType: String,
  excludeSundays: { type: Boolean, default: false },
  startDate: { type: String, required: true },
  targetDate: String,
  payments: [PaymentSchema],
  category: { type: String, default: 'saving' },
  goalType: { type: String, default: 'individual' },
  interestRate: Number,
  applyLateFees: Boolean,
  contributionP1: Number,
  nameP1: String,
  nameP2: String,
  phoneP1: String,
  phoneP2: String,
  pixKeyP1: String,
  pixKeyP2: String,
  pixTypeP1: String,
  pixTypeP2: String,
  createdAt: { type: Date, default: Date.now },
});

// 4. Perfil do Usuário
const ProfileSchema = new mongoose.Schema({
  key: { type: String, default: 'default_profile', unique: true },
  name: String,
  vehicleType: String,
  activePlatforms: [String],
  vehicleModel: String,
  vehiclePlate: String,
  fuelType: String,
  phone: String,
  email: String,
  pixKey: String,
  pixType: String,
  updatedAt: { type: Date, default: Date.now },
});

// 5. Configuração de Metas (Faturamento)
const GoalConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'default_goal', unique: true },
  monthlyGross: Number,
  weeklyGross: Number,
  dailyGross: Number,
  meiTaxRate: Number,
  workingDaysPerMonth: Number,
  workingDaysPerWeek: Number,
  updatedAt: { type: Date, default: Date.now },
});

// Emprestimo Schema (loans collection)
const EmprestimoSchema = new mongoose.Schema(
  {
    customId: { type: String, index: true },
    name: String,
    totalAmount: Number,
    frequency: { type: String, default: 'daily' },
    frequencyP2: String,
    durationValue: { type: Number, default: 30 },
    durationUnit: { type: String, default: 'days' },
    deadlineType: String,
    excludeSundays: { type: Boolean, default: false },
    startDate: String,
    targetDate: String,
    payments: [PaymentSchema],
    category: { type: String, default: 'loan' },
    goalType: { type: String, default: 'individual' },
    interestRate: Number,
    applyLateFees: Boolean,
    contributionP1: Number,
    nameP1: String,
    nameP2: String,
    phoneP1: String,
    phoneP2: String,
    pixKeyP1: String,
    pixKeyP2: String,
    pixTypeP1: String,
    pixTypeP2: String,
    borrowerName: String,
    borrowerPhone: String,
    amount: Number,
    status: String,
    installments: Array,
    createdAt: { type: Date, default: Date.now },
  },
  { strict: false }
);

export const CorridaModel = mongoose.models.Corrida || mongoose.model('Corrida', CorridaSchema);
export const DespesaModel = mongoose.models.Despesa || mongoose.model('Despesa', DespesaSchema);
export const SavingsGoalModel = mongoose.models.SavingsGoal || mongoose.model('SavingsGoal', SavingsGoalSchema);
export const MetaModel = SavingsGoalModel;
export const ProfileModel = mongoose.models.Profile || mongoose.model('Profile', ProfileSchema);
export const GoalConfigModel = mongoose.models.GoalConfig || mongoose.model('GoalConfig', GoalConfigSchema);
export const EmprestimoModel = mongoose.models.Emprestimo || mongoose.model('Emprestimo', EmprestimoSchema);
