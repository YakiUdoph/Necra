\set ON_ERROR_STOP on

BEGIN;

INSERT INTO users (id) VALUES
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');

INSERT INTO authenticated_identities (id, user_id, provider, provider_subject) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'test-provider', 'test-user-1'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'test-provider', 'test-user-2');

INSERT INTO workspaces (id, name) VALUES
  ('20000000-0000-0000-0000-000000000001', 'TEST ONLY workspace 1'),
  ('20000000-0000-0000-0000-000000000002', 'TEST ONLY workspace 2');

INSERT INTO workspace_memberships (workspace_id, user_id, role) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'administrator'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'administrator');

INSERT INTO projects (id, workspace_id, name, created_by_user_id) VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'TEST ONLY project 1', '00000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'TEST ONLY project 2', '00000000-0000-0000-0000-000000000002');

INSERT INTO project_memberships (project_id, workspace_id, user_id, role, can_decide) VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'manager', true),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'manager', true);

INSERT INTO source_documents (id, project_id, workspace_id, kind, title, created_by_user_id) VALUES
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'agreement', 'TEST ONLY agreement 1', '00000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'instruction', 'TEST ONLY instructions 1', '00000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'attachment', 'TEST ONLY extra source', '00000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'agreement', 'TEST ONLY agreement 2', '00000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'instruction', 'TEST ONLY instructions 2', '00000000-0000-0000-0000-000000000002');

INSERT INTO document_versions
  (id, source_document_id, project_id, workspace_id, version_number, content_hash, media_type, byte_size, processing_status, created_by_user_id)
VALUES
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, repeat('a', 64), 'text/plain', 10, 'ready', '00000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, repeat('b', 64), 'text/plain', 12, 'ready', '00000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, repeat('c', 64), 'text/plain', 8, 'ready', '00000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 1, repeat('d', 64), 'text/plain', 10, 'ready', '00000000-0000-0000-0000-000000000002'),
  ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 1, repeat('e', 64), 'text/plain', 12, 'ready', '00000000-0000-0000-0000-000000000002');

INSERT INTO change_requests
  (id, project_id, workspace_id, instruction_version_id, title, idempotency_key, created_by_user_id)
VALUES
  ('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'TEST ONLY request 1', 'test-request-1', '00000000-0000-0000-0000-000000000001');

INSERT INTO analysis_runs
  (id, project_id, workspace_id, change_request_id, agreement_version_id, instruction_version_id, idempotency_key, created_by_user_id)
VALUES
  ('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'test-analysis-1', '00000000-0000-0000-0000-000000000001');

INSERT INTO findings (id, analysis_run_id, project_id, workspace_id, category, explanation)
VALUES ('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'potential_change', 'TEST ONLY finding');

DO $$
BEGIN
  BEGIN
    INSERT INTO source_documents (project_id, workspace_id, kind, title, created_by_user_id)
    VALUES ('30000000-0000-0000-0000-000000000099', '20000000-0000-0000-0000-000000000001', 'manual', 'Invalid project', '00000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'invalid foreign key was accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO project_memberships (project_id, workspace_id, user_id, role)
    VALUES ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'participant');
    RAISE EXCEPTION 'duplicate membership was accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO evidence_references
      (finding_id, analysis_run_id, document_version_id, project_id, workspace_id, relationship)
    VALUES
      ('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'context');
    RAISE EXCEPTION 'cross-project evidence was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO evidence_references
      (finding_id, analysis_run_id, document_version_id, project_id, workspace_id, relationship)
    VALUES
      ('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'context');
    RAISE EXCEPTION 'non-input evidence was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE document_versions SET byte_size = 99 WHERE id = '50000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'document version update was accepted';
  EXCEPTION WHEN SQLSTATE '55000' THEN NULL;
  END;

  BEGIN
    DELETE FROM document_versions WHERE id = '50000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'document version delete was accepted';
  EXCEPTION WHEN SQLSTATE '55000' THEN NULL;
  END;

  BEGIN
    UPDATE analysis_runs SET agreement_version_id = '50000000-0000-0000-0000-000000000002'
    WHERE id = '70000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'analysis input mutation was accepted';
  EXCEPTION WHEN SQLSTATE '55000' THEN NULL;
  END;

  BEGIN
    INSERT INTO decisions
      (change_request_id, agreement_version_id, project_id, workspace_id, outcome, authority_snapshot, idempotency_key)
    VALUES
      ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'approved', '{}', 'missing-actor');
    RAISE EXCEPTION 'anonymous decision was accepted';
  EXCEPTION WHEN not_null_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO decisions
      (change_request_id, agreement_version_id, project_id, workspace_id, actor_user_id, actor_identity_id, outcome, authority_snapshot, idempotency_key)
    VALUES
      ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'approved', '{}', 'cross-project-decision');
    RAISE EXCEPTION 'cross-project decision was accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
END;
$$;

INSERT INTO evidence_references
  (id, finding_id, analysis_run_id, document_version_id, project_id, workspace_id, relationship, quoted_text, start_offset, end_offset)
VALUES
  ('90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'supports', 'Exact quote', 4, 15),
  ('90000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'missing', NULL, NULL, NULL);

UPDATE analysis_runs SET status = 'running' WHERE id = '70000000-0000-0000-0000-000000000001';

INSERT INTO document_versions
  (id, source_document_id, project_id, workspace_id, version_number, content_hash, media_type, byte_size, processing_status, created_by_user_id)
VALUES
  ('50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 2, repeat('f', 64), 'text/plain', 11, 'ready', '00000000-0000-0000-0000-000000000001');

DO $$
DECLARE
  original_hash text;
BEGIN
  SELECT content_hash INTO original_hash FROM document_versions
  WHERE id = '50000000-0000-0000-0000-000000000001';
  IF original_hash <> repeat('a', 64) THEN
    RAISE EXCEPTION 'source revision changed the original version';
  END IF;
END;
$$;

INSERT INTO decisions
  (id, change_request_id, agreement_version_id, project_id, workspace_id, actor_user_id, actor_identity_id, outcome, authority_snapshot, idempotency_key)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'approved', '{"role":"manager"}', 'decision-root');

INSERT INTO decisions
  (id, change_request_id, agreement_version_id, project_id, workspace_id, actor_user_id, actor_identity_id, outcome, authority_snapshot, idempotency_key, supersedes_decision_id)
VALUES
  ('a0000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'rejected', '{"role":"manager"}', 'decision-successor', 'a0000000-0000-0000-0000-000000000001');

DO $$
BEGIN
  BEGIN
    INSERT INTO decisions
      (change_request_id, agreement_version_id, project_id, workspace_id, actor_user_id, actor_identity_id, outcome, authority_snapshot, idempotency_key)
    VALUES
      ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'rejected', '{}', 'conflicting-root');
    RAISE EXCEPTION 'conflicting root decision was accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    UPDATE decisions SET rationale = 'rewrite' WHERE id = 'a0000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'decision rewrite was accepted';
  EXCEPTION WHEN SQLSTATE '55000' THEN NULL;
  END;

  BEGIN
    INSERT INTO decisions
      (change_request_id, agreement_version_id, project_id, workspace_id, actor_user_id, actor_identity_id, outcome, authority_snapshot, idempotency_key, supersedes_decision_id)
    VALUES
      ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'unresolved', '{}', 'second-successor', 'a0000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'second decision successor was accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END;
$$;

INSERT INTO audit_events
  (id, workspace_id, project_id, origin, actor_user_id, actor_identity_id, event_type, target_type, target_id)
VALUES
  ('b0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'human', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'change_request.created', 'change_request', '60000000-0000-0000-0000-000000000001');

DO $$
DECLARE
  persisted_event text;
BEGIN
  SELECT event_type INTO persisted_event FROM audit_events
  WHERE id = 'b0000000-0000-0000-0000-000000000001';
  IF persisted_event IS DISTINCT FROM 'change_request.created' THEN
    RAISE EXCEPTION 'audit event did not persist';
  END IF;

  BEGIN
    UPDATE audit_events SET event_type = 'rewritten' WHERE id = 'b0000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'audit rewrite was accepted';
  EXCEPTION WHEN SQLSTATE '55000' THEN NULL;
  END;

  BEGIN
    DELETE FROM audit_events WHERE id = 'b0000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'audit deletion was accepted';
  EXCEPTION WHEN SQLSTATE '55000' THEN NULL;
  END;
END;
$$;

ROLLBACK;

\echo 'T002 schema invariants passed'
