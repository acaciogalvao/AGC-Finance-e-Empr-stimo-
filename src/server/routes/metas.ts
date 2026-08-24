import express from 'express';
import type { Request, Response } from 'express';
import { SavingsGoalModel, getDBStatus, buildIdQuery } from '../db';

export const metasRouter = express.Router();

let memoryMetas: any[] = [];

// GET /api/metas
metasRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const dbStatus = getDBStatus();
    if (dbStatus.isConnected) {
      const metas = await SavingsGoalModel.find().lean().sort({ createdAt: -1 });
      const formatted = metas.map((m: any) => ({
        ...m,
        id: m.customId || m._id.toString(),
      }));
      return res.json({ success: true, source: 'mongodb', data: formatted });
    }
    return res.json({ success: true, source: 'memory', data: memoryMetas });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/metas
metasRouter.post('/', async (req: Request, res: Response) => {
  try {
    const dbStatus = getDBStatus();
    const metaData = req.body || {};
    const { _id, __v, ...cleanMeta } = metaData;
    const customId = String(cleanMeta.customId || cleanMeta.id || `meta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

    if (dbStatus.isConnected) {
      const query = buildIdQuery(customId, _id, metaData.id);
      const newMeta = await SavingsGoalModel.findOneAndUpdate(
        query,
        { ...cleanMeta, customId, category: cleanMeta.category || 'saving' },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return res.status(201).json({ success: true, source: 'mongodb', data: newMeta });
    }

    const newMeta = {
      id: customId,
      customId,
      ...metaData,
      createdAt: new Date().toISOString(),
    };
    memoryMetas.unshift(newMeta);
    return res.status(201).json({ success: true, source: 'memory', data: newMeta });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/metas/:id
metasRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { _id, ...updateData } = req.body;
    const dbStatus = getDBStatus();

    if (dbStatus.isConnected) {
      const query = buildIdQuery(id);
      const updated = await SavingsGoalModel.findOneAndUpdate(query, updateData, { new: true });
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Meta não encontrada' });
      }
      return res.json({ success: true, source: 'mongodb', data: updated });
    }

    const index = memoryMetas.findIndex((m) => m.id === id || String(m._id) === id || m.customId === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Meta não encontrada' });
    }

    memoryMetas[index] = { ...memoryMetas[index], ...updateData, updatedAt: new Date().toISOString() };
    return res.json({ success: true, source: 'memory', data: memoryMetas[index] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/metas/:id
metasRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const dbStatus = getDBStatus();

    if (dbStatus.isConnected) {
      const query = buildIdQuery(id);
      await SavingsGoalModel.deleteMany(query);
      return res.json({ success: true, source: 'mongodb', message: 'Meta excluída com sucesso' });
    }

    memoryMetas = memoryMetas.filter((m) => m.id !== id && String(m._id) !== id && m.customId !== id);
    return res.json({ success: true, source: 'memory', message: 'Meta excluída com sucesso' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
