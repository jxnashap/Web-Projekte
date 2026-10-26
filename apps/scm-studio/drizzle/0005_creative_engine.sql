ALTER TABLE "studio"."clients" ADD COLUMN "creative_profile" jsonb;--> statement-breakpoint
ALTER TABLE "studio"."ideas" ADD COLUMN "categories" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "studio"."ideas" ADD COLUMN "goal" text;--> statement-breakpoint
ALTER TABLE "studio"."ideas" ADD COLUMN "mechanic" text;--> statement-breakpoint
ALTER TABLE "studio"."ideas" ADD COLUMN "scores" jsonb;--> statement-breakpoint
ALTER TABLE "studio"."ideas" ADD COLUMN "production" jsonb;--> statement-breakpoint
ALTER TABLE "studio"."scripts" ADD COLUMN "categories" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "studio"."scripts" ADD COLUMN "goal" text;--> statement-breakpoint
ALTER TABLE "studio"."scripts" ADD COLUMN "duration_seconds" integer;--> statement-breakpoint
ALTER TABLE "studio"."scripts" ADD COLUMN "concept" text;--> statement-breakpoint
ALTER TABLE "studio"."scripts" ADD COLUMN "production" jsonb;--> statement-breakpoint
ALTER TABLE "studio"."scripts" ADD COLUMN "alternatives" jsonb;