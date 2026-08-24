import express from 'express';
import type { Request, Response } from 'express';
import { CorridaModel, getDBStatus, buildIdQuery } from '../db';

export const corridasRouter = express.Router();

let memoryCorridas: any[] = [];

// GET /api/corridas
corridasRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const dbStatus = getDBStatus();
    if (dbStatus.isConnected) {
      const corridas = await CorridaModel.find().lean().sort({ date: -1 });
      const formatted = corridas.map((c: any) => ({
        ...c,
        id: c.customId || c._id.toString(),
      }));
      return res.json({ success: true, source: 'mongodb', data: formatted });
    }
    return res.json({ success: true, source: 'memory', data: memoryCorridas });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/corridas
corridasRouter.post('/', async (req: Request, res: Response) => {
  try {
    const dbStatus = getDBStatus();
    const data = req.body || {};
    const { _id, __v, ...cleanData } = data;
    const customId = String(cleanData.customId || cleanData.id || `ride_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

    if (dbStatus.isConnected) {
      const query = buildIdQuery(customId, _id, data.id);
      const newCorrida = await CorridaModel.findOneAndUpdate(
        query,
        { ...cleanData, customId },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return res.status(201).json({ success: true, source: 'mongodb', data: newCorrida });
    }

    const newCorrida = {
      id: customId,
      customId,
      ...data,
      createdAt: new Date().toISOString(),
    };
    memoryCorridas.unshift(newCorrida);
    return res.status(201).json({ success: true, source: 'memory', data: newCorrida });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/corridas/:id
corridasRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const dbStatus = getDBStatus();

    if (dbStatus.isConnected) {
      const query = buildIdQuery(id);
      await CorridaModel.deleteMany(query);
      return res.json({ success: true, source: 'mongodb', message: 'Registro excluído' });
    }

    memoryCorridas = memoryCorridas.filter((c) => c.id !== id && String(c._id) !== id && c.customId !== id);
    return res.json({ success: true, source: 'memory', message: 'Registro excluído' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
