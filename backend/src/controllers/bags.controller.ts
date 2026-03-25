import { Request, Response, NextFunction } from 'express';
import * as bagsService from '../services/bags.service';
import { pushBagToShopify } from '../services/shopify.service';

const pid = (req: Request) => parseInt(req.params['id'] as string);

export const listBags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await bagsService.listBags(req.user!, req.query as Record<string, string>);
    res.json(result);
  } catch (err) { next(err); }
};

export const getBag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bag = await bagsService.getBagById(pid(req));
    if (!bag) { res.status(404).json({ message: 'Bag not found' }); return; }
    res.json(bag);
  } catch (err) { next(err); }
};

export const createBag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bag = await bagsService.createBag(req.body, req.user!);
    res.status(201).json(bag);
  } catch (err) { next(err); }
};

export const updateBag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bag = await bagsService.updateBag(pid(req), req.body, req.user!);
    res.json(bag);
  } catch (err) { next(err); }
};

export const advanceStage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bag = await bagsService.advanceBagStage(pid(req), req.user!, req.body.notes);
    res.json(bag);
  } catch (err) { next(err); }
};

export const deleteBag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await bagsService.deleteBag(pid(req));
    res.status(204).send();
  } catch (err) { next(err); }
};

export const pushToShopify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await pushBagToShopify(pid(req));
    const bag = await bagsService.getBagById(pid(req));
    res.json({ success: true, shopifyProductUrl: bag?.shopifyProductUrl });
  } catch (err) { next(err); }
};
