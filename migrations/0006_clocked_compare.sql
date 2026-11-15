CREATE TABLE "analysis_compare_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "analysis_run_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "agreement_version_id" uuid NOT NULL,
  "instruction_version_id" uuid NOT NULL,
  "provider_idempotency_key" uuid NOT NULL,
  "request_hash" varchar(64) NOT NULL,
  "status" text NOT NULL,
  "model" text,
  "response_hash" varchar(64),
  "raw_response" jsonb,
  "transport_metadata" jsonb,
  "failure_code" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "completed_at" timestamptz,
  CONSTRAINT "analysis_compare_one_per_run" UNIQUE ("analysis_run_id"),
  CONSTRAINT "analysis_compare_provider_key_unique" UNIQUE ("provider_idempotency_key"),
  CONSTRAINT "analysis_compare_run_scope_fk" FOREIGN KEY ("analysis_run_id", "project_id", "workspace_id") REFERENCES "analysis_runs" ("id", "project_id", "workspace_id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "analysis_compare_status_valid" CHECK ("status" IN ('running','completed','failed','outcome_unknown')),
  CONSTRAINT "analysis_compare_request_hash_valid" CHECK ("request_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "analysis_compare_result_shape_valid" CHECK (
    ("status" = 'running' AND "model" IS NULL AND "response_hash" IS NULL AND "raw_response" IS NULL AND "failure_code" IS NULL AND "completed_at" IS NULL) OR
    ("status" = 'completed' AND "model" IS NOT NULL AND length("model") > 0 AND "response_hash" IS NOT NULL AND "response_hash" ~ '^[0-9a-f]{64}$' AND "raw_response" IS NOT NULL AND "failure_code" IS NULL AND "completed_at" IS NOT NULL) OR
    ("status" IN ('failed','outcome_unknown') AND "model" IS NULL AND "response_hash" IS NULL AND "raw_response" IS NULL AND "failure_code" IS NOT NULL AND length("failure_code") > 0 AND "completed_at" IS NOT NULL)
  )
);--> statement-breakpoint
CREATE INDEX "analysis_compare_workspace_created_idx" ON "analysis_compare_results" ("workspace_id", "created_at");--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_analysis_compare_result() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM analysis_runs
    WHERE id = NEW.analysis_run_id AND project_id = NEW.project_id AND workspace_id = NEW.workspace_id
      AND agreement_version_id = NEW.agreement_version_id AND instruction_version_id = NEW.instruction_version_id
  ) THEN
    RAISE EXCEPTION 'Compare result does not match its Reality Check inputs';
  END IF;
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  IF OLD.id IS DISTINCT FROM NEW.id OR OLD.analysis_run_id IS DISTINCT FROM NEW.analysis_run_id OR
     OLD.project_id IS DISTINCT FROM NEW.project_id OR OLD.workspace_id IS DISTINCT FROM NEW.workspace_id OR
     OLD.agreement_version_id IS DISTINCT FROM NEW.agreement_version_id OR OLD.instruction_version_id IS DISTINCT FROM NEW.instruction_version_id OR
     OLD.provider_idempotency_key IS DISTINCT FROM NEW.provider_idempotency_key OR OLD.request_hash IS DISTINCT FROM NEW.request_hash OR
     OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Compare request identity is immutable';
  END IF;
  IF OLD.status <> 'running' OR NEW.status NOT IN ('completed','failed','outcome_unknown') THEN
    RAISE EXCEPTION 'Compare result cannot be revised';
  END IF;
  RETURN NEW;
END; $$;--> statement-breakpoint
CREATE TRIGGER analysis_compare_identity_guard BEFORE INSERT OR UPDATE ON "analysis_compare_results" FOR EACH ROW EXECUTE FUNCTION guard_analysis_compare_result();--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_analysis_compare_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Compare result cannot be deleted'; END; $$;--> statement-breakpoint
CREATE TRIGGER analysis_compare_delete_guard BEFORE DELETE ON "analysis_compare_results" FOR EACH ROW EXECUTE FUNCTION prevent_analysis_compare_delete();
