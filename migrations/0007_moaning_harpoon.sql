CREATE TABLE "contract_send_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar NOT NULL,
	"driver_id" varchar NOT NULL,
	"contract_number" varchar(50),
	"autentique_doc_id" varchar,
	"autentique_status" varchar(50),
	"autentique_original_url" text,
	"autentique_signed_url" text,
	"sent_at" timestamp DEFAULT now(),
	"signed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "contract_drivers" ADD COLUMN "contract_number" varchar(50);--> statement-breakpoint
ALTER TABLE "contract_send_history" ADD CONSTRAINT "contract_send_history_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_send_history" ADD CONSTRAINT "contract_send_history_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;