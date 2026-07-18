CREATE TABLE "expense_settlement_damages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settlement_id" varchar NOT NULL,
	"damage_type_id" varchar NOT NULL,
	"severity" varchar(20) DEFAULT 'leve' NOT NULL,
	"vehicle_chassi" varchar,
	"include_in_cost" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "routes" ALTER COLUMN "destination_location_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transport_proposals" ALTER COLUMN "client_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transport_proposals" ALTER COLUMN "delivery_location_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transports" ALTER COLUMN "delivery_location_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "damage_reports" ADD COLUMN "repair_cost" numeric;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "destination_type" varchar(10) DEFAULT 'location' NOT NULL;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "destination_yard_id" varchar;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "waypoints" jsonb;--> statement-breakpoint
ALTER TABLE "transport_proposals" ADD COLUMN "destination_type" varchar(10) DEFAULT 'location' NOT NULL;--> statement-breakpoint
ALTER TABLE "transport_proposals" ADD COLUMN "destination_yard_id" varchar;--> statement-breakpoint
ALTER TABLE "transports" ADD COLUMN "destination_type" varchar(10) DEFAULT 'client' NOT NULL;--> statement-breakpoint
ALTER TABLE "transports" ADD COLUMN "destination_yard_id" varchar;--> statement-breakpoint
ALTER TABLE "expense_settlement_damages" ADD CONSTRAINT "expense_settlement_damages_settlement_id_expense_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."expense_settlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_settlement_damages" ADD CONSTRAINT "expense_settlement_damages_damage_type_id_damage_types_id_fk" FOREIGN KEY ("damage_type_id") REFERENCES "public"."damage_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_destination_yard_id_yards_id_fk" FOREIGN KEY ("destination_yard_id") REFERENCES "public"."yards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_proposals" ADD CONSTRAINT "transport_proposals_destination_yard_id_yards_id_fk" FOREIGN KEY ("destination_yard_id") REFERENCES "public"."yards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transports" ADD CONSTRAINT "transports_destination_yard_id_yards_id_fk" FOREIGN KEY ("destination_yard_id") REFERENCES "public"."yards"("id") ON DELETE no action ON UPDATE no action;