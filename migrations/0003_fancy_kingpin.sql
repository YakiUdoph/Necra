ALTER TYPE "public"."analysis_status" ADD VALUE 'reconciliation_required' BEFORE 'failed';--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "agreement_document_id" uuid;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "agreement_content_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "instruction_document_id" uuid;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "instruction_content_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "provider_idempotency_key" uuid;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "provider_request_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "lifecycle_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "queued_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "processing_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "last_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "reconciliation_required_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "failure_code" text;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "validated_result_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN "provider_response_hash" varchar(64);--> statement-breakpoint
UPDATE "analysis_runs" AS analysis
SET agreement_document_id = agreement.source_document_id,
    agreement_content_hash = agreement.content_hash,
    instruction_document_id = instruction.source_document_id,
    instruction_content_hash = instruction.content_hash,
    provider_idempotency_key = gen_random_uuid(),
    provider_request_hash = md5(agreement.content_text || E'\n' || instruction.content_text)
      || md5(instruction.content_text || E'\n' || agreement.content_text)
FROM document_versions AS agreement, document_versions AS instruction
WHERE agreement.id = analysis.agreement_version_id
  AND instruction.id = analysis.instruction_version_id;--> statement-breakpoint
ALTER TABLE "analysis_runs" ALTER COLUMN "agreement_document_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "analysis_runs" ALTER COLUMN "agreement_content_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "analysis_runs" ALTER COLUMN "instruction_document_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "analysis_runs" ALTER COLUMN "instruction_content_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "analysis_runs" ALTER COLUMN "provider_idempotency_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "analysis_runs" ALTER COLUMN "provider_request_hash" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_runs_provider_idempotency_unique" ON "analysis_runs" USING btree ("provider_idempotency_key");--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_lifecycle_revision_nonnegative" CHECK ("analysis_runs"."lifecycle_revision" >= 0);--> statement-breakpoint
ALTER TABLE "analysis_runs" DROP CONSTRAINT "analysis_runs_attempt_positive";--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_attempt_bounded" CHECK ("analysis_runs"."attempt_number" BETWEEN 1 AND 4);--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_snapshot_hashes_valid" CHECK ("analysis_runs"."agreement_content_hash" ~ '^[0-9a-f]{64}$' and "analysis_runs"."instruction_content_hash" ~ '^[0-9a-f]{64}$' and "analysis_runs"."provider_request_hash" ~ '^[0-9a-f]{64}$');--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_completed_result_validated" CHECK ("analysis_runs"."status" <> 'completed' or ("analysis_runs"."validated_result_at" is not null and "analysis_runs"."provider_response_hash" ~ '^[0-9a-f]{64}$' and "analysis_runs"."provider" is not null and "analysis_runs"."adapter_version" is not null and "analysis_runs"."completed_at" is not null));--> statement-breakpoint
CREATE OR REPLACE FUNCTION "necra_protect_analysis_inputs"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.project_id, NEW.workspace_id, NEW.change_request_id,
    NEW.agreement_document_id, NEW.agreement_version_id, NEW.agreement_content_hash,
    NEW.instruction_document_id, NEW.instruction_version_id, NEW.instruction_content_hash,
    NEW.idempotency_key, NEW.provider_idempotency_key, NEW.provider_request_hash,
    NEW.created_by_user_id, NEW.created_at, NEW.queued_at)
  IS DISTINCT FROM
  ROW(OLD.project_id, OLD.workspace_id, OLD.change_request_id,
    OLD.agreement_document_id, OLD.agreement_version_id, OLD.agreement_content_hash,
    OLD.instruction_document_id, OLD.instruction_version_id, OLD.instruction_content_hash,
    OLD.idempotency_key, OLD.provider_idempotency_key, OLD.provider_request_hash,
    OLD.created_by_user_id, OLD.created_at, OLD.queued_at) THEN
    RAISE EXCEPTION 'analysis run snapshots and creation identity are immutable'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE FUNCTION "necra_validate_analysis_snapshot"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE agreement_record record; instruction_record record;
BEGIN
  SELECT dv.source_document_id, dv.content_hash, dv.processing_status, sd.kind
    INTO agreement_record FROM document_versions dv
    JOIN source_documents sd ON sd.id = dv.source_document_id
    WHERE dv.id = NEW.agreement_version_id AND dv.project_id = NEW.project_id
      AND dv.workspace_id = NEW.workspace_id;
  SELECT dv.source_document_id, dv.content_hash, dv.processing_status, sd.kind
    INTO instruction_record FROM document_versions dv
    JOIN source_documents sd ON sd.id = dv.source_document_id
    WHERE dv.id = NEW.instruction_version_id AND dv.project_id = NEW.project_id
      AND dv.workspace_id = NEW.workspace_id;
  IF agreement_record.kind IS DISTINCT FROM 'agreement'::source_kind
     OR agreement_record.processing_status IS DISTINCT FROM 'ready'::version_processing_status
     OR agreement_record.source_document_id IS DISTINCT FROM NEW.agreement_document_id
     OR agreement_record.content_hash IS DISTINCT FROM NEW.agreement_content_hash THEN
    RAISE EXCEPTION 'agreement snapshot does not match a ready agreement version' USING ERRCODE = '23514';
  END IF;
  IF instruction_record.kind IS DISTINCT FROM 'instruction'::source_kind
     OR instruction_record.processing_status IS DISTINCT FROM 'ready'::version_processing_status
     OR instruction_record.source_document_id IS DISTINCT FROM NEW.instruction_document_id
     OR instruction_record.content_hash IS DISTINCT FROM NEW.instruction_content_hash THEN
    RAISE EXCEPTION 'instruction snapshot does not match a ready instruction version' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE FUNCTION "necra_validate_analysis_transition"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.lifecycle_revision <> OLD.lifecycle_revision + 1 THEN
      RAISE EXCEPTION 'analysis transition requires the next lifecycle revision' USING ERRCODE = '40001';
    END IF;
    IF NOT ((OLD.status = 'pending' AND NEW.status IN ('running', 'failed'))
      OR (OLD.status = 'running' AND NEW.status IN ('completed', 'failed', 'reconciliation_required'))
      OR (OLD.status = 'reconciliation_required' AND NEW.status IN ('running', 'completed', 'failed'))
      OR (OLD.status = 'failed' AND NEW.status = 'pending')) THEN
      RAISE EXCEPTION 'invalid analysis status transition: % to %', OLD.status, NEW.status USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.lifecycle_revision IS DISTINCT FROM OLD.lifecycle_revision THEN
    RAISE EXCEPTION 'lifecycle revision changes only with status' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER analysis_runs_validate_snapshot BEFORE INSERT OR UPDATE ON analysis_runs
FOR EACH ROW EXECUTE FUNCTION necra_validate_analysis_snapshot();--> statement-breakpoint
CREATE TRIGGER analysis_runs_validate_transition BEFORE UPDATE ON analysis_runs
FOR EACH ROW EXECUTE FUNCTION necra_validate_analysis_transition();
