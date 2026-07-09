-- 座席譲渡リクエスト: 予約確定前の依頼者対応
ALTER TABLE "seat_move_requests" ADD COLUMN "requester_user_id" TEXT;
ALTER TABLE "seat_move_requests" ADD COLUMN "screening_id" BIGINT;

UPDATE "seat_move_requests" smr
SET "screening_id" = b."screening_id"
FROM "bookings" b
WHERE smr."target_booking_id" = b."id"
  AND smr."screening_id" IS NULL;

UPDATE "seat_move_requests" smr
SET "requester_user_id" = b."user_id"
FROM "bookings" b
WHERE smr."requester_booking_id" = b."id"
  AND smr."requester_user_id" IS NULL
  AND b."user_id" IS NOT NULL;

ALTER TABLE "seat_move_requests" ALTER COLUMN "screening_id" SET NOT NULL;
ALTER TABLE "seat_move_requests" ALTER COLUMN "requester_booking_id" DROP NOT NULL;

ALTER TABLE "seat_move_requests" ADD CONSTRAINT "seat_move_requests_requester_user_id_fkey"
  FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "seat_move_requests" ADD CONSTRAINT "seat_move_requests_screening_id_fkey"
  FOREIGN KEY ("screening_id") REFERENCES "screenings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "seat_move_requests_requester_user_id_screening_id_status_idx"
  ON "seat_move_requests"("requester_user_id", "screening_id", "status");

CREATE INDEX "seat_move_requests_target_booking_seat_id_status_idx"
  ON "seat_move_requests"("target_booking_seat_id", "status");
