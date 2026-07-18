ALTER TYPE "public"."expense_settlement_status" ADD VALUE 'enviado_nfs' BEFORE 'assinado';--> statement-breakpoint
ALTER TYPE "public"."expense_settlement_status" ADD VALUE 'concluido';--> statement-breakpoint
CREATE TABLE "damage_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" varchar NOT NULL,
	"transport_id" varchar,
	"vehicle_chassi" varchar,
	"damage_type_id" varchar NOT NULL,
	"description" text,
	"photo_url" text NOT NULL,
	"latitude" text,
	"longitude" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "damage_types" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'quebra' NOT NULL,
	"brand" text,
	"description" text,
	"cost_leve" numeric(12, 2) DEFAULT '0',
	"cost_media" numeric(12, 2) DEFAULT '0',
	"cost_grave" numeric(12, 2) DEFAULT '0',
	"cost_critica" numeric(12, 2) DEFAULT '0',
	"cost_part" numeric(12, 2) DEFAULT '0',
	"is_active" text DEFAULT 'true',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "expense_settlements" ADD COLUMN "nfs_file_url" text;--> statement-breakpoint
ALTER TABLE "expense_settlements" ADD COLUMN "nfs_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "expense_settlements" ADD COLUMN "autentique_doc_id" varchar;--> statement-breakpoint
ALTER TABLE "expense_settlements" ADD COLUMN "autentique_status" varchar(50);--> statement-breakpoint
ALTER TABLE "expense_settlements" ADD COLUMN "autentique_original_url" text;--> statement-breakpoint
ALTER TABLE "expense_settlements" ADD COLUMN "autentique_signed_url" text;--> statement-breakpoint
ALTER TABLE "expense_settlements" ADD COLUMN "autentique_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "expense_settlements" ADD COLUMN "autentique_signed_at" timestamp;--> statement-breakpoint
ALTER TABLE "yards" ADD COLUMN "has_portaria" text DEFAULT 'true' NOT NULL;