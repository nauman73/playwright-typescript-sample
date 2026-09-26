CREATE TYPE "public"."showing_status" AS ENUM('booked', 'cancelled');--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" text NOT NULL,
	"bedrooms" integer NOT NULL,
	"monthly_rent" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"prospect_name" text NOT NULL,
	"prospect_email" text NOT NULL,
	"prospect_phone" text NOT NULL,
	"status" "showing_status" DEFAULT 'booked' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"showing_id" uuid NOT NULL,
	"to_number" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "showings" ADD CONSTRAINT "showings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_outbox" ADD CONSTRAINT "sms_outbox_showing_id_showings_id_fk" FOREIGN KEY ("showing_id") REFERENCES "public"."showings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "showings_property_slot_booked" ON "showings" USING btree ("property_id","starts_at") WHERE "showings"."status" = 'booked';