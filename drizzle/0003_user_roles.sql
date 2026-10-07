-- Before customer sign-up existed, every user was the owner.
UPDATE "user" SET "role" = 'owner';--> statement-breakpoint
ALTER TABLE "consents" ENABLE ROW LEVEL SECURITY;
