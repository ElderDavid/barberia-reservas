CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"rating" smallint NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"owner_reply" text,
	"replied_at" timestamp with time zone,
	"hidden_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_booking_id_unique" UNIQUE("booking_id"),
	CONSTRAINT "reviews_rating" CHECK ("reviews"."rating" between 1 and 5),
	CONSTRAINT "reviews_comment" CHECK (char_length("reviews"."comment") <= 500),
	CONSTRAINT "reviews_owner_reply" CHECK (char_length("reviews"."owner_reply") <= 500)
);
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reviews_user" ON "reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reviews_created" ON "reviews" USING btree ("created_at");