import client from './client';
import { KPIs } from '../types';

export const getKpis = () =>
  client.get<KPIs>('/dashboard/kpis').then((r) => r.data);
