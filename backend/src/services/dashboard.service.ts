import prisma from '../lib/prisma';
import { startOfMonth, endOfMonth, subMonths } from '../lib/dates';

export const getKpis = async () => {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const [bagsByStage, soldThisMonth, soldLastMonth, allUnsold] = await Promise.all([
    prisma.bag.groupBy({ by: ['stage'], _count: { id: true } }),
    prisma.bag.findMany({
      where: { stage: 'SOLD', saleDate: { gte: monthStart, lte: monthEnd } },
      select: { purchasePrice: true, salePrice: true },
    }),
    prisma.bag.findMany({
      where: { stage: 'SOLD', saleDate: { gte: lastMonthStart, lte: lastMonthEnd } },
      select: { purchasePrice: true, salePrice: true },
    }),
    prisma.bag.findMany({
      where: { stage: { not: 'SOLD' } },
      select: { purchasePrice: true },
    }),
  ]);

  const stageMap: Record<string, number> = {};
  for (const g of bagsByStage) stageMap[g.stage] = g._count.id;

  const calcPL = (bags: { purchasePrice: number; salePrice: number | null }[]) =>
    bags.reduce((sum, b) => sum + ((b.salePrice ?? 0) - b.purchasePrice), 0);

  const calcAvgMargin = (bags: { purchasePrice: number; salePrice: number | null }[]) => {
    const valid = bags.filter((b) => b.purchasePrice > 0 && b.salePrice);
    if (!valid.length) return 0;
    const avg = valid.reduce((sum, b) => sum + ((b.salePrice! - b.purchasePrice) / b.purchasePrice) * 100, 0);
    return Math.round((avg / valid.length) * 10) / 10;
  };

  const totalInventoryValue = allUnsold.reduce((sum, b) => sum + b.purchasePrice, 0);
  const monthlyProfitLoss = calcPL(soldThisMonth);
  const lastMonthProfitLoss = calcPL(soldLastMonth);
  const avgMarginPercent = calcAvgMargin(soldThisMonth);

  return {
    totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
    bagsByStage: {
      PURCHASED: stageMap['PURCHASED'] ?? 0,
      AUTHENTICATED: stageMap['AUTHENTICATED'] ?? 0,
      LISTED: stageMap['LISTED'] ?? 0,
      SOLD: stageMap['SOLD'] ?? 0,
    },
    monthlyProfitLoss: Math.round(monthlyProfitLoss * 100) / 100,
    lastMonthProfitLoss: Math.round(lastMonthProfitLoss * 100) / 100,
    avgMarginPercent,
    totalBagsThisMonth: soldThisMonth.length,
  };
};
