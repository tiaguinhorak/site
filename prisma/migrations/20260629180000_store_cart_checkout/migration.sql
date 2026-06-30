-- CreateEnum
CREATE TYPE "StoreCheckoutStatus" AS ENUM ('PENDING', 'PAID', 'DELINQUENT', 'CANCELLED');

-- CreateTable
CREATE TABLE "StoreCart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreCartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "storeItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreCartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreCheckout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "StoreCheckoutStatus" NOT NULL DEFAULT 'PENDING',
    "totalCents" INTEGER NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "delinquentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreCheckoutItem" (
    "id" TEXT NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "storeItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,
    "grantedRewards" JSONB,

    CONSTRAINT "StoreCheckoutItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreCart_userId_key" ON "StoreCart"("userId");

-- CreateIndex
CREATE INDEX "StoreCartItem_cartId_idx" ON "StoreCartItem"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreCartItem_cartId_storeItemId_key" ON "StoreCartItem"("cartId", "storeItemId");

-- CreateIndex
CREATE INDEX "StoreCheckout_userId_status_idx" ON "StoreCheckout"("userId", "status");

-- CreateIndex
CREATE INDEX "StoreCheckout_status_dueAt_idx" ON "StoreCheckout"("status", "dueAt");

-- CreateIndex
CREATE INDEX "StoreCheckoutItem_checkoutId_idx" ON "StoreCheckoutItem"("checkoutId");

-- AddForeignKey
ALTER TABLE "StoreCart" ADD CONSTRAINT "StoreCart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreCartItem" ADD CONSTRAINT "StoreCartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "StoreCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreCartItem" ADD CONSTRAINT "StoreCartItem_storeItemId_fkey" FOREIGN KEY ("storeItemId") REFERENCES "StoreItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreCheckout" ADD CONSTRAINT "StoreCheckout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreCheckoutItem" ADD CONSTRAINT "StoreCheckoutItem_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "StoreCheckout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreCheckoutItem" ADD CONSTRAINT "StoreCheckoutItem_storeItemId_fkey" FOREIGN KEY ("storeItemId") REFERENCES "StoreItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
