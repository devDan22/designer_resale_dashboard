-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Bag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT,
    "condition" TEXT NOT NULL,
    "serialNumber" TEXT,
    "purchasePrice" REAL NOT NULL,
    "purchaseDate" DATETIME NOT NULL,
    "sourceName" TEXT NOT NULL,
    "buyerId" INTEGER,
    "authStatus" BOOLEAN NOT NULL DEFAULT false,
    "authNotes" TEXT,
    "listingPrice" REAL,
    "platform" TEXT,
    "sellerId" INTEGER,
    "salePrice" REAL,
    "saleDate" DATETIME,
    "buyerName" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'PURCHASED',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bag_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bag_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bagId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_bagId_fkey" FOREIGN KEY ("bagId") REFERENCES "Bag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BagStageHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bagId" INTEGER NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT NOT NULL,
    "changedById" INTEGER NOT NULL,
    "notes" TEXT,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BagStageHistory_bagId_fkey" FOREIGN KEY ("bagId") REFERENCES "Bag" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BagStageHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Bag_serialNumber_key" ON "Bag"("serialNumber");

-- CreateIndex
CREATE INDEX "Bag_stage_idx" ON "Bag"("stage");

-- CreateIndex
CREATE INDEX "Bag_brand_idx" ON "Bag"("brand");

-- CreateIndex
CREATE INDEX "Bag_buyerId_idx" ON "Bag"("buyerId");

-- CreateIndex
CREATE INDEX "Bag_sellerId_idx" ON "Bag"("sellerId");

-- CreateIndex
CREATE INDEX "Photo_bagId_idx" ON "Photo"("bagId");

-- CreateIndex
CREATE INDEX "BagStageHistory_bagId_idx" ON "BagStageHistory"("bagId");
