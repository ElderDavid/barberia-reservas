-- Hand-written part of the schema: things Drizzle cannot express.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
-- No two held/confirmed bookings of one barber may overlap (buffers included).
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap" EXCLUDE USING gist (
  "barber_id" WITH =,
  tstzrange("blocked_from", "blocked_until", '[)') WITH &&
) WHERE ("status" IN ('held', 'confirmed'));
--> statement-breakpoint
-- Supabase exposes schema public through its Data API; RLS with no policies closes it.
-- The app connects as the table owner, which bypasses RLS.
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "shop_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "barbers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "working_hours" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "time_off" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sales" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "expense_categories" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
