CREATE TABLE "studio"."ideas" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"title" text NOT NULL,
	"description" text,
	"hook" text,
	"format" text,
	"branche" text,
	"status" text DEFAULT 'offen' NOT NULL,
	"source" text DEFAULT 'eigene' NOT NULL,
	"trend" text,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"run_id" integer,
	"video_id" integer,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio"."ideas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio"."materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"folder" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"path" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "materials_path_unique" UNIQUE("path")
);
--> statement-breakpoint
ALTER TABLE "studio"."materials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio"."trend_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"trigger" text DEFAULT 'nacht' NOT NULL,
	"triggered_by" integer,
	"ok" boolean DEFAULT false NOT NULL,
	"error" text,
	"model" text,
	"search_calls" integer DEFAULT 0 NOT NULL,
	"trends" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"idea_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio"."trend_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "studio"."ai_runs" ADD COLUMN "search_calls" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "studio"."clients" ADD COLUMN "material_url" text;--> statement-breakpoint
ALTER TABLE "studio"."scripts" ADD COLUMN "idea_id" integer;--> statement-breakpoint
ALTER TABLE "studio"."ideas" ADD CONSTRAINT "ideas_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "studio"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."ideas" ADD CONSTRAINT "ideas_run_id_trend_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "studio"."trend_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."ideas" ADD CONSTRAINT "ideas_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "studio"."videos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."ideas" ADD CONSTRAINT "ideas_created_by_team_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "studio"."team_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."materials" ADD CONSTRAINT "materials_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "studio"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."materials" ADD CONSTRAINT "materials_created_by_team_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "studio"."team_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio"."trend_runs" ADD CONSTRAINT "trend_runs_triggered_by_team_members_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "studio"."team_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ideas_client_idx" ON "studio"."ideas" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "ideas_status_idx" ON "studio"."ideas" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ideas_run_idx" ON "studio"."ideas" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "ideas_video_idx" ON "studio"."ideas" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "ideas_created_by_idx" ON "studio"."ideas" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "materials_client_idx" ON "studio"."materials" USING btree ("client_id","folder");--> statement-breakpoint
CREATE INDEX "materials_created_by_idx" ON "studio"."materials" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "trend_runs_started_idx" ON "studio"."trend_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "trend_runs_triggered_by_idx" ON "studio"."trend_runs" USING btree ("triggered_by");--> statement-breakpoint
ALTER TABLE "studio"."scripts" ADD CONSTRAINT "scripts_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "studio"."ideas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scripts_idea_idx" ON "studio"."scripts" USING btree ("idea_id");