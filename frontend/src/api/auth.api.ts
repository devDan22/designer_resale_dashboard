import client from './client';
import { User } from '../types';

export const login = (email: string, password: string) =>
  client.post<{ token: string; user: User }>('/auth/login', { email, password }).then((r) => r.data);

export const getMe = () =>
  client.get<{ user: User }>('/auth/me').then((r) => r.data.user);

export const register = (name: string, email: string, password: string, role: string) =>
  client.post<{ token: string; user: User }>('/auth/register', { name, email, password, role }).then((r) => r.data);
