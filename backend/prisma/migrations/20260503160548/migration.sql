/*
  Warnings:

  - You are about to drop the column `tittle` on the `Conversation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `supabaseId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "tittle",
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "supabaseId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
