-- Add owner reference for key results
ALTER TABLE "KeyResult"
ADD COLUMN "ownerMembershipId" TEXT;

UPDATE "KeyResult" kr
SET "ownerMembershipId" = o."ownerMembershipId"
FROM "Objective" o
WHERE kr."objectiveId" = o."id";

ALTER TABLE "KeyResult"
ALTER COLUMN "ownerMembershipId" SET NOT NULL;

ALTER TABLE "KeyResult"
ADD CONSTRAINT "KeyResult_ownerMembershipId_fkey"
FOREIGN KEY ("ownerMembershipId") REFERENCES "Membership"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
