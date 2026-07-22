/*
  Warnings:

  - You are about to drop the column `export_permission` on the `handbooks` table. All the data in the column will be lost.
  - You are about to drop the column `show_change_history` on the `handbooks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "handbooks" DROP COLUMN "export_permission",
DROP COLUMN "show_change_history";

-- DropEnum
DROP TYPE "HandbookPermission";

-- CreateTable
CREATE TABLE "handbook_favorites" (
    "handbook_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handbook_favorites_pkey" PRIMARY KEY ("handbook_id","user_id")
);

-- CreateIndex
CREATE INDEX "handbook_favorites_user_id_idx" ON "handbook_favorites"("user_id");

-- AddForeignKey
ALTER TABLE "handbook_favorites" ADD CONSTRAINT "handbook_favorites_handbook_id_fkey" FOREIGN KEY ("handbook_id") REFERENCES "handbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
