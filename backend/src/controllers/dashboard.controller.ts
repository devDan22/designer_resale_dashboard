import { Request, Response, NextFunction } from 'express';
import { getKpis as getKpisService } from '../services/dashboard.service';

export const getKpis = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await getKpisService());
  } catch (err) { next(err); }
};
