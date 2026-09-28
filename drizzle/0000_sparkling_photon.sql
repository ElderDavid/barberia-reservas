CREATE TYPE "public"."booking_payment_method" AS ENUM('cash', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('held', 'confirmed', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."cancel_actor" AS ENUM('customer', 'owner', 'system');--> statement-breakpoint
CREATE TYPE "public"."deposit_status" AS ENUM('none', 'pending', 'paid', 'applied', 'transferred', 'refund_pending', 'refunded', 'forfeited');--> statement-breakpoint
CREATE TYPE "public"."money_method" AS ENUM('cash', 'nequi', 'daviplata', 'card', 'transfer', 'wompi');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."sale_kind" AS ENUM('deposit', 'balance', 'walk_in', 'refund');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "barbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barber_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"blocked_from" timestamp with time zone NOT NULL,
	"blocked_until" timestamp with time zone NOT NULL,
	"status" "booking_status" NOT NULL,
	"payment_method" "booking_payment_method" NOT NULL,
	"price_cop" integer NOT NULL,
	"deposit_cop" integer DEFAULT 0 NOT NULL,
	"deposit_status" "deposit_status" DEFAULT 'none' NOT NULL,
	"manage_token_hash" text NOT NULL,
	"hold_expires_at" timestamp with time zone,
	"rescheduled_from_id" uuid,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" "cancel_actor",
	"cancel_reason" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_manage_token_hash_unique" UNIQUE("manage_token_hash"),
	CONSTRAINT "bookings_time_range" CHECK ("bookings"."ends_at" > "bookings"."starts_at"),
	CONSTRAINT "bookings_blocked_range" CHECK ("bookings"."blocked_from" <= "bookings"."starts_at" and "bookings"."blocked_until" >= "bookings"."ends_at"),
	CONSTRAINT "bookings_deposit" CHECK ("bookings"."deposit_cop" between 0 and "bookings"."price_cop"),
	CONSTRAINT "bookings_hold" CHECK ("bookings"."status" <> 'held' or "bookings"."hold_expires_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"amount_cop" integer NOT NULL,
	"spent_on" date NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"method" "money_method" DEFAULT 'cash' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount" CHECK ("expenses"."amount_cop" > 0)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"amount_cop" integer NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"wompi_transaction_id" text,
	"last_event_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_reference_unique" UNIQUE("reference"),
	CONSTRAINT "payments_wompi_transaction_id_unique" UNIQUE("wompi_transaction_id")
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid,
	"barber_id" uuid,
	"service_id" uuid,
	"kind" "sale_kind" NOT NULL,
	"method" "money_method" NOT NULL,
	"amount_cop" integer NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_amount_sign" CHECK (("sales"."kind" = 'refund') = ("sales"."amount_cop" < 0) and "sales"."amount_cop" <> 0)
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"duration_minutes" smallint NOT NULL,
	"price_cop" integer NOT NULL,
	"buffer_after_minutes" smallint DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_duration" CHECK ("services"."duration_minutes" between 10 and 240),
	CONSTRAINT "services_price" CHECK ("services"."price_cop" > 0),
	CONSTRAINT "services_buffer" CHECK ("services"."buffer_after_minutes" between 0 and 60)
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "shop_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'America/Bogota' NOT NULL,
	"whatsapp_phone" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"deposit_percent" smallint DEFAULT 100 NOT NULL,
	"self_service_cutoff_hours" smallint DEFAULT 4 NOT NULL,
	"hold_minutes" smallint DEFAULT 15 NOT NULL,
	"slot_interval_minutes" smallint DEFAULT 15 NOT NULL,
	"min_notice_minutes" smallint DEFAULT 60 NOT NULL,
	"max_advance_days" smallint DEFAULT 30 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_settings_singleton" CHECK ("shop_settings"."id" = 1),
	CONSTRAINT "shop_settings_deposit_percent" CHECK ("shop_settings"."deposit_percent" between 10 and 100),
	CONSTRAINT "shop_settings_cutoff_hours" CHECK ("shop_settings"."self_service_cutoff_hours" between 3 and 5),
	CONSTRAINT "shop_settings_hold_minutes" CHECK ("shop_settings"."hold_minutes" between 10 and 30)
);
--> statement-breakpoint
CREATE TABLE "time_off" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barber_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	CONSTRAINT "time_off_range" CHECK ("time_off"."ends_at" > "time_off"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "working_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barber_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	CONSTRAINT "working_hours_weekday" CHECK ("working_hours"."weekday" between 0 and 6),
	CONSTRAINT "working_hours_range" CHECK ("working_hours"."end_time" > "working_hours"."start_time")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "public"."barbers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_rescheduled_from_id_bookings_id_fk" FOREIGN KEY ("rescheduled_from_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "public"."barbers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "public"."barbers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "public"."barbers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_barber_starts" ON "bookings" USING btree ("barber_id","starts_at");--> statement-breakpoint
CREATE INDEX "bookings_customer" ON "bookings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "bookings_status_hold" ON "bookings" USING btree ("status","hold_expires_at");--> statement-breakpoint
CREATE INDEX "expenses_spent_on" ON "expenses" USING btree ("spent_on");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_booking_kind" ON "sales" USING btree ("booking_id","kind") WHERE "sales"."booking_id" is not null;--> statement-breakpoint
CREATE INDEX "sales_occurred_at" ON "sales" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "time_off_starts_at" ON "time_off" USING btree ("starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "working_hours_barber_day_start" ON "working_hours" USING btree ("barber_id","weekday","start_time");