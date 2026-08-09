-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "HandbookColumnType" ADD VALUE 'LIST';
ALTER TYPE "HandbookColumnType" ADD VALUE 'USER';
ALTER TYPE "HandbookColumnType" ADD VALUE 'REFERENCE';
ALTER TYPE "HandbookColumnType" ADD VALUE 'FORMATTED_STRING';
