-- CreateEnum
CREATE TYPE "ProfileAssignmentStatus" AS ENUM ('ASSIGNED', 'UNASSIGNED');

-- AlterTable
ALTER TABLE "Player" ADD COLUMN "assignmentStatus" "ProfileAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED';
ALTER TABLE "Player" ALTER COLUMN "organizationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Coach" ADD COLUMN "assignmentStatus" "ProfileAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED';
ALTER TABLE "Coach" ALTER COLUMN "organizationId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Player_assignmentStatus_idx" ON "Player"("assignmentStatus");

-- CreateIndex
CREATE INDEX "Coach_assignmentStatus_idx" ON "Coach"("assignmentStatus");
