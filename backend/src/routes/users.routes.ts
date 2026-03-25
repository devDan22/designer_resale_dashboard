import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { listUsers, createUser, getUser, updateUser, deactivateUser, getUserActivity, getUserProfileHandler } from '../controllers/users.controller';

const router = Router();
router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/', listUsers);
router.get('/activity', getUserActivity);
router.post('/', createUser);
router.get('/:id/profile', getUserProfileHandler);
router.get('/:id', getUser);
router.patch('/:id', updateUser);
router.delete('/:id', deactivateUser);

export default router;
