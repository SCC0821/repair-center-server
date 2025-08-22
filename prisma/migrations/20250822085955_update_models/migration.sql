/*
  Warnings:

  - You are about to drop the column `nickname` on the `User` table. All the data in the column will be lost.
  - The `status` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "nickname",
ADD COLUMN     "userName" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" INTEGER NOT NULL DEFAULT 1;
