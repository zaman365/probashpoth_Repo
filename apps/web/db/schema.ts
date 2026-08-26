import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const userProfiles = sqliteTable('user_profiles', {
  userId: text('user_id').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  locale: text('locale').notNull(),
  activePath: text('active_path').notNull(),
  passportJson: text('passport_json').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const journeys = sqliteTable(
  'journeys',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    path: text('path').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id'),
    title: text('title').notNull(),
    destinationCountry: text('destination_country'),
    stage: text('stage').notNull(),
    status: text('status').notNull(),
    detailsJson: text('details_json').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_journeys_user_status').on(table.userId, table.status),
    index('idx_journeys_user_path').on(table.userId, table.path),
  ],
);

export const journeyTasks = sqliteTable(
  'journey_tasks',
  {
    id: text('id').primaryKey(),
    journeyId: text('journey_id').notNull(),
    userId: text('user_id').notNull(),
    taskKey: text('task_key').notNull(),
    titleBn: text('title_bn').notNull(),
    titleEn: text('title_en').notNull(),
    detailBn: text('detail_bn').notNull(),
    detailEn: text('detail_en').notNull(),
    status: text('status').notNull(),
    position: integer('position').notNull(),
    dueAt: text('due_at'),
    completedAt: text('completed_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_tasks_journey_key').on(table.journeyId, table.taskKey),
    index('idx_tasks_user_status').on(table.userId, table.status),
  ],
);

export const journeyRecords = sqliteTable(
  'journey_records',
  {
    id: text('id').primaryKey(),
    journeyId: text('journey_id').notNull(),
    userId: text('user_id').notNull(),
    recordType: text('record_type').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull(),
    notes: text('notes'),
    dueAt: text('due_at'),
    amountMinor: integer('amount_minor'),
    currency: text('currency'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_records_journey_status').on(table.journeyId, table.status),
    index('idx_records_user_due').on(table.userId, table.dueAt),
  ],
);

export const savedOpportunities = sqliteTable(
  'saved_opportunities',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    path: text('path').notNull(),
    opportunityType: text('opportunity_type').notNull(),
    opportunityId: text('opportunity_id').notNull(),
    title: text('title').notNull(),
    detailsJson: text('details_json').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_saved_user_opportunity').on(
      table.userId,
      table.opportunityType,
      table.opportunityId,
    ),
  ],
);

export const documents = sqliteTable(
  'documents',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    journeyId: text('journey_id'),
    category: text('category').notNull(),
    label: text('label').notNull(),
    filename: text('filename').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    objectKey: text('object_key').notNull(),
    verificationStatus: text('verification_status').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_documents_user_created').on(table.userId, table.createdAt),
    uniqueIndex('idx_documents_object_key').on(table.objectKey),
  ],
);

export const ledgerEntries = sqliteTable(
  'ledger_entries',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    journeyId: text('journey_id'),
    entryType: text('entry_type').notNull(),
    label: text('label').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').notNull(),
    payee: text('payee'),
    status: text('status').notNull(),
    legalBasis: text('legal_basis'),
    receiptDocumentId: text('receipt_document_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_ledger_user_created').on(table.userId, table.createdAt)],
);

export const verificationRequests = sqliteTable(
  'verification_requests',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    kind: text('kind').notNull(),
    subject: text('subject').notNull(),
    evidence: text('evidence'),
    status: text('status').notNull(),
    resultJson: text('result_json').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_verification_user_status').on(table.userId, table.status)],
);

export const delegations = sqliteTable(
  'delegations',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    journeyId: text('journey_id'),
    delegateContact: text('delegate_contact').notNull(),
    relationship: text('relationship').notNull(),
    permissionsJson: text('permissions_json').notNull(),
    status: text('status').notNull(),
    createdAt: text('created_at').notNull(),
    revokedAt: text('revoked_at'),
  },
  (table) => [index('idx_delegations_user_status').on(table.userId, table.status)],
);

export const alerts = sqliteTable(
  'alerts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    journeyId: text('journey_id'),
    alertType: text('alert_type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    severity: text('severity').notNull(),
    readAt: text('read_at'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_alerts_user_read').on(table.userId, table.readAt)],
);

export const supportTickets = sqliteTable(
  'support_tickets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    journeyId: text('journey_id'),
    priority: text('priority').notNull(),
    category: text('category').notNull(),
    subject: text('subject').notNull(),
    message: text('message').notNull(),
    status: text('status').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_support_user_status').on(table.userId, table.status)],
);

export const partnerSubmissions = sqliteTable(
  'partner_submissions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    portalType: text('portal_type').notNull(),
    organizationName: text('organization_name').notNull(),
    countryCode: text('country_code'),
    submissionType: text('submission_type').notNull(),
    title: text('title').notNull(),
    evidence: text('evidence').notNull(),
    feeDeclaration: text('fee_declaration'),
    status: text('status').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_partner_submissions_user_status').on(table.userId, table.status)],
);

export const outcomeReports = sqliteTable(
  'outcome_reports',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    journeyId: text('journey_id').notNull(),
    path: text('path').notNull(),
    reachedDestination: integer('reached_destination', { mode: 'boolean' }).notNull(),
    primaryOutcome: text('primary_outcome').notNull(),
    promiseMatched: text('promise_matched').notNull(),
    costMatched: text('cost_matched').notNull(),
    actualCostMinor: integer('actual_cost_minor'),
    currency: text('currency'),
    notes: text('notes'),
    consentGiven: integer('consent_given', { mode: 'boolean' }).notNull(),
    reviewStatus: text('review_status').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_outcome_reports_user_review').on(table.userId, table.reviewStatus)],
);

export const auditEvents = sqliteTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id').notNull(),
    detailsJson: text('details_json').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_audit_user_created').on(table.userId, table.createdAt)],
);
