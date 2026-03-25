import multer from 'multer';
import path from 'path';
import fs from 'fs';

const getUploadDir = (bagId: string) => {
  const dir = path.join(process.cwd(), 'uploads', 'photos', bagId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const bagId = (req.params['id'] as string) || 'tmp';
    cb(null, getUploadDir(bagId));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and HEIC images are allowed'));
  }
};

const maxSizeMB = parseInt(process.env.MAX_PHOTO_SIZE_MB || '10');

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024, files: 10 },
});
