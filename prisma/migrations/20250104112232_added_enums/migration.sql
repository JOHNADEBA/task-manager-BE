/*
  Warnings:

  - Changed the type of `status` on the `Task` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `category` on the `Task` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "category" AS ENUM ('Work', 'Personal', 'Home');

-- CreateEnum
CREATE TYPE "status" AS ENUM ('Completed', 'Overdue', 'Pending');

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "status",
ADD COLUMN     "status" "status" NOT NULL,
DROP COLUMN "category",
ADD COLUMN     "category" "category" NOT NULL;
