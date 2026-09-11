-- CreateEnum
CREATE TYPE "user_notification_kind" AS ENUM ('AFTER_MOVIE', 'SECOND_MOVIE', 'GENERAL');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "after_movie_notified_at" TIMESTAMP(3),
ADD COLUMN "after_survey_completed_at" TIMESTAMP(3),
ADD COLUMN "after_survey_answers" JSONB;

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "booking_id" BIGINT,
    "kind" "user_notification_kind" NOT NULL DEFAULT 'GENERAL',
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "href" VARCHAR(500),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_notifications_user_id_created_at_idx" ON "user_notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "user_notifications_user_id_read_at_idx" ON "user_notifications"("user_id", "read_at");

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
