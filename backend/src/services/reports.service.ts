import prisma from '../lib/prisma';
import { startOfMonth, endOfMonth, subMonths } from '../lib/dates';

export const getProfitLoss = async (from: string, to: string) => {
  const fromDate = from ? new Date(from) : subMonths(new Date(), 11);
  const toDate = to ? new Date(to) : new Date();

  const bags = await prisma.bag.findMany({
    where: { stage: 'SOLD', saleDate: { gte: fromDate, lte: toDate } },
    select: { purchasePrice: true, salePrice: true, saleDate: true },
  });

  // Group by month
  const map: Record<string, { revenue: number; cost: number; count: number }> = {};
  for (const b of bags) {
    if (!b.saleDate) continue;
    const key = `${b.saleDate.getFullYear()}-${String(b.saleDate.getMonth() + 1).padStart(2, '0')}`;
    if (!map[key]) map[key] = { revenue: 0, cost: 0, count: 0 };
    map[key].revenue += b.salePrice ?? 0;
    map[key].cost += b.purchasePrice;
    map[key].count += 1;
  }

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      revenue: Math.round(v.revenue * 100) / 100,
      cost: Math.round(v.cost * 100) / 100,
      profit: Math.round((v.revenue - v.cost) * 100) / 100,
      count: v.count,
    }));
};

export const getInventoryByBrand = async () => {
  const bags = await prisma.bag.findMany({
    where: { stage: { not: 'SOLD' } },
    select: { brand: true, purchasePrice: true, stage: true },
  });

  const map: Record<string, { count: number; value: number }> = {};
  for (const b of bags) {
    if (!map[b.brand]) map[b.brand] = { count: 0, value: 0 };
    map[b.brand].count += 1;
    map[b.brand].value += b.purchasePrice;
  }

  return Object.entries(map)
    .sort(([, a], [, b]) => b.value - a.value)
    .map(([brand, v]) => ({
      brand,
      count: v.count,
      value: Math.round(v.value * 100) / 100,
    }));
};

export const getSalesVelocity = async (from: string, to: string) => {
  const fromDate = from ? new Date(from) : subMonths(new Date(), 11);
  const toDate = to ? new Date(to) : new Date();

  const bags = await prisma.bag.findMany({
    where: { stage: 'SOLD', saleDate: { gte: fromDate, lte: toDate } },
    select: { brand: true, purchaseDate: true, saleDate: true },
  });

  const map: Record<string, number[]> = {};
  for (const b of bags) {
    if (!b.saleDate) continue;
    const days = Math.round((b.saleDate.getTime() - b.purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    if (!map[b.brand]) map[b.brand] = [];
    map[b.brand].push(days);
  }

  return Object.entries(map)
    .map(([brand, days]) => ({
      brand,
      avgDaysToSell: Math.round(days.reduce((a, b) => a + b, 0) / days.length),
      count: days.length,
    }))
    .sort((a, b) => a.avgDaysToSell - b.avgDaysToSell);
};

export const getBuyVsSell = async () => {
  const bags = await prisma.bag.findMany({
    where: { stage: 'SOLD', salePrice: { not: null } },
    select: { brand: true, purchasePrice: true, salePrice: true },
  });

  const map: Record<string, { buy: number[]; sell: number[] }> = {};
  for (const b of bags) {
    if (!b.salePrice) continue;
    if (!map[b.brand]) map[b.brand] = { buy: [], sell: [] };
    map[b.brand].buy.push(b.purchasePrice);
    map[b.brand].sell.push(b.salePrice);
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  return Object.entries(map)
    .map(([brand, v]) => ({
      brand,
      avgBuyPrice: Math.round(avg(v.buy) * 100) / 100,
      avgSellPrice: Math.round(avg(v.sell) * 100) / 100,
      avgMargin: Math.round(((avg(v.sell) - avg(v.buy)) / avg(v.buy)) * 10000) / 100,
      count: v.buy.length,
    }))
    .sort((a, b) => b.count - a.count);
};
