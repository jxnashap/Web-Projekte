ALTER TABLE "studio"."videos" ADD COLUMN "scheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "studio"."videos" ADD COLUMN "post_caption" text;--> statement-breakpoint
CREATE INDEX "videos_scheduled_idx" ON "studio"."videos" USING btree ("scheduled_at");