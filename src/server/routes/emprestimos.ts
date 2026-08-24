import express from 'express';
import type { Request, Response } from 'express';
import { EmprestimoModel, getDBStatus, buildIdQuery } from '../db';
import { readLocalDb, writeLocalDb } from '../fileDb';

export const emprestimosRouter = express.Router();

// GET /api/emprestimos - List all loans
emprestimosRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const dbStatus = getDBStatus();
    let loans: any[] = [];

    if (dbStatus.isConnected) {
      const dbLoans = await EmprestimoModel.find().lean().sort({ createdAt: -1 });
      loans = dbLoans.map((l: any) => ({
        ...l,
        id: l.customId || l._id?.toString(),
      }));
    }

    if (!loans.length) {
      const localDb = readLocalDb();
      loans = localDb.emprestimos || [];
    }

    return res.json({ success: true, data: loans });
  } catch (error: any) {
    const localDb = readLocalDb();
    return res.json({ success: true, data: localDb.emprestimos || [] });
  }
});

// POST /api/emprestimos - Create or upsert loan
emprestimosRouter.post('/', async (req: Request, res: Response) => {
  try {
    const loanData = req.body;
    if (!loanData || typeof loanData !== 'object') {
      return res.status(400).json({ success: false, error: 'Dados do empréstimo inválidos' });
    }

    const customId = String(
      loanData.customId || loanData.id || `loan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    );

    const fullLoan = {
      ...loanData,
      id: customId,
      customId,
      category: 'loan',
      updatedAt: new Date().toISOString(),
    };

    // Save to local File DB
    const localDb = readLocalDb();
    const existingLoans = localDb.emprestimos || [];
    const index = existingLoans.findIndex((l: any) => String(l.id || l.customId) === customId);

    let updatedLoans: any[];
    if (index >= 0) {
      updatedLoans = [...existingLoans];
      updatedLoans[index] = { ...updatedLoans[index], ...fullLoan };
    } else {
      updatedLoans = [fullLoan, ...existingLoans];
    }

    // Also sync loan into savingsGoals array if present
    const updatedSavings = (localDb.savingsGoals || []).filter(
      (sg: any) => String(sg.id || sg.customId) !== customId
    );
    updatedSavings.unshift(fullLoan);

    writeLocalDb({
      emprestimos: updatedLoans,
      savingsGoals: updatedSavings,
    });

    // Save to MongoDB if connected
    const dbStatus = getDBStatus();
    let mongoUpdated: any = null;
    if (dbStatus.isConnected) {
      const { _id, __v, ...cleanLoan } = loanData;
      const query = buildIdQuery(customId, _id, loanData.id);
      mongoUpdated = await EmprestimoModel.findOneAndUpdate(
        query,
        { ...cleanLoan, customId, category: 'loan' },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    console.log('✅ [Emprestimos API] Empréstimo salvo com sucesso:', fullLoan.name || fullLoan.borrowerName);

    return res.status(201).json({
      success: true,
      data: mongoUpdated ? { ...mongoUpdated.toObject(), id: customId } : fullLoan,
    });
  } catch (error: any) {
    console.error('❌ [Emprestimos API POST Error]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/emprestimos/:id - Update loan
emprestimosRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { _id, ...updateData } = req.body;

    const localDb = readLocalDb();
    const existingLoans = localDb.emprestimos || [];
    const index = existingLoans.findIndex((l: any) => String(l.id || l.customId) === id);

    let updatedLoan = { ...updateData, id, customId: id, category: 'loan' };
    if (index >= 0) {
      updatedLoan = { ...existingLoans[index], ...updateData, id, customId: id };
      existingLoans[index] = updatedLoan;
    } else {
      existingLoans.unshift(updatedLoan);
    }

    writeLocalDb({ emprestimos: existingLoans });

    const dbStatus = getDBStatus();
    if (dbStatus.isConnected) {
      const query = buildIdQuery(id);
      await EmprestimoModel.findOneAndUpdate(query, updateData, { new: true, upsert: true });
    }

    return res.json({ success: true, data: updatedLoan });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/emprestimos/:id - Delete loan
emprestimosRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const localDb = readLocalDb();
    const filteredLoans = (localDb.emprestimos || []).filter(
      (l: any) => String(l.id || l.customId) !== id
    );
    const filteredSavings = (localDb.savingsGoals || []).filter(
      (sg: any) => String(sg.id || sg.customId) !== id
    );

    writeLocalDb({
      emprestimos: filteredLoans,
      savingsGoals: filteredSavings,
    });

    const dbStatus = getDBStatus();
    if (dbStatus.isConnected) {
      const query = buildIdQuery(id);
      await EmprestimoModel.deleteMany(query);
    }

    return res.json({ success: true, message: 'Empréstimo excluído com sucesso' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
