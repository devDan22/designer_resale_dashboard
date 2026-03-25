import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import fs from 'fs';
import path from 'path';

export const uploadPhotos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bagId = parseInt(req.params['id'] as string);
    const files = req.files as Express.Multer.File[];
    if (!files?.length) { res.status(400).json({ message: 'No files uploaded' }); return; }

    const existingCount = await prisma.photo.count({ where: { bagId } });

    const photos = await Promise.all(
      files.map((file, i) =>
        prisma.photo.create({
          data: {
            bagId,
            filename: file.filename,
            url: `/uploads/photos/${bagId}/${file.filename}`,
            isPrimary: existingCount === 0 && i === 0,
          },
        })
      )
    );
    res.status(201).json(photos);
  } catch (err) { next(err); }
};

export const deletePhoto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const photoId = parseInt(req.params['photoId'] as string);
    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo) { res.status(404).json({ message: 'Photo not found' }); return; }

    const filePath = path.join(process.cwd(), photo.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.photo.delete({ where: { id: photo.id } });

    if (photo.isPrimary) {
      const nextPhoto = await prisma.photo.findFirst({ where: { bagId: photo.bagId }, orderBy: { createdAt: 'asc' } });
      if (nextPhoto) await prisma.photo.update({ where: { id: nextPhoto.id }, data: { isPrimary: true } });
    }

    res.status(204).send();
  } catch (err) { next(err); }
};

export const setPrimaryPhoto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bagId = parseInt(req.params['id'] as string);
    const photoId = parseInt(req.params['photoId'] as string);
    await prisma.photo.updateMany({ where: { bagId }, data: { isPrimary: false } });
    await prisma.photo.update({ where: { id: photoId }, data: { isPrimary: true } });
    res.json({ success: true });
  } catch (err) { next(err); }
};
