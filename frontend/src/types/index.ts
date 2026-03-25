export type Role = 'ADMIN' | 'MANAGER' | 'BUYER' | 'SELLER';
export type BagStage = 'PURCHASED' | 'AUTHENTICATED' | 'LISTED' | 'SOLD';
export type BagCondition = 'NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR';

export type ManagerType = 'BUYING' | 'SELLING' | 'BOTH';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  managerType: ManagerType | null;
  isActive: boolean;
  createdAt: string;
}

export interface Photo {
  id: number;
  bagId: number;
  filename: string;
  url: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface StageHistory {
  id: number;
  bagId: number;
  fromStage: BagStage | null;
  toStage: BagStage;
  changedById: number;
  changedBy: { id: number; name: string };
  notes: string | null;
  changedAt: string;
}

export interface Bag {
  id: number;
  brand: string;
  model: string;
  color: string;
  size: string | null;
  condition: BagCondition;
  serialNumber: string | null;
  purchasePrice: number;
  purchaseDate: string;
  sourceName: string;
  buyerId: number | null;
  buyer: { id: number; name: string } | null;
  authStatus: boolean;
  authNotes: string | null;
  listingPrice: number | null;
  platform: string | null;
  sellerId: number | null;
  seller: { id: number; name: string } | null;
  salePrice: number | null;
  saleDate: string | null;
  buyerName: string | null;
  stage: BagStage;
  notes: string | null;
  shopifyProductId: string | null;
  shopifyProductUrl: string | null;
  createdAt: string;
  updatedAt: string;
  photos: Photo[];
  stageHistory: StageHistory[];
}

export interface PaginatedBags {
  bags: Bag[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserProfile extends UserActivity {
  createdAt: string;
}

export interface UserActivity {
  id: number;
  name: string;
  email: string;
  role: Role;
  managerType: ManagerType | null;
  isActive: boolean;
  // Buyer stats
  totalBought: number;
  totalSpend: number;
  activeBags: number;
  // Seller stats
  totalSold: number;
  totalRevenue: number;
  totalProfit: number;
  avgMargin: number;
}

export interface KPIs {
  totalInventoryValue: number;
  bagsByStage: Record<BagStage, number>;
  monthlyProfitLoss: number;
  lastMonthProfitLoss: number;
  avgMarginPercent: number;
  totalBagsThisMonth: number;
}
