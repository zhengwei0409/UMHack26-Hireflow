import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const getConfigs = async (req: Request, res: Response) => {
  try {
    const configs = await prisma.systemConfig.findMany();
    res.json({ success: true, data: configs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch configurations' });
  }
};

export const updateConfig = async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }

    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update configuration' });
  }
};
