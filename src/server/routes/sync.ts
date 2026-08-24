import express from 'express';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  CorridaModel,
  DespesaModel,
  SavingsGoalModel,
  ProfileModel,
  GoalConfigModel,
  EmprestimoModel,
  getDBStatus,
  connectDB,
  buildIdQuery,
} from '../db';
import { readLocalDb, writeLocalDb } from '../fileDb';

export const syncRouter = express.Router();

// DELETE /api/sync - Reset / Wipe all database records
syncRouter.delete('/', async (_req: Request, res: Response) => {
  try {
    writeLocalDb({
      rides: [],
      expenses: [],
      savingsGoals: [],
      emprestimos: [],
    });

    const dbStatus = getDBStatus();
    if (dbStatus.isConnected) {
      await Promise.all([
        CorridaModel.deleteMany({}),
        DespesaModel.deleteMany({}),
        SavingsGoalModel.deleteMany({}),
        ProfileModel.deleteMany({}),
        GoalConfigModel.deleteMany({}),
        EmprestimoModel.deleteMany({}),
      ]);
    }

    console.log('🗑️ [DB] Todos os dados foram zerados com sucesso!');
    return res.json({
      success: true,
      message: 'Banco de dados zerado com sucesso.',
    });
  } catch (error: any) {
    console.error('[Sync DELETE Error]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sync/reset - Alias to clear database
syncRouter.post('/reset', async (_req: Request, res: Response) => {
  try {
    writeLocalDb({
      rides: [],
      expenses: [],
      savingsGoals: [],
      emprestimos: [],
    });

    const dbStatus = getDBStatus();
    if (dbStatus.isConnected) {
      await Promise.all([
        CorridaModel.deleteMany({}),
        DespesaModel.deleteMany({}),
        SavingsGoalModel.deleteMany({}),
        ProfileModel.deleteMany({}),
        GoalConfigModel.deleteMany({}),
        EmprestimoModel.deleteMany({}),
      ]);
    }
    return res.json({ success: true, message: 'Banco de dados zerado com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sync - Pull latest data from MongoDB / File DB
syncRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const localDb = readLocalDb();
    const dbStatus = getDBStatus();

    let rides = localDb.rides || [];
    let expenses = localDb.expenses || [];
    let savingsGoals = localDb.savingsGoals || [];
    let emprestimos = localDb.emprestimos || [];
    let profile = localDb.profile;
    let goal = localDb.goal;

    if (dbStatus.isConnected) {
      try {
        const [dbCorridas, dbDespesas, dbSavings, dbEmprestimos, dbProfile, dbGoal] =
          await Promise.all([
            CorridaModel.find().lean(),
            DespesaModel.find().lean(),
            SavingsGoalModel.find({ category: { $ne: 'loan' } }).lean(),
            EmprestimoModel.find().lean(),
            ProfileModel.findOne({ key: 'default_profile' }).lean(),
            GoalConfigModel.findOne({ key: 'default_goal' }).lean(),
          ]);

        if (dbCorridas.length > 0) {
          rides = dbCorridas.map((c: any) => ({ ...c, id: c.customId || c._id.toString() }));
        }
        if (dbDespesas.length > 0) {
          expenses = dbDespesas.map((d: any) => ({ ...d, id: d.customId || d._id.toString() }));
        }
        if (dbSavings.length > 0) {
          savingsGoals = dbSavings.map((sg: any) => ({
            ...sg,
            id: sg.customId || sg._id.toString(),
            category: sg.category || 'saving',
            payments: (sg.payments || []).map((p: any) => ({
              ...p,
              id: p.id || (p._id ? p._id.toString() : undefined) || p.customId,
            })),
          }));
        }
        if (dbEmprestimos.length > 0) {
          emprestimos = dbEmprestimos.map((l: any) => ({
            ...l,
            id: l.customId || l._id.toString(),
            category: 'loan',
            payments: (l.payments || []).map((p: any) => ({
              ...p,
              id: p.id || (p._id ? p._id.toString() : undefined) || p.customId,
            })),
          }));
        }
        if (dbProfile && dbProfile.name) {
          profile = { ...profile, ...dbProfile };
        }
        if (dbGoal) {
          goal = { ...goal, ...dbGoal };
        }
      } catch (err) {
        console.warn('⚠️ [Sync GET] Falha ao consultar MongoDB, usando FileDB:', err);
      }
    }

    // Merge loans into savingsGoals list for frontend compatibility
    const mergedSavingsGoalsMap = new Map<string, any>();
    savingsGoals.forEach((item: any) => {
      const itemId = String(item.id || item.customId);
      mergedSavingsGoalsMap.set(itemId, { ...item, id: itemId });
    });
    emprestimos.forEach((item: any) => {
      const itemId = String(item.id || item.customId);
      mergedSavingsGoalsMap.set(itemId, { ...item, id: itemId, category: 'loan' });
    });

    const combinedSavingsGoals = Array.from(mergedSavingsGoalsMap.values());

    return res.json({
      success: true,
      data: {
        rides,
        expenses,
        savingsGoals: combinedSavingsGoals,
        profile: profile || null,
        goal: goal || null,
      },
    });
  } catch (error: any) {
    console.error('[Sync GET Error]', error);
    const localDb = readLocalDb();
    return res.json({
      success: true,
      data: {
        rides: localDb.rides,
        expenses: localDb.expenses,
        savingsGoals: [...localDb.savingsGoals, ...localDb.emprestimos],
        profile: localDb.profile,
        goal: localDb.goal,
      },
    });
  }
});

// POST /api/sync - Push local state and merge with DB
syncRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      rides = [],
      expenses = [],
      savingsGoals = [],
      profile,
      goal,
      isReset,
    } = req.body;

    if (isReset) {
      writeLocalDb({
        rides: [],
        expenses: [],
        savingsGoals: [],
        emprestimos: [],
      });

      const dbStatus = getDBStatus();
      if (dbStatus.isConnected) {
        await Promise.all([
          CorridaModel.deleteMany({}),
          DespesaModel.deleteMany({}),
          SavingsGoalModel.deleteMany({}),
          ProfileModel.deleteMany({}),
          GoalConfigModel.deleteMany({}),
          EmprestimoModel.deleteMany({}),
        ]);
      }
      return res.json({
        success: true,
        data: { rides: [], expenses: [], savingsGoals: [], profile: null, goal: null },
      });
    }

    const currentLocal = readLocalDb();

    // 1. Separate savings goals from loans
    const incomingSavings = savingsGoals.filter((sg: any) => sg.category !== 'loan');
    const incomingLoans = savingsGoals.filter((sg: any) => sg.category === 'loan');

    // 2. Merge Rides
    const rideMap = new Map<string, any>();
    (currentLocal.rides || []).forEach((r: any) => rideMap.set(String(r.id || r.customId), r));
    rides.forEach((r: any) => {
      const id = String(r.id || r.customId || `ride_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`);
      rideMap.set(id, { ...r, id, customId: id });
    });
    const mergedRides = Array.from(rideMap.values());

    // 3. Merge Expenses
    const expenseMap = new Map<string, any>();
    (currentLocal.expenses || []).forEach((e: any) => expenseMap.set(String(e.id || e.customId), e));
    expenses.forEach((e: any) => {
      const id = String(e.id || e.customId || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`);
      expenseMap.set(id, { ...e, id, customId: id });
    });
    const mergedExpenses = Array.from(expenseMap.values());

    // 4. Merge Savings Goals
    const savingsMap = new Map<string, any>();
    (currentLocal.savingsGoals || []).filter((sg: any) => sg.category !== 'loan').forEach((sg: any) => {
      savingsMap.set(String(sg.id || sg.customId), sg);
    });
    incomingSavings.forEach((sg: any) => {
      const id = String(sg.id || sg.customId);
      if (id) savingsMap.set(id, { ...sg, id, customId: id, category: 'saving' });
    });
    const mergedSavings = Array.from(savingsMap.values());

    // 5. Merge Empréstimos (Loans)
    const loanMap = new Map<string, any>();
    (currentLocal.emprestimos || []).forEach((l: any) => {
      loanMap.set(String(l.id || l.customId), l);
    });
    incomingLoans.forEach((l: any) => {
      const id = String(l.id || l.customId);
      if (id) loanMap.set(id, { ...l, id, customId: id, category: 'loan' });
    });
    const mergedLoans = Array.from(loanMap.values());

    // 6. Smart Profile Merge
    let mergedProfile = currentLocal.profile || {};
    if (profile && typeof profile === 'object') {
      // If profile has meaningful info, update
      const isIncomingMeaningful =
        profile.name || profile.phone || profile.email || profile.vehicleModel || profile.pixKey;
      if (isIncomingMeaningful || !mergedProfile.name) {
        mergedProfile = { ...mergedProfile, ...profile, key: 'default_profile' };
      }
    }

    // 7. Goal Config Merge
    let mergedGoal = currentLocal.goal || {};
    if (goal && typeof goal === 'object') {
      mergedGoal = { ...mergedGoal, ...goal, key: 'default_goal' };
    }

    // Write merged state to local JSON file
    writeLocalDb({
      rides: mergedRides,
      expenses: mergedExpenses,
      savingsGoals: mergedSavings,
      emprestimos: mergedLoans,
      profile: mergedProfile,
      goal: mergedGoal,
    });

    // Also persist to MongoDB if connected
    const dbStatus = getDBStatus();
    if (dbStatus.isConnected) {
      try {
        // Upsert Corridas
        for (const r of mergedRides) {
          const { _id, __v, ...rData } = r;
          const customId = String(r.customId || r.id);
          const query = buildIdQuery(r);
          await CorridaModel.findOneAndUpdate(
            query,
            { ...rData, customId },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
        // Upsert Despesas
        for (const e of mergedExpenses) {
          const { _id, __v, ...eData } = e;
          const customId = String(e.customId || e.id);
          const query = buildIdQuery(e);
          await DespesaModel.findOneAndUpdate(
            query,
            { ...eData, customId },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
        // Upsert Savings
        for (const sg of mergedSavings) {
          const { _id, __v, ...sgData } = sg;
          const customId = String(sg.customId || sg.id);
          const query = buildIdQuery(sg);
          await SavingsGoalModel.findOneAndUpdate(
            query,
            { ...sgData, customId, category: 'saving' },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
        // Upsert Loans
        for (const l of mergedLoans) {
          const { _id, __v, ...lData } = l;
          const customId = String(l.customId || l.id);
          const query = buildIdQuery(l);
          await EmprestimoModel.findOneAndUpdate(
            query,
            { ...lData, customId, category: 'loan' },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
        // Upsert Profile
        if (mergedProfile) {
          const { _id, ...pData } = mergedProfile;
          await ProfileModel.findOneAndUpdate(
            { key: 'default_profile' },
            { ...pData, key: 'default_profile', updatedAt: new Date() },
            { upsert: true }
          );
        }
        // Upsert Goal Config
        if (mergedGoal) {
          const { _id, ...gData } = mergedGoal;
          await GoalConfigModel.findOneAndUpdate(
            { key: 'default_goal' },
            { ...gData, key: 'default_goal', updatedAt: new Date() },
            { upsert: true }
          );
        }
      } catch (err) {
        console.warn('⚠️ [Sync POST] Erro ao sincronizar MongoDB, FileDB salvo:', err);
      }
    }

    const combinedSavingsGoals = [...mergedSavings, ...mergedLoans];

    return res.json({
      success: true,
      data: {
        rides: mergedRides,
        expenses: mergedExpenses,
        savingsGoals: combinedSavingsGoals,
        profile: mergedProfile,
        goal: mergedGoal,
      },
    });
  } catch (error: any) {
    console.error('❌ [Sync POST Error]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});
