CREATE TYPE "public"."analysis_status" AS ENUM('pending', 'running', 'failed', 'completed', 'evidence_missing');--> statement-breakpoint
CREATE TYPE "public"."audit_origin" AS ENUM('human', 'system', 'external');--> statement-breakpoint
CREATE TYPE "public"."change_request_status" AS ENUM('requested', 'under_review', 'approved', 'rejected', 'unresolved', 'completed');--> statement-breakpoint
CREATE TYPE "public"."decision_outcome" AS ENUM('approved', 'rejected', 'unresolved');--> statement-breakpoint
CREATE TYPE "public"."evidence_relationship" AS ENUM('supports', 'context', 'missing');--> statement-breakpoint
CREATE TYPE "public"."finding_category" AS ENUM('potential_change', 'possible_conflict', 'ambiguity', 'missing_evidence');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."project_role" AS ENUM('participant', 'reviewer', 'manager');--> statement-breakpoint
CREATE TYPE "public"."review_action" AS ENUM('noted', 'confirmed', 'corrected', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."source_kind" AS ENUM('agreement', 'instruction', 'attachment', 'manual');--> statement-breakpoint
CREATE TYPE "public"."version_processing_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('member', 'administrator');--> statement-breakpoint
CREATE TABLE "analysis_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"change_request_id" uuid NOT NULL,
	"agreement_version_id" uuid NOT NULL,
	"instruction_version_id" uuid NOT NULL,
	"status" "analysis_status" DEFAULT 'pending' NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider" text,
	"adapter_version" text,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "analysis_runs_scope_unique" UNIQUE("id","project_id","workspace_id"),
	CONSTRAINT "analysis_runs_versions_distinct" CHECK ("analysis_runs"."agreement_version_id" <> "analysis_runs"."instruction_version_id"),
	CONSTRAINT "analysis_runs_attempt_positive" CHECK ("analysis_runs"."attempt_number" > 0),
	CONSTRAINT "analysis_runs_idempotency_nonempty" CHECK (length(trim("analysis_runs"."idempotency_key")) > 0)
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"origin" "audit_origin" NOT NULL,
	"actor_user_id" uuid,
	"actor_identity_id" uuid,
	"event_type" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"request_correlation_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_event_type_nonempty" CHECK (length(trim("audit_events"."event_type")) > 0),
	CONSTRAINT "audit_events_target_type_nonempty" CHECK (length(trim("audit_events"."target_type")) > 0),
	CONSTRAINT "audit_events_actor_matches_origin" CHECK ((
        "audit_events"."origin" = 'human' and "audit_events"."actor_user_id" is not null and "audit_events"."actor_identity_id" is not null
      ) or (
        "audit_events"."origin" <> 'human' and "audit_events"."actor_user_id" is null and "audit_events"."actor_identity_id" is null
      ))
);
--> statement-breakpoint
CREATE TABLE "authenticated_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_subject" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authenticated_identities_provider_subject_unique" UNIQUE("provider","provider_subject"),
	CONSTRAINT "authenticated_identities_id_user_unique" UNIQUE("id","user_id"),
	CONSTRAINT "authenticated_identities_provider_nonempty" CHECK (length(trim("authenticated_identities"."provider")) > 0),
	CONSTRAINT "authenticated_identities_subject_nonempty" CHECK (length(trim("authenticated_identities"."provider_subject")) > 0)
);
--> statement-breakpoint
CREATE TABLE "change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"instruction_version_id" uuid NOT NULL,
	"status" "change_request_status" DEFAULT 'requested' NOT NULL,
	"title" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "change_requests_scope_unique" UNIQUE("id","project_id","workspace_id"),
	CONSTRAINT "change_requests_input_scope_unique" UNIQUE("id","project_id","workspace_id","instruction_version_id"),
	CONSTRAINT "change_requests_title_nonempty" CHECK (length(trim("change_requests"."title")) > 0),
	CONSTRAINT "change_requests_idempotency_nonempty" CHECK (length(trim("change_requests"."idempotency_key")) > 0)
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"change_request_id" uuid NOT NULL,
	"agreement_version_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_identity_id" uuid NOT NULL,
	"outcome" "decision_outcome" NOT NULL,
	"rationale" text,
	"authority_snapshot" jsonb NOT NULL,
	"idempotency_key" text NOT NULL,
	"supersedes_decision_id" uuid,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "decisions_scope_unique" UNIQUE("id","project_id","workspace_id"),
	CONSTRAINT "decisions_supersession_scope_unique" UNIQUE("id","project_id","workspace_id","change_request_id","agreement_version_id"),
	CONSTRAINT "decisions_not_self_superseding" CHECK ("decisions"."supersedes_decision_id" is null or "decisions"."supersedes_decision_id" <> "decisions"."id"),
	CONSTRAINT "decisions_idempotency_nonempty" CHECK (length(trim("decisions"."idempotency_key")) > 0)
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_document_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"storage_object_key" text,
	"media_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"processing_status" "version_processing_status" DEFAULT 'pending' NOT NULL,
	"captured_at" timestamp with time zone,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_versions_scope_unique" UNIQUE("id","project_id","workspace_id"),
	CONSTRAINT "document_versions_source_sequence_unique" UNIQUE("source_document_id","version_number"),
	CONSTRAINT "document_versions_sequence_positive" CHECK ("document_versions"."version_number" > 0),
	CONSTRAINT "document_versions_byte_size_nonnegative" CHECK ("document_versions"."byte_size" >= 0),
	CONSTRAINT "document_versions_sha256_format" CHECK ("document_versions"."content_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "document_versions_media_type_nonempty" CHECK (length(trim("document_versions"."media_type")) > 0)
);
--> statement-breakpoint
CREATE TABLE "evidence_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finding_id" uuid NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"document_version_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"relationship" "evidence_relationship" NOT NULL,
	"quoted_text" text,
	"start_offset" integer,
	"end_offset" integer,
	"locator" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_references_scope_unique" UNIQUE("id","project_id","workspace_id"),
	CONSTRAINT "evidence_references_quote_offsets_consistent" CHECK ((
        "evidence_references"."quoted_text" is null and "evidence_references"."start_offset" is null and "evidence_references"."end_offset" is null
      ) or (
        "evidence_references"."quoted_text" is not null and length("evidence_references"."quoted_text") > 0 and
        (("evidence_references"."start_offset" is null and "evidence_references"."end_offset" is null) or
         ("evidence_references"."start_offset" >= 0 and "evidence_references"."end_offset" > "evidence_references"."start_offset"))
      )),
	CONSTRAINT "evidence_references_missing_has_no_quote" CHECK ("evidence_references"."relationship" <> 'missing' or "evidence_references"."quoted_text" is null)
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"category" "finding_category" NOT NULL,
	"explanation" text NOT NULL,
	"uncertainty" text,
	"provider_finding_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "findings_scope_unique" UNIQUE("id","project_id","workspace_id"),
	CONSTRAINT "findings_analysis_scope_unique" UNIQUE("id","analysis_run_id","project_id","workspace_id"),
	CONSTRAINT "findings_explanation_nonempty" CHECK (length(trim("findings"."explanation")) > 0)
);
--> statement-breakpoint
CREATE TABLE "project_memberships" (
	"project_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "project_role" NOT NULL,
	"can_decide" boolean DEFAULT false NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_memberships_pk" PRIMARY KEY("project_id","user_id"),
	CONSTRAINT "project_memberships_scope_unique" UNIQUE("project_id","workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "projects_name_nonempty" CHECK (length(trim("projects"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "review_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"finding_id" uuid,
	"project_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_identity_id" uuid NOT NULL,
	"action" "review_action" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_actions_scope_unique" UNIQUE("id","project_id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "source_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"kind" "source_kind" NOT NULL,
	"title" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_documents_scope_unique" UNIQUE("id","project_id","workspace_id"),
	CONSTRAINT "source_documents_title_nonempty" CHECK (length(trim("source_documents"."title")) > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_memberships" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_role" NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_memberships_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_name_nonempty" CHECK (length(trim("workspaces"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_change_request_scope_fk" FOREIGN KEY ("change_request_id","project_id","workspace_id","instruction_version_id") REFERENCES "public"."change_requests"("id","project_id","workspace_id","instruction_version_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_agreement_version_scope_fk" FOREIGN KEY ("agreement_version_id","project_id","workspace_id") REFERENCES "public"."document_versions"("id","project_id","workspace_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_instruction_version_scope_fk" FOREIGN KEY ("instruction_version_id","project_id","workspace_id") REFERENCES "public"."document_versions"("id","project_id","workspace_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_creator_membership_fk" FOREIGN KEY ("project_id","workspace_id","created_by_user_id") REFERENCES "public"."project_memberships"("project_id","workspace_id","user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_project_scope_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_identity_fk" FOREIGN KEY ("actor_identity_id","actor_user_id") REFERENCES "public"."authenticated_identities"("id","user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "authenticated_identities" ADD CONSTRAINT "authenticated_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_instruction_version_scope_fk" FOREIGN KEY ("instruction_version_id","project_id","workspace_id") REFERENCES "public"."document_versions"("id","project_id","workspace_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_creator_membership_fk" FOREIGN KEY ("project_id","workspace_id","created_by_user_id") REFERENCES "public"."project_memberships"("project_id","workspace_id","user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_change_request_scope_fk" FOREIGN KEY ("change_request_id","project_id","workspace_id") REFERENCES "public"."change_requests"("id","project_id","workspace_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_agreement_version_scope_fk" FOREIGN KEY ("agreement_version_id","project_id","workspace_id") REFERENCES "public"."document_versions"("id","project_id","workspace_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_actor_membership_fk" FOREIGN KEY ("project_id","workspace_id","actor_user_id") REFERENCES "public"."project_memberships"("project_id","workspace_id","user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_actor_identity_fk" FOREIGN KEY ("actor_identity_id","actor_user_id") REFERENCES "public"."authenticated_identities"("id","user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_supersedes_same_context_fk" FOREIGN KEY ("supersedes_decision_id","project_id","workspace_id","change_request_id","agreement_version_id") REFERENCES "public"."decisions"("id","project_id","workspace_id","change_request_id","agreement_version_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_source_scope_fk" FOREIGN KEY ("source_document_id","project_id","workspace_id") REFERENCES "public"."source_documents"("id","project_id","workspace_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_creator_membership_fk" FOREIGN KEY ("project_id","workspace_id","created_by_user_id") REFERENCES "public"."project_memberships"("project_id","workspace_id","user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "evidence_references" ADD CONSTRAINT "evidence_references_finding_scope_fk" FOREIGN KEY ("finding_id","analysis_run_id","project_id","workspace_id") REFERENCES "public"."findings"("id","analysis_run_id","project_id","workspace_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "evidence_references" ADD CONSTRAINT "evidence_references_version_scope_fk" FOREIGN KEY ("document_version_id","project_id","workspace_id") REFERENCES "public"."document_versions"("id","project_id","workspace_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_analysis_scope_fk" FOREIGN KEY ("analysis_run_id","project_id","workspace_id") REFERENCES "public"."analysis_runs"("id","project_id","workspace_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_project_scope_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_workspace_member_fk" FOREIGN KEY ("workspace_id","user_id") REFERENCES "public"."workspace_memberships"("workspace_id","user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_creator_membership_fk" FOREIGN KEY ("workspace_id","created_by_user_id") REFERENCES "public"."workspace_memberships"("workspace_id","user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "review_actions" ADD CONSTRAINT "review_actions_analysis_scope_fk" FOREIGN KEY ("analysis_run_id","project_id","workspace_id") REFERENCES "public"."analysis_runs"("id","project_id","workspace_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "review_actions" ADD CONSTRAINT "review_actions_finding_scope_fk" FOREIGN KEY ("finding_id","project_id","workspace_id") REFERENCES "public"."findings"("id","project_id","workspace_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "review_actions" ADD CONSTRAINT "review_actions_actor_membership_fk" FOREIGN KEY ("project_id","workspace_id","actor_user_id") REFERENCES "public"."project_memberships"("project_id","workspace_id","user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "review_actions" ADD CONSTRAINT "review_actions_actor_identity_fk" FOREIGN KEY ("actor_identity_id","actor_user_id") REFERENCES "public"."authenticated_identities"("id","user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_project_scope_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_creator_membership_fk" FOREIGN KEY ("project_id","workspace_id","created_by_user_id") REFERENCES "public"."project_memberships"("project_id","workspace_id","user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_runs_idempotency_unique" ON "analysis_runs" USING btree ("project_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "analysis_runs_change_request_idx" ON "analysis_runs" USING btree ("change_request_id");--> statement-breakpoint
CREATE INDEX "analysis_runs_project_status_idx" ON "analysis_runs" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "audit_events_workspace_time_idx" ON "audit_events" USING btree ("workspace_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "audit_events_project_time_idx" ON "audit_events" USING btree ("project_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "authenticated_identities_user_idx" ON "authenticated_identities" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "change_requests_idempotency_unique" ON "change_requests" USING btree ("project_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "change_requests_project_status_idx" ON "change_requests" USING btree ("project_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "decisions_idempotency_unique" ON "decisions" USING btree ("project_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "decisions_one_successor_unique" ON "decisions" USING btree ("supersedes_decision_id") WHERE "decisions"."supersedes_decision_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "decisions_one_root_unique" ON "decisions" USING btree ("change_request_id") WHERE "decisions"."supersedes_decision_id" is null;--> statement-breakpoint
CREATE INDEX "decisions_change_request_idx" ON "decisions" USING btree ("change_request_id","decided_at");--> statement-breakpoint
CREATE INDEX "document_versions_project_idx" ON "document_versions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "evidence_references_finding_idx" ON "evidence_references" USING btree ("finding_id");--> statement-breakpoint
CREATE INDEX "evidence_references_analysis_idx" ON "evidence_references" USING btree ("analysis_run_id");--> statement-breakpoint
CREATE INDEX "evidence_references_version_idx" ON "evidence_references" USING btree ("document_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "findings_provider_key_unique" ON "findings" USING btree ("analysis_run_id","provider_finding_key") WHERE "findings"."provider_finding_key" is not null;--> statement-breakpoint
CREATE INDEX "findings_analysis_idx" ON "findings" USING btree ("analysis_run_id");--> statement-breakpoint
CREATE INDEX "project_memberships_user_idx" ON "project_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "projects_workspace_idx" ON "projects" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "review_actions_analysis_idx" ON "review_actions" USING btree ("analysis_run_id");--> statement-breakpoint
CREATE INDEX "source_documents_project_idx" ON "source_documents" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "workspace_memberships_user_idx" ON "workspace_memberships" USING btree ("user_id");
--> statement-breakpoint
CREATE FUNCTION "necra_reject_row_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only and cannot be %', TG_TABLE_NAME, lower(TG_OP)
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE FUNCTION "necra_protect_analysis_inputs"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(
    NEW.project_id,
    NEW.workspace_id,
    NEW.change_request_id,
    NEW.agreement_version_id,
    NEW.instruction_version_id,
    NEW.idempotency_key,
    NEW.created_by_user_id,
    NEW.created_at
  ) IS DISTINCT FROM ROW(
    OLD.project_id,
    OLD.workspace_id,
    OLD.change_request_id,
    OLD.agreement_version_id,
    OLD.instruction_version_id,
    OLD.idempotency_key,
    OLD.created_by_user_id,
    OLD.created_at
  ) THEN
    RAISE EXCEPTION 'analysis run inputs and creation identity are immutable'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION "necra_validate_analysis_version_kinds"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  agreement_kind "source_kind";
  instruction_kind "source_kind";
BEGIN
  SELECT source_documents.kind INTO agreement_kind
  FROM document_versions
  JOIN source_documents ON source_documents.id = document_versions.source_document_id
  WHERE document_versions.id = NEW.agreement_version_id;

  SELECT source_documents.kind INTO instruction_kind
  FROM document_versions
  JOIN source_documents ON source_documents.id = document_versions.source_document_id
  WHERE document_versions.id = NEW.instruction_version_id;

  IF agreement_kind IS DISTINCT FROM 'agreement'::"source_kind" THEN
    RAISE EXCEPTION 'agreement_version_id must identify an agreement source version'
      USING ERRCODE = '23514';
  END IF;
  IF instruction_kind = 'agreement'::"source_kind" THEN
    RAISE EXCEPTION 'instruction_version_id cannot identify an agreement source version'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION "necra_validate_change_request_version_kind"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  instruction_kind "source_kind";
BEGIN
  SELECT source_documents.kind INTO instruction_kind
  FROM document_versions
  JOIN source_documents ON source_documents.id = document_versions.source_document_id
  WHERE document_versions.id = NEW.instruction_version_id;

  IF instruction_kind = 'agreement'::"source_kind" THEN
    RAISE EXCEPTION 'change request instruction version cannot be an agreement source version'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION "necra_validate_decision_agreement_kind"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  agreement_kind "source_kind";
BEGIN
  SELECT source_documents.kind INTO agreement_kind
  FROM document_versions
  JOIN source_documents ON source_documents.id = document_versions.source_document_id
  WHERE document_versions.id = NEW.agreement_version_id;

  IF agreement_kind IS DISTINCT FROM 'agreement'::"source_kind" THEN
    RAISE EXCEPTION 'decision agreement version must identify an agreement source version'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION "necra_validate_evidence_input"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM analysis_runs
    WHERE analysis_runs.id = NEW.analysis_run_id
      AND NEW.document_version_id IN (
        analysis_runs.agreement_version_id,
        analysis_runs.instruction_version_id
      )
  ) THEN
    RAISE EXCEPTION 'evidence reference must cite an input version of its analysis run'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "document_versions_immutable"
BEFORE UPDATE OR DELETE ON "document_versions"
FOR EACH ROW EXECUTE FUNCTION "necra_reject_row_change"();
--> statement-breakpoint
CREATE TRIGGER "findings_append_only"
BEFORE UPDATE OR DELETE ON "findings"
FOR EACH ROW EXECUTE FUNCTION "necra_reject_row_change"();
--> statement-breakpoint
CREATE TRIGGER "evidence_references_append_only"
BEFORE UPDATE OR DELETE ON "evidence_references"
FOR EACH ROW EXECUTE FUNCTION "necra_reject_row_change"();
--> statement-breakpoint
CREATE TRIGGER "review_actions_append_only"
BEFORE UPDATE OR DELETE ON "review_actions"
FOR EACH ROW EXECUTE FUNCTION "necra_reject_row_change"();
--> statement-breakpoint
CREATE TRIGGER "decisions_append_only"
BEFORE UPDATE OR DELETE ON "decisions"
FOR EACH ROW EXECUTE FUNCTION "necra_reject_row_change"();
--> statement-breakpoint
CREATE TRIGGER "audit_events_append_only"
BEFORE UPDATE OR DELETE ON "audit_events"
FOR EACH ROW EXECUTE FUNCTION "necra_reject_row_change"();
--> statement-breakpoint
CREATE TRIGGER "analysis_runs_protect_inputs"
BEFORE UPDATE ON "analysis_runs"
FOR EACH ROW EXECUTE FUNCTION "necra_protect_analysis_inputs"();
--> statement-breakpoint
CREATE TRIGGER "analysis_runs_validate_version_kinds"
BEFORE INSERT OR UPDATE ON "analysis_runs"
FOR EACH ROW EXECUTE FUNCTION "necra_validate_analysis_version_kinds"();
--> statement-breakpoint
CREATE TRIGGER "change_requests_validate_version_kind"
BEFORE INSERT OR UPDATE ON "change_requests"
FOR EACH ROW EXECUTE FUNCTION "necra_validate_change_request_version_kind"();
--> statement-breakpoint
CREATE TRIGGER "decisions_validate_agreement_kind"
BEFORE INSERT ON "decisions"
FOR EACH ROW EXECUTE FUNCTION "necra_validate_decision_agreement_kind"();
--> statement-breakpoint
CREATE TRIGGER "evidence_references_validate_input"
BEFORE INSERT OR UPDATE ON "evidence_references"
FOR EACH ROW EXECUTE FUNCTION "necra_validate_evidence_input"();
