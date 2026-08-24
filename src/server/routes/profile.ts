import express from 'express';
import type { Request, Response } from 'express';
import { ProfileModel, getDBStatus } from '../db';
import { readLocalDb, writeLocalDb } from '../fileDb';

export const profileRouter = express.Router();

// GET /api/profile
profileRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const dbStatus = getDBStatus();
    let profileData: any = null;

    if (dbStatus.isConnected) {
      profileData = await ProfileModel.findOne({ key: 'default_profile' }).lean();
    }

    if (!profileData) {
      const localDb = readLocalDb();
      profileData = localDb.profile;
    }

    return res.json({
      success: true,
      data: profileData,
    });
  } catch (error: any) {
    const localDb = readLocalDb();
    return res.json({
      success: true,
      data: localDb.profile,
    });
  }
});

// POST or PUT /api/profile
const updateProfileHandler = async (req: Request, res: Response) => {
  try {
    const newProfile = req.body;
    if (!newProfile || typeof newProfile !== 'object') {
      return res.status(400).json({ success: false, error: 'Dados do perfil inválidos' });
    }

    const { _id, ...profileToSave } = newProfile;
    const cleanProfile = {
      key: 'default_profile',
      ...profileToSave,
      updatedAt: new Date().toISOString(),
    };

    // Save to local JSON file
    const localDb = readLocalDb();
    writeLocalDb({
      profile: { ...localDb.profile, ...cleanProfile },
    });

    // Save to MongoDB if connected
    const dbStatus = getDBStatus();
    let mongoUpdated: any = null;
    if (dbStatus.isConnected) {
      mongoUpdated = await ProfileModel.findOneAndUpdate(
        { key: 'default_profile' },
        cleanProfile,
        { upsert: true, new: true }
      );
    }

    console.log('✅ [Profile API] Perfil atualizado com sucesso!', cleanProfile.name);

    return res.json({
      success: true,
      message: 'Perfil salvo com sucesso!',
      data: mongoUpdated || cleanProfile,
    });
  } catch (error: any) {
    console.error('❌ [Profile API Error]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

profileRouter.post('/', updateProfileHandler);
profileRouter.put('/', updateProfileHandler);
