-- Add phoneNumber to User (missed in migration history)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;

-- Add fileId to AccessGrant (missed in migration history)
ALTER TABLE "AccessGrant" ADD COLUMN IF NOT EXISTS "fileId" TEXT;

-- Create ChatMessage table
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "conversationKey" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- Index on conversationKey for fast thread lookup
CREATE INDEX "ChatMessage_conversationKey_idx" ON "ChatMessage"("conversationKey");

-- Index on receiverId + isRead for unread count
CREATE INDEX "ChatMessage_receiverId_isRead_idx" ON "ChatMessage"("receiverId", "isRead");

-- AddForeignKey for sender
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey for receiver
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey for fileId on AccessGrant (nullable)
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create unique index on AccessGrant (replaces old one)
DROP INDEX IF EXISTS "AccessGrant_medicalRecordId_doctorId_category_key";
CREATE UNIQUE INDEX "AccessGrant_medicalRecordId_doctorId_category_fileId_key" ON "AccessGrant"("medicalRecordId", "doctorId", "category", "fileId");
