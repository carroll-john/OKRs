-- Add lightweight initiatives linked to key results.
CREATE TYPE "InitiativeStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE');

CREATE TABLE "Initiative" (
  "id" TEXT NOT NULL,
  "keyResultId" TEXT NOT NULL,
  "ownerMembershipId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" "InitiativeStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "dueDate" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Initiative_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Initiative"
ADD CONSTRAINT "Initiative_keyResultId_fkey"
FOREIGN KEY ("keyResultId") REFERENCES "KeyResult"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Initiative"
ADD CONSTRAINT "Initiative_ownerMembershipId_fkey"
FOREIGN KEY ("ownerMembershipId") REFERENCES "Membership"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
