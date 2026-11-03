import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const createdAt = timestamp("created_at", { withTimezone: true, mode: "date" })
  .defaultNow()
  .notNull();

export const membershipStatus = pgEnum("membership_status", ["active", "suspended"]);
export const workspaceRole = pgEnum("workspace_role", ["member", "administrator"]);
export const projectRole = pgEnum("project_role", ["participant", "reviewer", "manager"]);
export const sourceKind = pgEnum("source_kind", [
  "agreement",
  "instruction",
  "attachment",
  "manual",
]);
export const versionProcessingStatus = pgEnum("version_processing_status", [
  "pending",
  "ready",
  "failed",
]);
export const changeRequestStatus = pgEnum("change_request_status", [
  "requested",
  "under_review",
  "approved",
  "rejected",
  "unresolved",
  "completed",
]);
export const analysisStatus = pgEnum("analysis_status", [
  "pending",
  "running",
  "failed",
  "completed",
  "evidence_missing",
]);
export const findingCategory = pgEnum("finding_category", [
  "potential_change",
  "possible_conflict",
  "ambiguity",
  "missing_evidence",
]);
export const evidenceRelationship = pgEnum("evidence_relationship", [
  "supports",
  "context",
  "missing",
]);
export const reviewAction = pgEnum("review_action", [
  "noted",
  "confirmed",
  "corrected",
  "dismissed",
]);
export const decisionOutcome = pgEnum("decision_outcome", [
  "approved",
  "rejected",
  "unresolved",
]);
export const auditOrigin = pgEnum("audit_origin", ["human", "system", "external"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  // T002 users can predate authentication. Better Auth always supplies these fields for
  // newly authenticated users; legacy rows remain intentionally unprovisioned, not faked.
  name: text("name"),
  email: text("email").unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt,
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "restrict" }),
    createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("auth_sessions_user_idx").on(table.userId)],
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("auth_accounts_provider_account_unique").on(table.providerId, table.accountId),
    index("auth_accounts_user_idx").on(table.userId),
  ],
);

export const authVerifications = pgTable(
  "auth_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("auth_verifications_identifier_idx").on(table.identifier)],
);

export const authenticatedIdentities = pgTable(
  "authenticated_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
    provider: text("provider").notNull(),
    providerSubject: text("provider_subject").notNull(),
    createdAt,
  },
  (table) => [
    unique("authenticated_identities_provider_subject_unique").on(
      table.provider,
      table.providerSubject,
    ),
    unique("authenticated_identities_id_user_unique").on(table.id, table.userId),
    index("authenticated_identities_user_idx").on(table.userId),
    check(
      "authenticated_identities_provider_nonempty",
      sql`length(trim(${table.provider})) > 0`,
    ),
    check(
      "authenticated_identities_subject_nonempty",
      sql`length(trim(${table.providerSubject})) > 0`,
    ),
  ],
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    createdAt,
  },
  (table) => [check("workspaces_name_nonempty", sql`length(trim(${table.name})) > 0`)],
);

export const workspaceMemberships = pgTable(
  "workspace_memberships",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict", onUpdate: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
    role: workspaceRole("role").notNull(),
    status: membershipStatus("status").default("active").notNull(),
    createdAt,
  },
  (table) => [
    primaryKey({
      columns: [table.workspaceId, table.userId],
      name: "workspace_memberships_pk",
    }),
    index("workspace_memberships_user_idx").on(table.userId),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict", onUpdate: "restrict" }),
    name: text("name").notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdAt,
  },
  (table) => [
    unique("projects_id_workspace_unique").on(table.id, table.workspaceId),
    foreignKey({
      columns: [table.workspaceId, table.createdByUserId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.userId],
      name: "projects_creator_membership_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    index("projects_workspace_idx").on(table.workspaceId),
    check("projects_name_nonempty", sql`length(trim(${table.name})) > 0`),
  ],
);

export const projectMemberships = pgTable(
  "project_memberships",
  {
    projectId: uuid("project_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: projectRole("role").notNull(),
    canDecide: boolean("can_decide").default(false).notNull(),
    status: membershipStatus("status").default("active").notNull(),
    createdAt,
  },
  (table) => [
    primaryKey({
      columns: [table.projectId, table.userId],
      name: "project_memberships_pk",
    }),
    unique("project_memberships_scope_unique").on(
      table.projectId,
      table.workspaceId,
      table.userId,
    ),
    foreignKey({
      columns: [table.projectId, table.workspaceId],
      foreignColumns: [projects.id, projects.workspaceId],
      name: "project_memberships_project_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.userId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.userId],
      name: "project_memberships_workspace_member_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    index("project_memberships_user_idx").on(table.userId),
  ],
);

export const sourceDocuments = pgTable(
  "source_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    kind: sourceKind("kind").notNull(),
    title: text("title").notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdAt,
  },
  (table) => [
    unique("source_documents_scope_unique").on(
      table.id,
      table.projectId,
      table.workspaceId,
    ),
    foreignKey({
      columns: [table.projectId, table.workspaceId],
      foreignColumns: [projects.id, projects.workspaceId],
      name: "source_documents_project_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      columns: [table.projectId, table.workspaceId, table.createdByUserId],
      foreignColumns: [
        projectMemberships.projectId,
        projectMemberships.workspaceId,
        projectMemberships.userId,
      ],
      name: "source_documents_creator_membership_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    index("source_documents_project_idx").on(table.projectId),
    check("source_documents_title_nonempty", sql`length(trim(${table.title})) > 0`),
  ],
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceDocumentId: uuid("source_document_id").notNull(),
    projectId: uuid("project_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    versionNumber: integer("version_number").notNull(),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    storageObjectKey: text("storage_object_key"),
    mediaType: text("media_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    processingStatus: versionProcessingStatus("processing_status")
      .default("pending")
      .notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true, mode: "date" }),
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdAt,
  },
  (table) => [
    unique("document_versions_scope_unique").on(
      table.id,
      table.projectId,
      table.workspaceId,
    ),
    unique("document_versions_source_sequence_unique").on(
      table.sourceDocumentId,
      table.versionNumber,
    ),
    foreignKey({
      columns: [table.sourceDocumentId, table.projectId, table.workspaceId],
      foreignColumns: [
        sourceDocuments.id,
        sourceDocuments.projectId,
        sourceDocuments.workspaceId,
      ],
      name: "document_versions_source_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      columns: [table.projectId, table.workspaceId, table.createdByUserId],
      foreignColumns: [
        projectMemberships.projectId,
        projectMemberships.workspaceId,
        projectMemberships.userId,
      ],
      name: "document_versions_creator_membership_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    index("document_versions_project_idx").on(table.projectId),
    check("document_versions_sequence_positive", sql`${table.versionNumber} > 0`),
    check("document_versions_byte_size_nonnegative", sql`${table.byteSize} >= 0`),
    check(
      "document_versions_sha256_format",
      sql`${table.contentHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "document_versions_media_type_nonempty",
      sql`length(trim(${table.mediaType})) > 0`,
    ),
  ],
);

export const changeRequests = pgTable(
  "change_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    instructionVersionId: uuid("instruction_version_id").notNull(),
    status: changeRequestStatus("status").default("requested").notNull(),
    title: text("title").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdAt,
  },
  (table) => [
    unique("change_requests_scope_unique").on(
      table.id,
      table.projectId,
      table.workspaceId,
    ),
    unique("change_requests_input_scope_unique").on(
      table.id,
      table.projectId,
      table.workspaceId,
      table.instructionVersionId,
    ),
    uniqueIndex("change_requests_idempotency_unique").on(
      table.projectId,
      table.idempotencyKey,
    ),
    foreignKey({
      columns: [table.instructionVersionId, table.projectId, table.workspaceId],
      foreignColumns: [
        documentVersions.id,
        documentVersions.projectId,
        documentVersions.workspaceId,
      ],
      name: "change_requests_instruction_version_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      columns: [table.projectId, table.workspaceId, table.createdByUserId],
      foreignColumns: [
        projectMemberships.projectId,
        projectMemberships.workspaceId,
        projectMemberships.userId,
      ],
      name: "change_requests_creator_membership_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    index("change_requests_project_status_idx").on(table.projectId, table.status),
    check("change_requests_title_nonempty", sql`length(trim(${table.title})) > 0`),
    check(
      "change_requests_idempotency_nonempty",
      sql`length(trim(${table.idempotencyKey})) > 0`,
    ),
  ],
);

export const analysisRuns = pgTable(
  "analysis_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    changeRequestId: uuid("change_request_id").notNull(),
    agreementVersionId: uuid("agreement_version_id").notNull(),
    instructionVersionId: uuid("instruction_version_id").notNull(),
    status: analysisStatus("status").default("pending").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    provider: text("provider"),
    adapterVersion: text("adapter_version"),
    attemptNumber: integer("attempt_number").default(1).notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdAt,
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    unique("analysis_runs_scope_unique").on(table.id, table.projectId, table.workspaceId),
    uniqueIndex("analysis_runs_idempotency_unique").on(
      table.projectId,
      table.idempotencyKey,
    ),
    foreignKey({
      columns: [
        table.changeRequestId,
        table.projectId,
        table.workspaceId,
        table.instructionVersionId,
      ],
      foreignColumns: [
        changeRequests.id,
        changeRequests.projectId,
        changeRequests.workspaceId,
        changeRequests.instructionVersionId,
      ],
      name: "analysis_runs_change_request_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      columns: [table.agreementVersionId, table.projectId, table.workspaceId],
      foreignColumns: [
        documentVersions.id,
        documentVersions.projectId,
        documentVersions.workspaceId,
      ],
      name: "analysis_runs_agreement_version_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      columns: [table.instructionVersionId, table.projectId, table.workspaceId],
      foreignColumns: [
        documentVersions.id,
        documentVersions.projectId,
        documentVersions.workspaceId,
      ],
      name: "analysis_runs_instruction_version_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      columns: [table.projectId, table.workspaceId, table.createdByUserId],
      foreignColumns: [
        projectMemberships.projectId,
        projectMemberships.workspaceId,
        projectMemberships.userId,
      ],
      name: "analysis_runs_creator_membership_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    index("analysis_runs_change_request_idx").on(table.changeRequestId),
    index("analysis_runs_project_status_idx").on(table.projectId, table.status),
    check(
      "analysis_runs_versions_distinct",
      sql`${table.agreementVersionId} <> ${table.instructionVersionId}`,
    ),
    check("analysis_runs_attempt_positive", sql`${table.attemptNumber} > 0`),
    check(
      "analysis_runs_idempotency_nonempty",
      sql`length(trim(${table.idempotencyKey})) > 0`,
    ),
  ],
);

export const findings = pgTable(
  "findings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    analysisRunId: uuid("analysis_run_id").notNull(),
    projectId: uuid("project_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    category: findingCategory("category").notNull(),
    explanation: text("explanation").notNull(),
    uncertainty: text("uncertainty"),
    providerFindingKey: text("provider_finding_key"),
    createdAt,
  },
  (table) => [
    unique("findings_scope_unique").on(table.id, table.projectId, table.workspaceId),
    unique("findings_analysis_scope_unique").on(
      table.id,
      table.analysisRunId,
      table.projectId,
      table.workspaceId,
    ),
    foreignKey({
      columns: [table.analysisRunId, table.projectId, table.workspaceId],
      foreignColumns: [analysisRuns.id, analysisRuns.projectId, analysisRuns.workspaceId],
      name: "findings_analysis_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    uniqueIndex("findings_provider_key_unique")
      .on(table.analysisRunId, table.providerFindingKey)
      .where(sql`${table.providerFindingKey} is not null`),
    index("findings_analysis_idx").on(table.analysisRunId),
    check("findings_explanation_nonempty", sql`length(trim(${table.explanation})) > 0`),
  ],
);

export const evidenceReferences = pgTable(
  "evidence_references",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    findingId: uuid("finding_id").notNull(),
    analysisRunId: uuid("analysis_run_id").notNull(),
    documentVersionId: uuid("document_version_id").notNull(),
    projectId: uuid("project_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    relationship: evidenceRelationship("relationship").notNull(),
    quotedText: text("quoted_text"),
    startOffset: integer("start_offset"),
    endOffset: integer("end_offset"),
    locator: jsonb("locator").$type<Record<string, unknown>>(),
    createdAt,
  },
  (table) => [
    unique("evidence_references_scope_unique").on(
      table.id,
      table.projectId,
      table.workspaceId,
    ),
    foreignKey({
      columns: [table.findingId, table.analysisRunId, table.projectId, table.workspaceId],
      foreignColumns: [
        findings.id,
        findings.analysisRunId,
        findings.projectId,
        findings.workspaceId,
      ],
      name: "evidence_references_finding_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      columns: [table.documentVersionId, table.projectId, table.workspaceId],
      foreignColumns: [
        documentVersions.id,
        documentVersions.projectId,
        documentVersions.workspaceId,
      ],
      name: "evidence_references_version_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    index("evidence_references_finding_idx").on(table.findingId),
    index("evidence_references_analysis_idx").on(table.analysisRunId),
    index("evidence_references_version_idx").on(table.documentVersionId),
    check(
      "evidence_references_quote_offsets_consistent",
      sql`(
        ${table.quotedText} is null and ${table.startOffset} is null and ${table.endOffset} is null
      ) or (
        ${table.quotedText} is not null and length(${table.quotedText}) > 0 and
        ((${table.startOffset} is null and ${table.endOffset} is null) or
         (${table.startOffset} >= 0 and ${table.endOffset} > ${table.startOffset}))
      )`,
    ),
    check(
      "evidence_references_missing_has_no_quote",
      sql`${table.relationship} <> 'missing' or ${table.quotedText} is null`,
    ),
  ],
);

export const reviewActions = pgTable(
  "review_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    analysisRunId: uuid("analysis_run_id").notNull(),
    findingId: uuid("finding_id"),
    projectId: uuid("project_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    actorUserId: uuid("actor_user_id").notNull(),
    actorIdentityId: uuid("actor_identity_id").notNull(),
    action: reviewAction("action").notNull(),
    note: text("note"),
    createdAt,
  },
  (table) => [
    unique("review_actions_scope_unique").on(
      table.id,
      table.projectId,
      table.workspaceId,
    ),
    foreignKey({
      columns: [table.analysisRunId, table.projectId, table.workspaceId],
      foreignColumns: [analysisRuns.id, analysisRuns.projectId, analysisRuns.workspaceId],
      name: "review_actions_analysis_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      columns: [table.findingId, table.projectId, table.workspaceId],
      foreignColumns: [findings.id, findings.projectId, findings.workspaceId],
      name: "review_actions_finding_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      columns: [table.projectId, table.workspaceId, table.actorUserId],
      foreignColumns: [
        projectMemberships.projectId,
        projectMemberships.workspaceId,
        projectMemberships.userId,
      ],
      name: "review_actions_actor_membership_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      columns: [table.actorIdentityId, table.actorUserId],
      foreignColumns: [authenticatedIdentities.id, authenticatedIdentities.userId],
      name: "review_actions_actor_identity_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    index("review_actions_analysis_idx").on(table.analysisRunId),
  ],
);

export const decisions = pgTable(
  "decisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    changeRequestId: uuid("change_request_id").notNull(),
    agreementVersionId: uuid("agreement_version_id").notNull(),
    projectId: uuid("project_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    actorUserId: uuid("actor_user_id").notNull(),
    actorIdentityId: uuid("actor_identity_id").notNull(),
    outcome: decisionOutcome("outcome").notNull(),
    rationale: text("rationale"),
    authoritySnapshot: jsonb("authority_snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    supersedesDecisionId: uuid("supersedes_decision_id"),
    decidedAt: timestamp("decided_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("decisions_scope_unique").on(table.id, table.projectId, table.workspaceId),
    unique("decisions_supersession_scope_unique").on(
      table.id,
      table.projectId,
      table.workspaceId,
      table.changeRequestId,
      table.agreementVersionId,
    ),
    uniqueIndex("decisions_idempotency_unique").on(table.projectId, table.idempotencyKey),
    uniqueIndex("decisions_one_successor_unique")
      .on(table.supersedesDecisionId)
      .where(sql`${table.supersedesDecisionId} is not null`),
    uniqueIndex("decisions_one_root_unique")
      .on(table.changeRequestId)
      .where(sql`${table.supersedesDecisionId} is null`),
    foreignKey({
      columns: [table.changeRequestId, table.projectId, table.workspaceId],
      foreignColumns: [
        changeRequests.id,
        changeRequests.projectId,
        changeRequests.workspaceId,
      ],
      name: "decisions_change_request_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      columns: [table.agreementVersionId, table.projectId, table.workspaceId],
      foreignColumns: [
        documentVersions.id,
        documentVersions.projectId,
        documentVersions.workspaceId,
      ],
      name: "decisions_agreement_version_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      columns: [table.projectId, table.workspaceId, table.actorUserId],
      foreignColumns: [
        projectMemberships.projectId,
        projectMemberships.workspaceId,
        projectMemberships.userId,
      ],
      name: "decisions_actor_membership_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      columns: [table.actorIdentityId, table.actorUserId],
      foreignColumns: [authenticatedIdentities.id, authenticatedIdentities.userId],
      name: "decisions_actor_identity_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      columns: [
        table.supersedesDecisionId,
        table.projectId,
        table.workspaceId,
        table.changeRequestId,
        table.agreementVersionId,
      ],
      foreignColumns: [
        table.id,
        table.projectId,
        table.workspaceId,
        table.changeRequestId,
        table.agreementVersionId,
      ],
      name: "decisions_supersedes_same_context_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    index("decisions_change_request_idx").on(table.changeRequestId, table.decidedAt),
    check(
      "decisions_not_self_superseding",
      sql`${table.supersedesDecisionId} is null or ${table.supersedesDecisionId} <> ${table.id}`,
    ),
    check(
      "decisions_idempotency_nonempty",
      sql`length(trim(${table.idempotencyKey})) > 0`,
    ),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict", onUpdate: "restrict" }),
    projectId: uuid("project_id"),
    origin: auditOrigin("origin").notNull(),
    actorUserId: uuid("actor_user_id"),
    actorIdentityId: uuid("actor_identity_id"),
    eventType: text("event_type").notNull(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    requestCorrelationId: uuid("request_correlation_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId, table.workspaceId],
      foreignColumns: [projects.id, projects.workspaceId],
      name: "audit_events_project_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      columns: [table.actorIdentityId, table.actorUserId],
      foreignColumns: [authenticatedIdentities.id, authenticatedIdentities.userId],
      name: "audit_events_actor_identity_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    index("audit_events_workspace_time_idx").on(
      table.workspaceId,
      table.occurredAt,
      table.id,
    ),
    index("audit_events_project_time_idx").on(
      table.projectId,
      table.occurredAt,
      table.id,
    ),
    check("audit_events_event_type_nonempty", sql`length(trim(${table.eventType})) > 0`),
    check(
      "audit_events_target_type_nonempty",
      sql`length(trim(${table.targetType})) > 0`,
    ),
    check(
      "audit_events_actor_matches_origin",
      sql`(
        ${table.origin} = 'human' and ${table.actorUserId} is not null and ${table.actorIdentityId} is not null
      ) or (
        ${table.origin} <> 'human' and ${table.actorUserId} is null and ${table.actorIdentityId} is null
      )`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type ChangeRequest = typeof changeRequests.$inferSelect;
export type AnalysisRun = typeof analysisRuns.$inferSelect;
export type Finding = typeof findings.$inferSelect;
export type EvidenceReference = typeof evidenceReferences.$inferSelect;
export type Decision = typeof decisions.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
