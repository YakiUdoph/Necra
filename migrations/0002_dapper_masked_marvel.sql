ALTER TABLE "document_versions" ADD COLUMN "content_text" text;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "capture_method" text;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "source_documents" ADD COLUMN "source_attribution" text;--> statement-breakpoint
ALTER TABLE "source_documents" ADD COLUMN "source_observed_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "document_versions_project_idempotency_unique" ON "document_versions" USING btree ("project_id","idempotency_key") WHERE "document_versions"."idempotency_key" is not null;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_idempotency_nonempty" CHECK ("document_versions"."idempotency_key" is null or length(trim("document_versions"."idempotency_key")) > 0);--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_pasted_text_consistent" CHECK ("document_versions"."content_text" is null or (
        "document_versions"."capture_method" = 'pasted_text' and
        "document_versions"."media_type" = 'text/plain' and
        "document_versions"."processing_status" = 'ready' and
        "document_versions"."storage_object_key" is null and
        "document_versions"."byte_size" = octet_length("document_versions"."content_text")
      ));--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_attribution_nonempty" CHECK ("source_documents"."source_attribution" is null or length(trim("source_documents"."source_attribution")) > 0);
--> statement-breakpoint
CREATE TRIGGER "source_documents_immutable"
BEFORE UPDATE OR DELETE ON "source_documents"
FOR EACH ROW EXECUTE FUNCTION "necra_reject_row_change"();
