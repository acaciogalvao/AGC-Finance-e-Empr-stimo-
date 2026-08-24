import fs from 'fs';
import path from 'path';

export interface LocalDbData {
  rides: any[];
  expenses: any[];
  savingsGoals: any[];
  emprestimos: any[];
  profile: any;
  goal: any;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_DATA: LocalDbData = {
  rides: [],
  expenses: [],
  savingsGoals: [],
  emprestimos: [],
  profile: {
    key: 'default_profile',
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
  },
  goal: {
    key: 'default_goal',
    monthlyGross: 5000,
    weeklyGross: 1250,
    dailyGross: 200,
    meiTaxRate: 6,
    workingDaysPerMonth: 22,
    workingDaysPerWeek: 5,
  },
};

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readLocalDb(): LocalDbData {
  try {
    ensureDir();
    if (!fs.existsSync(DB_FILE)) {
      writeLocalDb(DEFAULT_DATA);
      return DEFAULT_DATA;
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return {
      rides: Array.isArray(parsed.rides) ? parsed.rides : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      savingsGoals: Array.isArray(parsed.savingsGoals) ? parsed.savingsGoals : [],
      emprestimos: Array.isArray(parsed.emprestimos) ? parsed.emprestimos : [],
      profile: parsed.profile || DEFAULT_DATA.profile,
      goal: parsed.goal || DEFAULT_DATA.goal,
    };
  } catch (err) {
    console.error('⚠️ [FileDB] Erro ao ler db.json, usando padrão:', err);
    return DEFAULT_DATA;
  }
}

export function writeLocalDb(data: Partial<LocalDbData>): LocalDbData {
  try {
    ensureDir();
    const current = fs.existsSync(DB_FILE) ? readLocalDb() : DEFAULT_DATA;
    const updated: LocalDbData = {
      rides: data.rides !== undefined ? data.rides : current.rides,
      expenses: data.expenses !== undefined ? data.expenses : current.expenses,
      savingsGoals: data.savingsGoals !== undefined ? data.savingsGoals : current.savingsGoals,
      emprestimos: data.emprestimos !== undefined ? data.emprestimos : current.emprestimos,
      profile: data.profile ? { ...current.profile, ...data.profile } : current.profile,
      goal: data.goal ? { ...current.goal, ...data.goal } : current.goal,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (err) {
    console.error('⚠️ [FileDB] Erro ao salvar db.json:', err);
    return DEFAULT_DATA;
  }
}
