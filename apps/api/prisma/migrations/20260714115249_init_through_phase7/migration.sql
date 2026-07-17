/*
  Warnings:

  - A unique constraint covering the columns `[postId,userId]` on the table `likes` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "likes_postId_userId_emoji_key";

-- AlterTable
ALTER TABLE "comment_likes" ADD COLUMN     "emoji" TEXT NOT NULL DEFAULT '❤️';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "commentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "likes_postId_userId_key" ON "likes"("postId", "userId");
