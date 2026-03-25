import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { hashPassword } from '../services/auth.service';
import { getUserActivity as getUserActivityService, getUserProfile as getUserProfileService } from '../services/users.service';

const pid = (req: Request) => parseInt(req.params['id'] as string);

export const listUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, managerType: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  } catch (err) { next(err); }
};

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, name, role, managerType, password } = req.body;
    if (!email || !name || !role || !password) {
      res.status(400).json({ message: 'email, name, role, and password are required' });
      return;
    }
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, name, role, managerType: role === 'MANAGER' ? (managerType ?? null) : null, passwordHash },
      select: { id: true, email: true, name: true, role: true, managerType: true, isActive: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      res.status(409).json({ message: 'Email already in use' });
      return;
    }
    next(err);
  }
};

export const getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: pid(req) },
      select: { id: true, email: true, name: true, role: true, managerType: true, isActive: true, createdAt: true },
    });
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    res.json(user);
  } catch (err) { next(err); }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, role, managerType, isActive, password } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data['name'] = name;
    if (role !== undefined) {
      data['role'] = role;
      // Clear managerType when changing away from MANAGER; set it when staying/moving to MANAGER
      data['managerType'] = role === 'MANAGER' ? (managerType ?? null) : null;
    } else if (managerType !== undefined) {
      data['managerType'] = managerType;
    }
    if (isActive !== undefined) data['isActive'] = isActive;
    if (password) data['passwordHash'] = await hashPassword(password);

    const user = await prisma.user.update({
      where: { id: pid(req) },
      data,
      select: { id: true, email: true, name: true, role: true, managerType: true, isActive: true },
    });
    res.json(user);
  } catch (err) { next(err); }
};

export const getUserProfileHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await getUserProfileService(pid(req));
    if (!profile) { res.status(404).json({ message: 'User not found' }); return; }
    res.json(profile);
  } catch (err) { next(err); }
};

export const getUserActivity = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await getUserActivityService());
  } catch (err) { next(err); }
};

export const deactivateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.user.update({ where: { id: pid(req) }, data: { isActive: false } });
    res.status(204).send();
  } catch (err) { next(err); }
};
