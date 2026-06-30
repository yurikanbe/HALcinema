-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "creator_role" AS ENUM ('DIRECTOR', 'ACTOR', 'BOTH');

-- CreateEnum
CREATE TYPE "movie_creator_role" AS ENUM ('DIRECTOR', 'ACTOR');

-- CreateEnum
CREATE TYPE "screening_format" AS ENUM ('SUBTITLED', 'DUBBED', 'ORIGINAL');

-- CreateEnum
CREATE TYPE "screening_status" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "booking_type" AS ENUM ('MEMBER', 'GUEST');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CREDIT_CARD', 'QR');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('UNPAID', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "seat_lock_status" AS ENUM ('HELD', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "seat_move_status" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "news_category" AS ENUM ('CAMPAIGN', 'EVENT', 'ANNOUNCEMENT');

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "member_id" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "name" VARCHAR(100) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'MEMBER',
    "visit_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movies" (
    "id" BIGSERIAL NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "title_ja" VARCHAR(200) NOT NULL,
    "title_en" VARCHAR(200),
    "genre" VARCHAR(50),
    "duration_minutes" INTEGER NOT NULL,
    "description" TEXT,
    "poster_image_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "release_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creators" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "role" "creator_role" NOT NULL,
    "image_url" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movie_creators" (
    "movie_id" BIGINT NOT NULL,
    "creator_id" BIGINT NOT NULL,
    "role" "movie_creator_role" NOT NULL,
    "character_name" VARCHAR(100),

    CONSTRAINT "movie_creators_pkey" PRIMARY KEY ("movie_id","creator_id","role")
);

-- CreateTable
CREATE TABLE "theaters" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "theaters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screens" (
    "id" BIGSERIAL NOT NULL,
    "theater_id" BIGINT,
    "screen_number" INTEGER NOT NULL,
    "concept_name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(500),
    "seat_count" INTEGER NOT NULL,

    CONSTRAINT "screens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seats" (
    "id" BIGSERIAL NOT NULL,
    "screen_id" BIGINT NOT NULL,
    "row_label" VARCHAR(2) NOT NULL,
    "seat_number" INTEGER NOT NULL,
    "is_accessible" BOOLEAN NOT NULL DEFAULT false,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screenings" (
    "id" BIGSERIAL NOT NULL,
    "movie_id" BIGINT NOT NULL,
    "screen_id" BIGINT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "format" "screening_format" NOT NULL,
    "status" "screening_status" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screenings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_types" (
    "id" BIGSERIAL NOT NULL,
    "name_ja" VARCHAR(50) NOT NULL,
    "base_price" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "screening_id" BIGINT NOT NULL,
    "booking_number" VARCHAR(30) NOT NULL,
    "booking_type" "booking_type" NOT NULL,
    "guest_name" VARCHAR(100),
    "guest_email" VARCHAR(255),
    "guest_phone" VARCHAR(30),
    "guest_lookup_token_hash" VARCHAR(255),
    "guest_lookup_token_expires_at" TIMESTAMP(3),
    "guest_lookup_token_sent_at" TIMESTAMP(3),
    "total_amount" INTEGER NOT NULL,
    "payment_method" "payment_method",
    "payment_status" "payment_status" NOT NULL DEFAULT 'UNPAID',
    "status" "booking_status" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "checked_in_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_seats" (
    "id" BIGSERIAL NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "screening_id" BIGINT NOT NULL,
    "seat_id" BIGINT NOT NULL,
    "ticket_type_id" BIGINT NOT NULL,
    "unit_price" INTEGER NOT NULL,

    CONSTRAINT "booking_seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screening_seat_locks" (
    "id" BIGSERIAL NOT NULL,
    "screening_id" BIGINT NOT NULL,
    "seat_id" BIGINT NOT NULL,
    "user_id" BIGINT,
    "guest_token_hash" VARCHAR(255),
    "booking_id" BIGINT,
    "status" "seat_lock_status" NOT NULL DEFAULT 'HELD',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screening_seat_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" BIGSERIAL NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "provider_transaction_id" VARCHAR(100),
    "method" "payment_method" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "payment_status" NOT NULL,
    "paid_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "failure_reason" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_move_requests" (
    "id" BIGSERIAL NOT NULL,
    "requester_booking_seat_id" BIGINT,
    "target_booking_seat_id" BIGINT NOT NULL,
    "requester_booking_id" BIGINT NOT NULL,
    "target_booking_id" BIGINT NOT NULL,
    "fee" INTEGER NOT NULL DEFAULT 100,
    "cashback_amount" INTEGER NOT NULL,
    "status" "seat_move_status" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "seat_move_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorites" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "creator_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "favorite_creator_notify" BOOLEAN NOT NULL DEFAULT true,
    "booking_remind_notify" BOOLEAN NOT NULL DEFAULT true,
    "campaign_notify" BOOLEAN NOT NULL DEFAULT true,
    "seat_move_notify" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news" (
    "id" BIGSERIAL NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "body" TEXT,
    "category" "news_category" NOT NULL,
    "thumbnail_url" VARCHAR(500),
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_member_id_key" ON "users"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "movies_slug_key" ON "movies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "screens_screen_number_key" ON "screens"("screen_number");

-- CreateIndex
CREATE UNIQUE INDEX "seats_screen_id_row_label_seat_number_key" ON "seats"("screen_id", "row_label", "seat_number");

-- CreateIndex
CREATE INDEX "screenings_movie_id_start_time_idx" ON "screenings"("movie_id", "start_time");

-- CreateIndex
CREATE INDEX "screenings_screen_id_start_time_end_time_idx" ON "screenings"("screen_id", "start_time", "end_time");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_number_key" ON "bookings"("booking_number");

-- CreateIndex
CREATE INDEX "bookings_user_id_created_at_idx" ON "bookings"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "bookings_guest_email_idx" ON "bookings"("guest_email");

-- CreateIndex
CREATE INDEX "bookings_screening_id_status_idx" ON "bookings"("screening_id", "status");

-- CreateIndex
CREATE INDEX "booking_seats_screening_id_seat_id_idx" ON "booking_seats"("screening_id", "seat_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_seats_booking_id_seat_id_key" ON "booking_seats"("booking_id", "seat_id");

-- CreateIndex
CREATE INDEX "screening_seat_locks_status_expires_at_idx" ON "screening_seat_locks"("status", "expires_at");

-- CreateIndex
CREATE INDEX "screening_seat_locks_booking_id_idx" ON "screening_seat_locks"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "screening_seat_locks_screening_id_seat_id_key" ON "screening_seat_locks"("screening_id", "seat_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_transaction_id_key" ON "payments"("provider_transaction_id");

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "seat_move_requests_requester_booking_id_status_idx" ON "seat_move_requests"("requester_booking_id", "status");

-- CreateIndex
CREATE INDEX "seat_move_requests_target_booking_id_status_idx" ON "seat_move_requests"("target_booking_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorites_user_id_creator_id_key" ON "user_favorites"("user_id", "creator_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_user_id_key" ON "notification_settings"("user_id");

-- AddForeignKey
ALTER TABLE "movie_creators" ADD CONSTRAINT "movie_creators_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movie_creators" ADD CONSTRAINT "movie_creators_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screens" ADD CONSTRAINT "screens_theater_id_fkey" FOREIGN KEY ("theater_id") REFERENCES "theaters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "screens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_screening_id_fkey" FOREIGN KEY ("screening_id") REFERENCES "screenings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_screening_id_fkey" FOREIGN KEY ("screening_id") REFERENCES "screenings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_seat_locks" ADD CONSTRAINT "screening_seat_locks_screening_id_fkey" FOREIGN KEY ("screening_id") REFERENCES "screenings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_seat_locks" ADD CONSTRAINT "screening_seat_locks_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_seat_locks" ADD CONSTRAINT "screening_seat_locks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_seat_locks" ADD CONSTRAINT "screening_seat_locks_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_move_requests" ADD CONSTRAINT "seat_move_requests_requester_booking_seat_id_fkey" FOREIGN KEY ("requester_booking_seat_id") REFERENCES "booking_seats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_move_requests" ADD CONSTRAINT "seat_move_requests_target_booking_seat_id_fkey" FOREIGN KEY ("target_booking_seat_id") REFERENCES "booking_seats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_move_requests" ADD CONSTRAINT "seat_move_requests_requester_booking_id_fkey" FOREIGN KEY ("requester_booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_move_requests" ADD CONSTRAINT "seat_move_requests_target_booking_id_fkey" FOREIGN KEY ("target_booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
