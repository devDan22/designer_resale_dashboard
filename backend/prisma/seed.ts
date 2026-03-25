import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = (p: string) => bcrypt.hash(p, 12);

  // Seed users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', name: 'Admin User', role: 'ADMIN', passwordHash: await hash('admin123') },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: { email: 'manager@example.com', name: 'Jane Manager', role: 'MANAGER', passwordHash: await hash('manager123') },
  });

  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@example.com' },
    update: {},
    create: { email: 'buyer@example.com', name: 'Tom Buyer', role: 'BUYER', passwordHash: await hash('buyer123') },
  });

  const seller = await prisma.user.upsert({
    where: { email: 'seller@example.com' },
    update: {},
    create: { email: 'seller@example.com', name: 'Sara Seller', role: 'SELLER', passwordHash: await hash('seller123') },
  });

  // Seed some sample bags
  const bagData = [
    { brand: 'Chanel', model: 'Classic Flap', color: 'Black', condition: 'EXCELLENT' as const, purchasePrice: 4200, listingPrice: 5800, stage: 'LISTED' as const, salePrice: null, buyerId: buyer.id, sellerId: seller.id },
    { brand: 'Louis Vuitton', model: 'Neverfull MM', color: 'Monogram', condition: 'GOOD' as const, purchasePrice: 850, listingPrice: 1200, stage: 'SOLD' as const, salePrice: 1150, buyerId: buyer.id, sellerId: seller.id },
    { brand: 'Hermès', model: 'Birkin 30', color: 'Gold', condition: 'NEW' as const, purchasePrice: 12000, listingPrice: null, stage: 'AUTHENTICATED' as const, salePrice: null, buyerId: buyer.id, sellerId: null },
    { brand: 'Gucci', model: 'Dionysus', color: 'GG Supreme', condition: 'GOOD' as const, purchasePrice: 680, listingPrice: 950, stage: 'LISTED' as const, salePrice: null, buyerId: buyer.id, sellerId: seller.id },
    { brand: 'Chanel', model: 'Boy Bag', color: 'Beige', condition: 'EXCELLENT' as const, purchasePrice: 3800, listingPrice: null, stage: 'PURCHASED' as const, salePrice: null, buyerId: buyer.id, sellerId: null },
    { brand: 'Louis Vuitton', model: 'Speedy 30', color: 'Damier Ebene', condition: 'FAIR' as const, purchasePrice: 480, listingPrice: 720, stage: 'SOLD' as const, salePrice: 690, buyerId: buyer.id, sellerId: seller.id },
  ];

  for (const b of bagData) {
    const existing = await prisma.bag.findFirst({ where: { brand: b.brand, model: b.model, color: b.color } });
    if (existing) continue;

    const bag = await prisma.bag.create({
      data: {
        brand: b.brand, model: b.model, color: b.color, condition: b.condition,
        purchasePrice: b.purchasePrice, purchaseDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        sourceName: 'Sample Source', buyerId: b.buyerId,
        listingPrice: b.listingPrice, stage: b.stage, sellerId: b.sellerId,
        salePrice: b.salePrice, saleDate: b.salePrice ? new Date() : null,
        authStatus: ['AUTHENTICATED', 'LISTED', 'SOLD'].includes(b.stage),
      },
    });

    await prisma.bagStageHistory.create({
      data: { bagId: bag.id, toStage: 'PURCHASED', changedById: admin.id },
    });
  }

  console.log('Seed complete. Test accounts:');
  console.log('  admin@example.com / admin123');
  console.log('  manager@example.com / manager123');
  console.log('  buyer@example.com / buyer123');
  console.log('  seller@example.com / seller123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
