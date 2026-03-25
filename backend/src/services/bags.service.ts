import prisma from '../lib/prisma';
import { AuthUser } from '../middleware/authenticate';
import { pushBagToShopify, unpublishBagFromShopify } from './shopify.service';

type BagStage = 'PURCHASED' | 'AUTHENTICATED' | 'LISTED' | 'SOLD';
type Role = 'ADMIN' | 'MANAGER' | 'BUYER' | 'SELLER';

const STAGE_ORDER: BagStage[] = ['PURCHASED', 'AUTHENTICATED', 'LISTED', 'SOLD'];

export const listBags = async (user: AuthUser, filters: Record<string, string>) => {
  const { stage, brand, condition, from, to, buyerId, sellerId, page = '1', limit = '25', search } = filters;

  const where: Record<string, unknown> = {};

  // 'mine=true' lets sellers (or anyone) filter to their own assigned bags
  if (filters['mine'] === 'true' && (user.role === 'SELLER' || user.role === 'BUYER')) {
    if (user.role === 'SELLER') where.sellerId = user.id;
    if (user.role === 'BUYER')  where.buyerId  = user.id;
  }

  if (stage) where.stage = stage;
  if (brand) where.brand = { contains: brand, mode: 'insensitive' };
  if (condition) where.condition = condition;
  if (buyerId) where.buyerId = parseInt(buyerId);
  if (sellerId) where.sellerId = parseInt(sellerId);
  if (from || to) {
    where.purchaseDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  if (search) {
    where.OR = [
      { brand: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
      { serialNumber: { contains: search, mode: 'insensitive' } },
      { sourceName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const [bags, total] = await Promise.all([
    prisma.bag.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        photos: { where: { isPrimary: true }, take: 1 },
      },
    }),
    prisma.bag.count({ where }),
  ]);

  return { bags, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
};

export const getBagById = async (id: number) => {
  return prisma.bag.findUnique({
    where: { id },
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
      photos: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
      stageHistory: {
        orderBy: { changedAt: 'asc' },
        include: { changedBy: { select: { id: true, name: true } } },
      },
    },
  });
};

export const createBag = async (data: Record<string, unknown>, user: AuthUser) => {
  const bag = await prisma.bag.create({
    data: {
      brand: data.brand as string,
      model: data.model as string,
      color: data.color as string,
      size: data.size as string | undefined,
      condition: data.condition as string,
      serialNumber: data.serialNumber as string | undefined,
      purchasePrice: parseFloat(data.purchasePrice as string),
      purchaseDate: new Date(data.purchaseDate as string),
      sourceName: data.sourceName as string,
      buyerId: data.buyerId ? parseInt(data.buyerId as string) : user.role === 'BUYER' ? user.id : undefined,
      notes: data.notes as string | undefined,
      stage: 'PURCHASED',
    },
  });

  await prisma.bagStageHistory.create({
    data: {
      bagId: bag.id,
      fromStage: null,
      toStage: 'PURCHASED',
      changedById: user.id,
    },
  });

  return bag;
};

export const updateBag = async (id: number, data: Record<string, unknown>, user: AuthUser) => {
  const bag = await prisma.bag.findUnique({ where: { id } });
  if (!bag) throw new Error('Bag not found');

  const allowed: Record<string, unknown> = {};

  if (['ADMIN', 'MANAGER', 'BUYER'].includes(user.role)) {
    if (data.brand !== undefined) allowed.brand = data.brand;
    if (data.model !== undefined) allowed.model = data.model;
    if (data.color !== undefined) allowed.color = data.color;
    if (data.size !== undefined) allowed.size = data.size;
    if (data.condition !== undefined) allowed.condition = data.condition;
    if (data.serialNumber !== undefined) allowed.serialNumber = data.serialNumber;
    if (data.sourceName !== undefined) allowed.sourceName = data.sourceName;
    if (data.notes !== undefined) allowed.notes = data.notes;
  }

  if (['ADMIN', 'BUYER'].includes(user.role) || (user.role === 'BUYER' && bag.buyerId === user.id)) {
    if (data.purchasePrice !== undefined) allowed.purchasePrice = parseFloat(data.purchasePrice as string);
    if (data.purchaseDate !== undefined) allowed.purchaseDate = new Date(data.purchaseDate as string);
    if (data.buyerId !== undefined) allowed.buyerId = parseInt(data.buyerId as string);
  }

  if (['ADMIN', 'MANAGER'].includes(user.role)) {
    if (data.authStatus !== undefined) allowed.authStatus = data.authStatus;
    if (data.authNotes !== undefined) allowed.authNotes = data.authNotes;
    if (data.buyerId !== undefined) allowed.buyerId = parseInt(data.buyerId as string);
    if (data.purchasePrice !== undefined) allowed.purchasePrice = parseFloat(data.purchasePrice as string);
    if (data.purchaseDate !== undefined) allowed.purchaseDate = new Date(data.purchaseDate as string);
  }

  if (['ADMIN', 'MANAGER', 'SELLER'].includes(user.role)) {
    if (data.listingPrice !== undefined) allowed.listingPrice = data.listingPrice ? parseFloat(data.listingPrice as string) : null;
    if (data.platform !== undefined) allowed.platform = data.platform;
    if (data.sellerId !== undefined) allowed.sellerId = parseInt(data.sellerId as string);
    if (data.salePrice !== undefined) allowed.salePrice = data.salePrice ? parseFloat(data.salePrice as string) : null;
    if (data.saleDate !== undefined) allowed.saleDate = data.saleDate ? new Date(data.saleDate as string) : null;
    if (data.buyerName !== undefined) allowed.buyerName = data.buyerName;
  }

  return prisma.bag.update({ where: { id }, data: allowed });
};

export const advanceBagStage = async (id: number, user: AuthUser, notes?: string) => {
  const bag = await prisma.bag.findUnique({ where: { id } });
  if (!bag) throw new Error('Bag not found');

  const currentIndex = STAGE_ORDER.indexOf(bag.stage as BagStage);
  if (currentIndex === STAGE_ORDER.length - 1) throw new Error('Bag is already in final stage');

  // Sellers can only advance bags assigned to them
  if (user.role === 'SELLER' && bag.sellerId !== user.id) {
    throw new Error('You are not assigned to this bag');
  }
  if (user.role === 'BUYER') throw new Error('Buyers cannot advance bag stages');

  const nextStage = STAGE_ORDER[currentIndex + 1];

  const [updated] = await prisma.$transaction([
    prisma.bag.update({ where: { id }, data: { stage: nextStage } }),
    prisma.bagStageHistory.create({
      data: {
        bagId: id,
        fromStage: bag.stage,
        toStage: nextStage,
        changedById: user.id,
        notes,
      },
    }),
  ]);

  // Shopify sync — fire-and-forget (don't block the response)
  if (nextStage === 'LISTED') {
    pushBagToShopify(id).catch((err) =>
      console.error(`[Shopify] Failed to push bag ${id}:`, err.message)
    );
  }

  return updated;
};

export const deleteBag = async (id: number) => {
  return prisma.bag.delete({ where: { id } });
};

export const getStageRole = (role: Role): string[] => {
  const map: Record<Role, string[]> = {
    ADMIN: ['PURCHASED', 'AUTHENTICATED', 'LISTED', 'SOLD'],
    MANAGER: ['PURCHASED', 'AUTHENTICATED', 'LISTED', 'SOLD'],
    BUYER: ['PURCHASED'],
    SELLER: ['LISTED', 'SOLD'],
  };
  return map[role] || [];
};
