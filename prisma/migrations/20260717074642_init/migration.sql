-- CreateEnum
CREATE TYPE "HandbookVisibility" AS ENUM ('EVERYONE', 'OWNER_ONLY', 'SELECTED_USERS');

-- CreateEnum
CREATE TYPE "HandbookPermission" AS ENUM ('OWNER_ONLY', 'EDITORS');

-- CreateEnum
CREATE TYPE "HandbookColumnType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE');

-- CreateTable
CREATE TABLE "handbooks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "system_name" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "owner_id" TEXT NOT NULL,
    "visibility" "HandbookVisibility" NOT NULL DEFAULT 'OWNER_ONLY',
    "editing_permission" "HandbookPermission" NOT NULL DEFAULT 'OWNER_ONLY',
    "export_permission" "HandbookPermission" NOT NULL DEFAULT 'OWNER_ONLY',
    "show_change_history" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "handbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handbook_columns" (
    "id" TEXT NOT NULL,
    "handbook_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "HandbookColumnType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "handbook_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handbook_editors" (
    "handbook_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handbook_editors_pkey" PRIMARY KEY ("handbook_id","user_id")
);

-- CreateTable
CREATE TABLE "handbook_viewers" (
    "handbook_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handbook_viewers_pkey" PRIMARY KEY ("handbook_id","user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "handbooks_system_name_key" ON "handbooks"("system_name");

-- CreateIndex
CREATE INDEX "handbooks_owner_id_idx" ON "handbooks"("owner_id");

-- CreateIndex
CREATE INDEX "handbook_columns_handbook_id_idx" ON "handbook_columns"("handbook_id");

-- CreateIndex
CREATE UNIQUE INDEX "handbook_columns_handbook_id_position_key" ON "handbook_columns"("handbook_id", "position");

-- CreateIndex
CREATE INDEX "handbook_editors_user_id_idx" ON "handbook_editors"("user_id");

-- CreateIndex
CREATE INDEX "handbook_viewers_user_id_idx" ON "handbook_viewers"("user_id");

-- AddForeignKey
ALTER TABLE "handbook_columns" ADD CONSTRAINT "handbook_columns_handbook_id_fkey" FOREIGN KEY ("handbook_id") REFERENCES "handbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handbook_editors" ADD CONSTRAINT "handbook_editors_handbook_id_fkey" FOREIGN KEY ("handbook_id") REFERENCES "handbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handbook_viewers" ADD CONSTRAINT "handbook_viewers_handbook_id_fkey" FOREIGN KEY ("handbook_id") REFERENCES "handbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
