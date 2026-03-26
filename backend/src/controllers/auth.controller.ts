import { Request, Response, NextFunction } from 'express';
import { loginUser, registerUser } from '../services/auth.service';

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

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      res.status(400).json({ message: 'Name, email, password and role are required' });
      return;
    }
    if (!['BUYER', 'SELLER'].includes(role)) {
      res.status(400).json({ message: 'Role must be BUYER or SELLER' });
      return;
    }
    const result = await registerUser(name, email, password, role);
    res.status(201).json(result);
  } catch (err: any) {
    if (err.message === 'Email already in use') {
      res.status(409).json({ message: err.message });
      return;
    }
    next(err);
  }
};
