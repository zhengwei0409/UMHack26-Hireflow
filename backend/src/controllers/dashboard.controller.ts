import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';

export async function getDashboard(req: Request, res: Response) {
  try {
    const data = await dashboardService.getDashboardData();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Unable to load dashboard data' } });
  }
}
