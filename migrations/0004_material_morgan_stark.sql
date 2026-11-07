CREATE TYPE "public"."provider_claim_verdict" AS ENUM('supported', 'contradicted', 'not_stated', 'not_a_claim');--> statement-breakpoint
CREATE TABLE "analysis_provider_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"adapter_version" text NOT NULL,
	"model" text NOT NULL,
	"response_hash" varchar(64) NOT NULL,
	"raw_response" jsonb NOT NULL,
	"transport_metadata" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_provider_results_scope_unique" UNIQUE("id","analysis_run_id","project_id","workspace_id"),
	CONSTRAINT "analysis_provider_results_one_per_run" UNIQUE("analysis_run_id"),
	CONSTRAINT "analysis_provider_results_hash_valid" CHECK ("analysis_provider_results"."response_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "analysis_provider_results_provider_nonempty" CHECK (length(trim("analysis_provider_results"."provider")) > 0 and length(trim("analysis_provider_results"."adapter_version")) > 0 and length(trim("analysis_provider_results"."model")) > 0)
);
--> statement-breakpoint
CREATE TABLE "provider_claim_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_result_id" uuid NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"claim_index" integer NOT NULL,
	"claim" text NOT NULL,
	"kind" text NOT NULL,
	"counted" boolean NOT NULL,
	"weight" double precision NOT NULL,
	"supported" double precision NOT NULL,
	"contradicted" double precision NOT NULL,
	"not_stated" double precision NOT NULL,
	"not_a_claim" double precision NOT NULL,
	"verdict" "provider_claim_verdict" NOT NULL,
	"source_alias" text,
	"evidence_document_version_id" uuid,
	"evidence_quote" text,
	"evidence_start_offset" integer,
	"evidence_end_offset" integer,
	"evidence_confidence" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_claim_results_scope_unique" UNIQUE("id","analysis_run_id","project_id","workspace_id"),
	CONSTRAINT "provider_claim_results_index_unique" UNIQUE("analysis_run_id","claim_index"),
	CONSTRAINT "provider_claim_results_index_nonnegative" CHECK ("provider_claim_results"."claim_index" >= 0),
	CONSTRAINT "provider_claim_results_probability_range" CHECK ("provider_claim_results"."weight" >= 0 and "provider_claim_results"."supported" between 0 and 1 and "provider_claim_results"."contradicted" between 0 and 1 and "provider_claim_results"."not_stated" between 0 and 1 and "provider_claim_results"."not_a_claim" between 0 and 1),
	CONSTRAINT "provider_claim_results_evidence_consistent" CHECK ((
        "provider_claim_results"."evidence_document_version_id" is null and "provider_claim_results"."evidence_quote" is null and
        "provider_claim_results"."evidence_start_offset" is null and "provider_claim_results"."evidence_end_offset" is null and
        "provider_claim_results"."evidence_confidence" is null
      ) or (
        "provider_claim_results"."evidence_document_version_id" is not null and length("provider_claim_results"."evidence_quote") > 0 and
        "provider_claim_results"."evidence_start_offset" >= 0 and "provider_claim_results"."evidence_end_offset" > "provider_claim_results"."evidence_start_offset" and
        "provider_claim_results"."evidence_confidence" between 0 and 1
      ))
);
--> statement-breakpoint
ALTER TABLE "analysis_provider_results" ADD CONSTRAINT "analysis_provider_results_run_scope_fk" FOREIGN KEY ("analysis_run_id","project_id","workspace_id") REFERENCES "public"."analysis_runs"("id","project_id","workspace_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "provider_claim_results" ADD CONSTRAINT "provider_claim_results_provider_result_scope_fk" FOREIGN KEY ("provider_result_id","analysis_run_id","project_id","workspace_id") REFERENCES "public"."analysis_provider_results"("id","analysis_run_id","project_id","workspace_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "provider_claim_results" ADD CONSTRAINT "provider_claim_results_evidence_version_scope_fk" FOREIGN KEY ("evidence_document_version_id","project_id","workspace_id") REFERENCES "public"."document_versions"("id","project_id","workspace_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "provider_claim_results_analysis_idx" ON "provider_claim_results" USING btree ("analysis_run_id");--> statement-breakpoint
CREATE FUNCTION "necra_validate_provider_result_state"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM analysis_runs
    WHERE analysis_runs.id = NEW.analysis_run_id
      AND analysis_runs.project_id = NEW.project_id
      AND analysis_runs.workspace_id = NEW.workspace_id
      AND analysis_runs.status = 'running'
  ) THEN
    RAISE EXCEPTION 'provider result requires a running analysis in the same scope'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE FUNCTION "necra_validate_provider_claim_evidence"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.evidence_document_version_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM analysis_runs
    WHERE analysis_runs.id = NEW.analysis_run_id
      AND analysis_runs.project_id = NEW.project_id
      AND analysis_runs.workspace_id = NEW.workspace_id
      AND analysis_runs.agreement_version_id = NEW.evidence_document_version_id
  ) THEN
    RAISE EXCEPTION 'provider claim evidence must cite the exact agreement input version'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "analysis_provider_results_validate_state"
BEFORE INSERT ON "analysis_provider_results"
FOR EACH ROW EXECUTE FUNCTION "necra_validate_provider_result_state"();--> statement-breakpoint
CREATE TRIGGER "provider_claim_results_validate_evidence"
BEFORE INSERT ON "provider_claim_results"
FOR EACH ROW EXECUTE FUNCTION "necra_validate_provider_claim_evidence"();--> statement-breakpoint
CREATE TRIGGER "analysis_provider_results_append_only"
BEFORE UPDATE OR DELETE ON "analysis_provider_results"
FOR EACH ROW EXECUTE FUNCTION "necra_reject_row_change"();--> statement-breakpoint
CREATE TRIGGER "provider_claim_results_append_only"
BEFORE UPDATE OR DELETE ON "provider_claim_results"
FOR EACH ROW EXECUTE FUNCTION "necra_reject_row_change"();
