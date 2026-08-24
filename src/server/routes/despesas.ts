import express from 'express';
import type { Request, Response } from 'express';
import { DespesaModel, getDBStatus, buildIdQuery } from '../db';

export const despesasRouter = express.Router();

let memoryDespesas: any[] = [];

// GET /api/despesas
despesasRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const dbStatus = getDBStatus();
    if (dbStatus.isConnected) {
      const despesas = await DespesaModel.find().lean().sort({ date: -1 });
      const formatted = despesas.map((d: any) => ({
        ...d,
        id: d.customId || d._id.toString(),
      }));
      return res.json({ success: true, source: 'mongodb', data: formatted });
    }
    return res.json({ success: true, source: 'memory', data: memoryDespesas });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/despesas
despesasRouter.post('/', async (req: Request, res: Response) => {
  try {
    const dbStatus = getDBStatus();
    const data = req.body || {};
    const { _id, __v, ...cleanData } = data;
    const customId = String(cleanData.customId || cleanData.id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

    if (dbStatus.isConnected) {
      const query = buildIdQuery(customId, _id, data.id);
      const newDespesa = await DespesaModel.findOneAndUpdate(
        query,
        { ...cleanData, customId },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return res.status(201).json({ success: true, source: 'mongodb', data: newDespesa });
    }

    const newDespesa = {
      id: customId,
      customId,
      ...data,
      createdAt: new Date().toISOString(),
    };
    memoryDespesas.unshift(newDespesa);
    return res.status(201).json({ success: true, source: 'memory', data: newDespesa });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/despesas/:id
despesasRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const dbStatus = getDBStatus();

    if (dbStatus.isConnected) {
      const query = buildIdQuery(id);
      await DespesaModel.deleteMany(query);
      return res.json({ success: true, source: 'mongodb', message: 'Despesa excluída' });
    }

    memoryDespesas = memoryDespesas.filter((d) => d.id !== id && String(d._id) !== id && d.customId !== id);
    return res.json({ success: true, source: 'memory', message: 'Despesa excluída' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
