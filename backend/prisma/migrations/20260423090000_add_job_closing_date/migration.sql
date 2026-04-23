ALTER TABLE "Job" ADD COLUMN "closingDate" TIMESTAMP(3);

UPDATE "Job"
SET "closingDate" = COALESCE("closingDate", "createdAt" + INTERVAL '14 days');

ALTER TABLE "Job" ALTER COLUMN "closingDate" SET NOT NULL;
