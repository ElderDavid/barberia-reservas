CREATE TABLE "loyalty_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"stamps_used" smallint NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"redeemed_by" text,
	CONSTRAINT "loyalty_redemptions_stamps" CHECK ("loyalty_redemptions"."stamps_used" between 1 and 30)
);
--> statement-breakpoint
ALTER TABLE "shop_settings" ADD COLUMN "loyalty_goal" smallint DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_settings" ADD COLUMN "loyalty_reward" text DEFAULT 'Corte gratis' NOT NULL;--> statement-breakpoint
ALTER TABLE "loyalty_redemptions" ADD CONSTRAINT "loyalty_redemptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_redemptions" ADD CONSTRAINT "loyalty_redemptions_redeemed_by_user_id_fk" FOREIGN KEY ("redeemed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "loyalty_redemptions_user" ON "loyalty_redemptions" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "shop_settings" ADD CONSTRAINT "shop_settings_loyalty_goal" CHECK ("shop_settings"."loyalty_goal" between 0 and 30);--> statement-breakpoint
ALTER TABLE "shop_settings" ADD CONSTRAINT "shop_settings_loyalty_reward" CHECK (char_length("shop_settings"."loyalty_reward") between 1 and 60);