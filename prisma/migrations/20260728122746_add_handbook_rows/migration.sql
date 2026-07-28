-- CreateTable
CREATE TABLE "handbook_rows" (
    "id" TEXT NOT NULL,
    "handbook_id" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "handbook_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "handbook_rows_handbook_id_created_at_idx" ON "handbook_rows"("handbook_id", "created_at");

-- AddForeignKey
ALTER TABLE "handbook_rows" ADD CONSTRAINT "handbook_rows_handbook_id_fkey" FOREIGN KEY ("handbook_id") REFERENCES "handbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
