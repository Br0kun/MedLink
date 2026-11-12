/*
  Warnings:

  - The `specialty` column on the `Doctor` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[medicalRecordId,doctorId,category]` on the table `AccessGrant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Specialty" AS ENUM ('GENERAL', 'CARDIOLOGY', 'NEUROLOGY', 'DERMATOLOGY', 'PEDIATRICS', 'ONCOLOGY', 'OPHTHALMOLOGY', 'PSYCHIATRY', 'ORTHOPEDICS', 'OTHER');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('ROUTINE', 'URGENT', 'CRITICAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'RESULT_ESCALATED';
ALTER TYPE "NotificationType" ADD VALUE 'ACCOUNT_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'ACCOUNT_REJECTED';

-- DropIndex
DROP INDEX "AccessGrant_medicalRecordId_doctorId_key";

-- AlterTable
ALTER TABLE "AccessGrant" ADD COLUMN     "category" "Specialty";

-- AlterTable
ALTER TABLE "Analysis" ADD COLUMN     "category" "Specialty" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "isReviewed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'ROUTINE',
ADD COLUMN     "reviewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Diagnosis" ADD COLUMN     "category" "Specialty" NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "customSpecialty" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "specialty",
ADD COLUMN     "specialty" "Specialty" NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "Lab" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "category" "Specialty" NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "AccessGrant_medicalRecordId_doctorId_category_key" ON "AccessGrant"("medicalRecordId", "doctorId", "category");
