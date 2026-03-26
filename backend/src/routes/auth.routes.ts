import { Router } from 'express';
import { login, me, register } from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();
router.post('/login', login);
router.post('/register', register);
router.get('/me', authenticate, me);
export default router;
