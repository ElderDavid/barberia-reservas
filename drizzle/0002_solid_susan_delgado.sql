CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"customer_id" uuid,
	"kind" text NOT NULL,
	"version" text NOT NULL,
	"channel" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consents_kind" CHECK ("consents"."kind" in ('privacy', 'terms')),
	CONSTRAINT "consents_channel" CHECK ("consents"."channel" in ('registro', 'reserva', 'reacepta'))
);
--> statement-breakpoint
ALTER TABLE "shop_settings" ADD COLUMN "legal_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_settings" ADD COLUMN "legal_id_type" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_settings" ADD COLUMN "legal_id_number" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_settings" ADD COLUMN "privacy_email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'customer' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consents_user" ON "consents" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role" CHECK ("user"."role" in ('owner', 'customer'));