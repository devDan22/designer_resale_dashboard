import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { profitLoss, inventoryByBrand, salesVelocity, buyVsSell } from '../controllers/reports.controller';

const router = Router();
router.use(authenticate, authorize('ADMIN', 'MANAGER'));
router.get('/profit-loss', profitLoss);
router.get('/inventory-by-brand', inventoryByBrand);
router.get('/sales-velocity', salesVelocity);
router.get('/buy-vs-sell', buyVsSell);
export default router;
