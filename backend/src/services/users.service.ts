import prisma from '../lib/prisma';

export const getUserProfile = async (id: number) => {
  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, managerType: true, isActive: true, createdAt: true,
      boughtBags: { select: { purchasePrice: true, stage: true } },
      sellingBags: { where: { stage: 'SOLD' }, select: { purchasePrice: true, salePrice: true } },
    },
  });
  if (!u) return null;

  const totalBought  = u.boughtBags.length;
  const totalSpend   = u.boughtBags.reduce((s, b) => s + b.purchasePrice, 0);
  const activeBags   = u.boughtBags.filter((b) => b.stage !== 'SOLD').length;
  const totalSold    = u.sellingBags.length;
  const totalRevenue = u.sellingBags.reduce((s, b) => s + (b.salePrice ?? 0), 0);
  const totalCost    = u.sellingBags.reduce((s, b) => s + b.purchasePrice, 0);
  const totalProfit  = totalRevenue - totalCost;
  const avgMargin    = totalSold > 0 ? Math.round((totalProfit / totalCost) * 1000) / 10 : 0;

  return {
    id: u.id, name: u.name, email: u.email, role: u.role, managerType: u.managerType,
    isActive: u.isActive, createdAt: u.createdAt,
    totalBought, totalSpend: Math.round(totalSpend * 100) / 100, activeBags,
    totalSold, totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100, avgMargin,
  };
};

export const getUserActivity = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      managerType: true,
      isActive: true,
      boughtBags: {
        select: { purchasePrice: true, stage: true },
      },
      sellingBags: {
        where: { stage: 'SOLD' },
        select: { purchasePrice: true, salePrice: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return users.map((u) => {
    const totalBought   = u.boughtBags.length;
    const totalSpend    = u.boughtBags.reduce((s, b) => s + b.purchasePrice, 0);
    const activeBags    = u.boughtBags.filter((b) => b.stage !== 'SOLD').length;

    const totalSold     = u.sellingBags.length;
    const totalRevenue  = u.sellingBags.reduce((s, b) => s + (b.salePrice ?? 0), 0);
    const totalCost     = u.sellingBags.reduce((s, b) => s + b.purchasePrice, 0);
    const totalProfit   = totalRevenue - totalCost;
    const avgMargin     = totalSold > 0
      ? Math.round((totalProfit / totalCost) * 1000) / 10
      : 0;

    return {
      id:          u.id,
      name:        u.name,
      email:       u.email,
      role:        u.role,
      managerType: u.managerType,
      isActive:    u.isActive,
      // Buyer stats
      totalBought,
      totalSpend:  Math.round(totalSpend * 100) / 100,
      activeBags,
      // Seller stats
      totalSold,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalProfit:  Math.round(totalProfit * 100) / 100,
      avgMargin,
    };
  });
};
