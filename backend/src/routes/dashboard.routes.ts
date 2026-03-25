import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { getKpis } from '../controllers/dashboard.controller';

const router = Router();
router.get('/kpis', authenticate, authorize('ADMIN', 'MANAGER'), getKpis);
export default router;
