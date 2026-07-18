CREATE TYPE "public"."lancamento_type" AS ENUM('debito', 'credito');--> statement-breakpoint
CREATE TABLE "lancamentos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "lancamento_type" NOT NULL,
	"nome" varchar(255) NOT NULL,
	"detalhes" text,
	"valor" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settlement_lancamentos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settlement_id" varchar NOT NULL,
	"lancamento_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "settlement_lancamentos" ADD CONSTRAINT "settlement_lancamentos_settlement_id_expense_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."expense_settlements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_lancamentos" ADD CONSTRAINT "settlement_lancamentos_lancamento_id_lancamentos_id_fk" FOREIGN KEY ("lancamento_id") REFERENCES "public"."lancamentos"("id") ON DELETE cascade ON UPDATE no action;