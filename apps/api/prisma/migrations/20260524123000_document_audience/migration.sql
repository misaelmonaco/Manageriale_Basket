-- CreateEnum
CREATE TYPE "DocumentAudience" AS ENUM ('DIRECTORS', 'COACHES', 'PLAYERS', 'COACHES_PLAYERS', 'ALL');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "audience" "DocumentAudience" NOT NULL DEFAULT 'DIRECTORS';

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Document_organizationId_audience_idx" ON "Document"("organizationId", "audience");

-- CreateIndex
CREATE INDEX "Document_uploadedById_idx" ON "Document"("uploadedById");
