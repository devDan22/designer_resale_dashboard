import client from './client';
import { Bag, PaginatedBags } from '../types';

export const getBags = (params: Record<string, string | number>) =>
  client.get<PaginatedBags>('/bags', { params }).then((r) => r.data);

export const getBag = (id: number) =>
  client.get<Bag>(`/bags/${id}`).then((r) => r.data);

export const createBag = (data: Record<string, unknown>) =>
  client.post<Bag>('/bags', data).then((r) => r.data);

export const updateBag = (id: number, data: Record<string, unknown>) =>
  client.patch<Bag>(`/bags/${id}`, data).then((r) => r.data);

export const advanceStage = (id: number, notes?: string) =>
  client.post<Bag>(`/bags/${id}/advance`, { notes }).then((r) => r.data);

export const deleteBag = (id: number) =>
  client.delete(`/bags/${id}`);

export const pushToShopify = (id: number) =>
  client.post<{ success: boolean; shopifyProductUrl: string }>(`/bags/${id}/shopify-push`).then((r) => r.data);

export const uploadPhotos = (bagId: number, files: File[]) => {
  const form = new FormData();
  files.forEach((f) => form.append('photos', f));
  return client.post(`/bags/${bagId}/photos`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
};

export const deletePhoto = (bagId: number, photoId: number) =>
  client.delete(`/bags/${bagId}/photos/${photoId}`);

export const setPrimaryPhoto = (bagId: number, photoId: number) =>
  client.patch(`/bags/${bagId}/photos/${photoId}/primary`);
