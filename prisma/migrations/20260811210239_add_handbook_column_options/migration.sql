-- AlterTable
ALTER TABLE "handbook_columns" ADD COLUMN     "options" TEXT[] DEFAULT ARRAY[]::TEXT[];
