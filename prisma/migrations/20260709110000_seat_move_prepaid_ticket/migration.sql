-- AlterTable
ALTER TABLE "seat_move_requests" ADD COLUMN "prepaid_ticket_type_id" BIGINT,
ADD COLUMN "prepaid_unit_price" INTEGER;

-- AddForeignKey
ALTER TABLE "seat_move_requests" ADD CONSTRAINT "seat_move_requests_prepaid_ticket_type_id_fkey" FOREIGN KEY ("prepaid_ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
