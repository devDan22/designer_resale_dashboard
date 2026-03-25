import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error(err);
  if (err.message.includes('Only JPEG')) {
    res.status(400).json({ message: err.message });
    return;
  }
  res.status(500).json({ message: err.message || 'Internal server error' });
};
