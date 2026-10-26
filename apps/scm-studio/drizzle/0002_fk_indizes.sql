CREATE INDEX "documents_client_idx" ON "studio"."documents" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "events_client_idx" ON "studio"."events" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "events_lead_idx" ON "studio"."events" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "expenses_client_idx" ON "studio"."expenses" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "invoice_items_invoice_idx" ON "studio"."invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoices_client_idx" ON "studio"."invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "leads_client_idx" ON "studio"."leads" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "scripts_client_idx" ON "studio"."scripts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "scripts_video_idx" ON "studio"."scripts" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "scripts_created_by_idx" ON "studio"."scripts" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "social_accounts_client_idx" ON "studio"."social_accounts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "videos_assignee_idx" ON "studio"."videos" USING btree ("assignee");