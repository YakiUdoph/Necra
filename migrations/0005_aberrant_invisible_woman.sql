ALTER TABLE "decisions" DROP CONSTRAINT "decisions_supersedes_same_context_fk";
--> statement-breakpoint
ALTER TABLE "decisions" DROP CONSTRAINT "decisions_supersession_scope_unique";--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_decision_context_unique" UNIQUE("id","project_id","workspace_id","change_request_id","agreement_version_id","instruction_version_id");--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN "analysis_run_id" uuid;--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN "instruction_version_id" uuid;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "decisions" AS decision
    WHERE (
      SELECT count(*)
      FROM "analysis_runs" AS analysis
      WHERE analysis."change_request_id" = decision."change_request_id"
        AND analysis."agreement_version_id" = decision."agreement_version_id"
        AND analysis."project_id" = decision."project_id"
        AND analysis."workspace_id" = decision."workspace_id"
    ) <> 1
  ) THEN
    RAISE EXCEPTION 'cannot unambiguously bind an existing decision to one immutable Reality Check context';
  END IF;
END;
$$;--> statement-breakpoint
ALTER TABLE "decisions" DISABLE TRIGGER "decisions_append_only";--> statement-breakpoint
UPDATE "decisions" AS decision
SET
  "analysis_run_id" = analysis."id",
  "instruction_version_id" = analysis."instruction_version_id"
FROM "analysis_runs" AS analysis
WHERE analysis."change_request_id" = decision."change_request_id"
  AND analysis."agreement_version_id" = decision."agreement_version_id"
  AND analysis."project_id" = decision."project_id"
  AND analysis."workspace_id" = decision."workspace_id";--> statement-breakpoint
ALTER TABLE "decisions" ENABLE TRIGGER "decisions_append_only";--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "decisions"
    WHERE "analysis_run_id" IS NULL OR "instruction_version_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'cannot bind an existing decision to an immutable Reality Check context';
  END IF;
END;
$$;--> statement-breakpoint
ALTER TABLE "decisions" ALTER COLUMN "analysis_run_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "decisions" ALTER COLUMN "instruction_version_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_supersession_scope_unique" UNIQUE("id","project_id","workspace_id","analysis_run_id","change_request_id","agreement_version_id","instruction_version_id");--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_analysis_context_fk" FOREIGN KEY ("analysis_run_id","project_id","workspace_id","change_request_id","agreement_version_id","instruction_version_id") REFERENCES "public"."analysis_runs"("id","project_id","workspace_id","change_request_id","agreement_version_id","instruction_version_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_supersedes_same_context_fk" FOREIGN KEY ("supersedes_decision_id","project_id","workspace_id","analysis_run_id","change_request_id","agreement_version_id","instruction_version_id") REFERENCES "public"."decisions"("id","project_id","workspace_id","analysis_run_id","change_request_id","agreement_version_id","instruction_version_id") ON DELETE restrict ON UPDATE restrict;
