/*
  Warnings:

  - The `editing_permission` column on the `handbooks` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "HandbookEditingAccess" AS ENUM ('OWNER_ONLY', 'SELECTED_EDITORS', 'EVERYONE_WITH_ACCESS');

-- AlterTable
ALTER TABLE "handbooks" DROP COLUMN "editing_permission",
ADD COLUMN     "editing_permission" "HandbookEditingAccess" NOT NULL DEFAULT 'OWNER_ONLY';
