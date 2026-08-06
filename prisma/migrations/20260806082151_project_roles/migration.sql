/*
  Warnings:

  - You are about to drop the column `axis` on the `projects` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "projects" DROP COLUMN "axis",
ADD COLUMN     "from_role" TEXT,
ADD COLUMN     "to_role" TEXT;
