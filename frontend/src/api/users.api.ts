import client from './client';
import { User, UserActivity, UserProfile } from '../types';

export const getUsers = () =>
  client.get<User[]>('/users').then((r) => r.data);

export const createUser = (data: Partial<User> & { password: string }) =>
  client.post<User>('/users', data).then((r) => r.data);

export const updateUser = (id: number, data: Partial<User> & { password?: string; managerType?: string }) =>
  client.patch<User>(`/users/${id}`, data).then((r) => r.data);

export const deactivateUser = (id: number) =>
  client.delete(`/users/${id}`);

export const getUserActivity = () =>
  client.get<UserActivity[]>('/users/activity').then((r) => r.data);

export const getUserProfile = (id: number) =>
  client.get<UserProfile>(`/users/${id}/profile`).then((r) => r.data);
