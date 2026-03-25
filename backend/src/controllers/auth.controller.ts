import { Request, Response, NextFunction } from 'express';
import { loginUser } from '../services/auth.service';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }
    const result = await loginUser(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const me = (req: Request, res: Response): void => {
  res.json({ user: req.user });
};
