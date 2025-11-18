-- CreateTable
CREATE TABLE "SecurityAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SecurityAudit_userId_idx" ON "SecurityAudit"("userId");

-- CreateIndex
CREATE INDEX "SecurityAudit_createdAt_idx" ON "SecurityAudit"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityAudit_action_idx" ON "SecurityAudit"("action");
