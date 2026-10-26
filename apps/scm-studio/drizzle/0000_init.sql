CREATE SCHEMA "studio";
--> statement-breakpoint
CREATE TABLE "studio"."ai_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" integer,
	"purpose" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"cached_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"reasoning_tokens" integer DEFAULT 0 NOT NULL,
	"ok" boolean DEFAULT true NOT NULL,
	"error" text,
	"script_id" integer
);
--> statement-breakpoint
ALTER TABLE "studio"."ai_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio"."audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" integer,
	"entity" text NOT NULL,
	"entity_id" integer,
	"action" text NOT NULL,
	"detail" jsonb,
	"hash" text
);
--> statement-breakpoint
ALTER TABLE "studio"."audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio"."clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"branche" text DEFAULT 'unternehmen' NOT NULL,
	"status" text DEFAULT 'aktiv' NOT NULL,
	"ort" text,
	"street" text,
	"zip" text,
	"city" text,
	"contact_name" text,
	"email" text,
	"phone" text,
	"vat_id" text,
	"tax_number" text,
	"legal_form" text,
	"is_merchant" boolean DEFAULT false NOT NULL,
	"register_number" text,
	"signatory_name" text,
	"signatory_role" text,
	"buyer_reference" text,
	"website" text,
	"instagram" text,
	"tiktok" text,
	"package_videos" integer,
	"package_price_cents" integer,
	"start_date" date,
	"notes" text,
	"color" text DEFAULT '#E1251B' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio"."clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio"."documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"client_id" integer,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'entwurf' NOT NULL,
	"signer_name" text,
	"signed_at" timestamp with time zone,
	"signature" jsonb,
	"sign_meta" jsonb,
	"revoked_at" timestamp with time zone,
	"revoke_note" text,
	"template_version" text,
	"file_id" integer,
	"content_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio"."documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio"."events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'dreh' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"location" text,
	"client_id" integer,
	"lead_id" integer,
	"team_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"notes" text,
	"google_event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio"."events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio"."expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"supplier" text NOT NULL,
	"description" text NOT NULL,
	"category" text DEFAULT 'sonstiges' NOT NULL,
	"net_cents" integer NOT NULL,
	"tax_rate" real DEFAULT 19 NOT NULL,
	"tax_cents" integer NOT NULL,
	"gross_cents" integer NOT NULL,
	"reverse_charge" boolean DEFAULT false NOT NULL,
	"supplier_invoice_no" text,
	"payment_method" text,
	"paid_on" date,
	"client_id" integer,
	"file_id" integer,
	"receipt_name" text,
	"notes" text,
	"exported_at" timestamp with time zone,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio"."expenses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio"."files" (
	"id" serial PRIMARY KEY NOT NULL,
	"bucket" text NOT NULL,
	"path" text NOT NULL,
	"name" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"sha256" text NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_path_unique" UNIQUE("path")
);
--> statement-breakpoint
ALTER TABLE "studio"."files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio"."invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"position" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" real DEFAULT 1 NOT NULL,
	"unit" text DEFAULT 'Stück' NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"tax_rate" real DEFAULT 19 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio"."invoice_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio"."invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text DEFAULT 'rechnung' NOT NULL,
	"number" text,
	"status" text DEFAULT 'entwurf' NOT NULL,
	"client_id" integer,
	"recipient" jsonb,
	"title" text DEFAULT 'Rechnung' NOT NULL,
	"issue_date" date,
	"service_from" date,
	"service_to" date,
	"due_date" date,
	"valid_until" date,
	"intro" text,
	"outro" text,
	"net_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"gross_cents" integer DEFAULT 0 NOT NULL,
	"cancels_id" integer,
	"from_offer_id" integer,
	"buyer_reference" text,
	"notes" text,
	"finalized_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"paid_at" date,
	"dunning_level" integer DEFAULT 0 NOT NULL,
	"last_dunning_at" date,
	"file_id" integer,
	"content_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio"."invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio"."leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"company" text NOT NULL,
	"branche" text,
	"ort" text,
	"phone" text,
	"email" text,
	"contact_way" text,
	"source" text DEFAULT 'website' NOT NULL,
	"package_interest" text,
	"start_wish" text,
	"message" text,
	"answers" jsonb,
	"lost_reason" text,
	"stage" text DEFAULT 'neu' NOT NULL,
	"score" text,
	"next_step" text,
	"next_step_at" date,
	"notes" text,
	"client_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio"."leads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio"."number_sequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"year" integer NOT NULL,
	"next" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio"."number_sequences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio"."scripts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"video_id" integer,
	"title" text NOT NULL,
	"format" text,
	"hook" text,
	"beats" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"caption" text,
	"cta" text,
	"status" text DEFAULT 'entwurf' NOT NULL,
	"source" text DEFAULT 'manuell' NOT NULL,
	"model" text,
	"briefing" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio"."scripts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio"."settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio"."settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio"."social_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"platform" text NOT NULL,
	"username" text,
	"external_user_id" text,
	"status" text DEFAULT 'nicht_verbunden' NOT NULL,
	"access_token_enc" text,
	"refresh_token_enc" text,
	"token_expires_at" timestamp with time zone,
	"scopes" text,
	"connected_at" timestamp with time zone,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio"."social_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio"."team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'team' NOT NULL,
	"initials" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"auth_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_members_email_unique" UNIQUE("email"),
	CONSTRAINT "team_members_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
ALTER TABLE "studio"."team_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio"."video_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_id" integer NOT NULL,
	"measured_on" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"reach" integer,
	"likes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"shares" integer,
	"saves" integer,
	"avg_watch_seconds" real,
	"total_watch_seconds" real,
	"total_interactions" integer,
	"extra" jsonb,
	"source" text DEFAULT 'manuell' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio"."video_metrics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio"."videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" text NOT NULL,
	"format" text,
	"status" text DEFAULT 'idee' NOT NULL,
	"month" text NOT NULL,
	"is_test" boolean DEFAULT false NOT NULL,
	"shoot_date" date,
	"post_date" date,
	"platform" text DEFAULT 'instagram',
	"url" text,
	"external_media_id" text,
	"script_id" integer,
	"assignee" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio"."videos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "studio"."documents" ADD CONSTRAINT "documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "studio"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."events" ADD CONSTRAINT "events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "studio"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."events" ADD CONSTRAINT "events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "studio"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."expenses" ADD CONSTRAINT "expenses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "studio"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "studio"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "studio"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."leads" ADD CONSTRAINT "leads_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "studio"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."scripts" ADD CONSTRAINT "scripts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "studio"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."scripts" ADD CONSTRAINT "scripts_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "studio"."videos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."scripts" ADD CONSTRAINT "scripts_created_by_team_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "studio"."team_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."social_accounts" ADD CONSTRAINT "social_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "studio"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."video_metrics" ADD CONSTRAINT "video_metrics_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "studio"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."videos" ADD CONSTRAINT "videos_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "studio"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."videos" ADD CONSTRAINT "videos_assignee_team_members_id_fk" FOREIGN KEY ("assignee") REFERENCES "studio"."team_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "studio"."audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "clients_status_idx" ON "studio"."clients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "documents_kind_idx" ON "studio"."documents" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "events_start_idx" ON "studio"."events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "studio"."expenses" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number_uq" ON "studio"."invoices" USING btree ("kind","number");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "studio"."invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_stage_idx" ON "studio"."leads" USING btree ("stage");--> statement-breakpoint
CREATE UNIQUE INDEX "seq_kind_year_uq" ON "studio"."number_sequences" USING btree ("kind","year");--> statement-breakpoint
CREATE UNIQUE INDEX "metrics_video_day_uq" ON "studio"."video_metrics" USING btree ("video_id","measured_on","source");--> statement-breakpoint
CREATE INDEX "videos_client_idx" ON "studio"."videos" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "videos_month_idx" ON "studio"."videos" USING btree ("month");