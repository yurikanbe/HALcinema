-- CreateEnum
CREATE TYPE "concession_order_status" AS ENUM ('PENDING', 'READY', 'PICKED_UP', 'CANCELLED');

-- AlterTable
ALTER TABLE "movies" ADD COLUMN "normal_price" INTEGER NOT NULL DEFAULT 1800,
ADD COLUMN "second_movie_price" INTEGER NOT NULL DEFAULT 1200;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "is_second_movie" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "parent_booking_id" BIGINT;

-- CreateTable
CREATE TABLE "screen_transfer_times" (
    "id" BIGSERIAL NOT NULL,
    "from_screen_id" BIGINT NOT NULL,
    "to_screen_id" BIGINT NOT NULL,
    "walk_minutes" INTEGER NOT NULL,

    CONSTRAINT "screen_transfer_times_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concession_products" (
    "id" BIGSERIAL NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "name_ja" VARCHAR(100) NOT NULL,
    "category" VARCHAR(30) NOT NULL,
    "price" INTEGER NOT NULL,
    "image_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concession_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_counters" (
    "id" BIGSERIAL NOT NULL,
    "screen_id" BIGINT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "location_label" VARCHAR(120) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pickup_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concession_orders" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "booking_id" BIGINT,
    "pickup_counter_id" BIGINT NOT NULL,
    "pickup_code" VARCHAR(12) NOT NULL,
    "status" "concession_order_status" NOT NULL DEFAULT 'PENDING',
    "total_amount" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ready_at" TIMESTAMP(3),
    "picked_up_at" TIMESTAMP(3),

    CONSTRAINT "concession_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concession_order_items" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,

    CONSTRAINT "concession_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "screen_transfer_times_from_screen_id_to_screen_id_key" ON "screen_transfer_times"("from_screen_id", "to_screen_id");

-- CreateIndex
CREATE UNIQUE INDEX "concession_products_slug_key" ON "concession_products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "concession_orders_pickup_code_key" ON "concession_orders"("pickup_code");

-- CreateIndex
CREATE INDEX "concession_orders_user_id_created_at_idx" ON "concession_orders"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "bookings_parent_booking_id_idx" ON "bookings"("parent_booking_id");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_parent_booking_id_fkey" FOREIGN KEY ("parent_booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_transfer_times" ADD CONSTRAINT "screen_transfer_times_from_screen_id_fkey" FOREIGN KEY ("from_screen_id") REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_transfer_times" ADD CONSTRAINT "screen_transfer_times_to_screen_id_fkey" FOREIGN KEY ("to_screen_id") REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_counters" ADD CONSTRAINT "pickup_counters_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concession_orders" ADD CONSTRAINT "concession_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concession_orders" ADD CONSTRAINT "concession_orders_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concession_orders" ADD CONSTRAINT "concession_orders_pickup_counter_id_fkey" FOREIGN KEY ("pickup_counter_id") REFERENCES "pickup_counters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concession_order_items" ADD CONSTRAINT "concession_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "concession_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concession_order_items" ADD CONSTRAINT "concession_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "concession_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
