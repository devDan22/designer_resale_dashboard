import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  listBags, getBag, createBag, updateBag, advanceStage, deleteBag, pushToShopify,
} from '../controllers/bags.controller';
import { uploadPhotos, deletePhoto, setPrimaryPhoto } from '../controllers/photos.controller';
import { upload } from '../lib/upload';

const router = Router();
router.use(authenticate);

router.get('/', listBags);
router.post('/', authorize('ADMIN', 'BUYER'), createBag);
router.get('/:id', getBag);
router.patch('/:id', updateBag);
router.delete('/:id', authorize('ADMIN'), deleteBag);
router.post('/:id/advance', authorize('ADMIN', 'MANAGER', 'SELLER'), advanceStage);
router.post('/:id/shopify-push', authorize('ADMIN', 'MANAGER'), pushToShopify);

// Photos
router.post('/:id/photos', upload.array('photos', 10), uploadPhotos);
router.delete('/:id/photos/:photoId', deletePhoto);
router.patch('/:id/photos/:photoId/primary', setPrimaryPhoto);

export default router;
