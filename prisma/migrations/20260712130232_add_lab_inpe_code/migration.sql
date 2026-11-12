-- CreateEnum
CREATE TYPE "Section" AS ENUM ('ANALYSIS', 'PRESCRIPTION', 'DIAGNOSIS');

-- AlterEnum
ALTER TYPE "AccessStatus" ADD VALUE 'EXPIRED';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'BREAK_GLASS_ACCESS';

-- AlterTable
ALTER TABLE "AccessGrant" ADD COLUMN     "scope" "Section"[] DEFAULT ARRAY[]::"Section"[];

-- AlterTable
ALTER TABLE "Lab" ADD COLUMN     "inpeCode" TEXT;

-- CreateTable
CREATE TABLE "BreakGlassLog" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "medicalRecordId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BreakGlassLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BreakGlassLog" ADD CONSTRAINT "BreakGlassLog_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakGlassLog" ADD CONSTRAINT "BreakGlassLog_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
