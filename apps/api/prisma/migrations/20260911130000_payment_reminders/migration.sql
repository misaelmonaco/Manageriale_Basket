-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "remindedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Payment_status_dueDate_remindedAt_idx" ON "Payment"("status", "dueDate", "remindedAt");
