import { Request, Response, NextFunction } from 'express';
import * as reportsService from '../services/reports.service';

export const profitLoss = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await reportsService.getProfitLoss(req.query.from as string, req.query.to as string));
  } catch (err) { next(err); }
};

export const inventoryByBrand = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await reportsService.getInventoryByBrand());
  } catch (err) { next(err); }
};

export const salesVelocity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await reportsService.getSalesVelocity(req.query.from as string, req.query.to as string));
  } catch (err) { next(err); }
};

export const buyVsSell = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await reportsService.getBuyVsSell());
  } catch (err) { next(err); }
};
