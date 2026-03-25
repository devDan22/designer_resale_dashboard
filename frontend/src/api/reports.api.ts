import client from './client';

export const getProfitLoss = (from?: string, to?: string) =>
  client.get('/reports/profit-loss', { params: { from, to } }).then((r) => r.data);

export const getInventoryByBrand = () =>
  client.get('/reports/inventory-by-brand').then((r) => r.data);

export const getSalesVelocity = (from?: string, to?: string) =>
  client.get('/reports/sales-velocity', { params: { from, to } }).then((r) => r.data);

export const getBuyVsSell = () =>
  client.get('/reports/buy-vs-sell').then((r) => r.data);
