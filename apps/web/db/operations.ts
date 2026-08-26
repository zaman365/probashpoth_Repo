import {
  assessMigrationPassport,
  buildPreparationPlan,
  type MigrationPassport,
} from '@probash/domain';
import type { ChatGPTUser } from '@/app/chatgpt-auth';
import { translator } from '@/lib/i18n';
import { getD1, getFiles, getOperationalDatabase } from './index';
import { requireSensitiveDocumentGate } from '@/lib/release-gates';
import { env } from 'cloudflare:workers';
import { Client } from 'pg';

export type JourneyPath = 'work' | 'study';
export type JourneyStatus = 'active' | 'paused' | 'completed' | 'withdrawn';
export type JourneyStage = 'exploring' | 'preparing' | 'applying' | 'progressing';

export interface OperationalProfile {
  userId: string;
  email: string;
  displayName: string | null;
  locale: string;
  activePath: JourneyPath | 'both' | 'unsure';
  enabledPaths: JourneyPath[];
  journeyStage: JourneyStage;
  goalTitle: string | null;
  onboardingCompletedAt: string | null;
  passport: MigrationPassport;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalTask {
  id: string;
  journeyId: string;
  taskKey: string;
  title: { bn: string; en: string };
  detail: { bn: string; en: string };
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  position: number;
  dueAt: string | null;
  completedAt: string | null;
}

export interface OperationalJourneyRecord {
  id: string;
  journeyId: string;
  recordType: string;
  title: string;
  status: string;
  notes: string | null;
  dueAt: string | null;
  amountMinor: number | null;
  currency: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalJourney {
  id: string;
  path: JourneyPath;
  targetType: string;
  targetId: string | null;
  title: string;
  destinationCountry: string | null;
  stage: string;
  status: JourneyStatus;
  details: Record<string, unknown>;
  tasks: OperationalTask[];
  createdAt: string;
  updatedAt: string;
}

export interface OperationalDocument {
  id: string;
  journeyId: string | null;
  category: string;
  label: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  verificationStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalLedgerEntry {
  id: string;
  journeyId: string | null;
  entryType: string;
  label: string;
  amountMinor: number;
  currency: string;
  payee: string | null;
  status: string;
  legalBasis: string | null;
  receiptDocumentId: string | null;
  createdAt: string;
}

export interface OperationalVerification {
  id: string;
  kind: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalDelegation {
  id: string;
  journeyId: string | null;
  delegateContact: string;
  relationship: string;
  permissions: string[];
  status: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface OperationalAlert {
  id: string;
  journeyId: string | null;
  alertType: string;
  title: string;
  body: string;
  severity: string;
  readAt: string | null;
  createdAt: string;
}

export interface OperationalSupportTicket {
  id: string;
  journeyId: string | null;
  priority: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalPartnerSubmission {
  id: string;
  portalType: string;
  organizationName: string;
  countryCode: string | null;
  submissionType: string;
  title: string;
  evidence: string;
  feeDeclaration: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalOutcomeReport {
  id: string;
  journeyId: string;
  path: JourneyPath;
  reachedDestination: boolean;
  primaryOutcome: string;
  promiseMatched: string;
  costMatched: string;
  actualCostMinor: number | null;
  currency: string | null;
  notes: string | null;
  reviewStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalWorkspace {
  profile: OperationalProfile | null;
  journeys: OperationalJourney[];
  records: OperationalJourneyRecord[];
  documents: OperationalDocument[];
  ledger: OperationalLedgerEntry[];
  verifications: OperationalVerification[];
  delegations: OperationalDelegation[];
  alerts: OperationalAlert[];
  supportTickets: OperationalSupportTicket[];
  partnerSubmissions: OperationalPartnerSubmission[];
  outcomes: OperationalOutcomeReport[];
  pendingVerifications: number;
  activeDelegations: number;
  unreadAlerts: number;
  openSupportTickets: number;
}

const EMPTY_PASSPORT: MigrationPassport = {
  intent: 'unsure',
  identity: {},
  education: {},
  professional: {},
  study: {},
  language: {},
  finance: {},
  documents: {},
  preferences: { destinationCountries: [] },
};

const WORK_TASKS = [
  [
    'passport',
    'মাইগ্রেশন পাসপোর্ট সম্পূর্ণ করুন',
    'Complete your Migration Passport',
    'যে তথ্য জানা নেই তা অনুমান না করে নিশ্চিত করুন।',
    'Confirm unknown facts instead of guessing.',
  ],
  [
    'verify',
    'চাকরি, নিয়োগকর্তা ও রিক্রুটার যাচাই করুন',
    'Verify the job, employer and recruiter',
    'চুক্তি বা অর্থ দেওয়ার আগে প্রতিটি পক্ষ ও দাবির প্রমাণ দেখুন।',
    'Check evidence for every party and claim before signing or paying.',
  ],
  [
    'cost',
    'সম্পূর্ণ খরচ পরিকল্পনা নিশ্চিত করুন',
    'Confirm the complete cost plan',
    'সরকারি, প্রত্যাশিত, চাওয়া ও পরিশোধিত অর্থ আলাদা রাখুন।',
    'Keep official, expected, requested and paid amounts separate.',
  ],
  [
    'documents',
    'প্রয়োজনীয় নথি প্রস্তুত করুন',
    'Prepare the required documents',
    'শুধু বর্তমান রুটের জন্য প্রয়োজনীয় নথি সংগ্রহ করুন।',
    'Collect only the documents required for the current route.',
  ],
  [
    'application',
    'আবেদন ও সাক্ষাৎকার সম্পন্ন করুন',
    'Complete application and interview',
    'জমা দেওয়া তথ্য ও প্রতিটি স্ট্যাটাসের প্রমাণ সংরক্ষণ করুন।',
    'Keep evidence of submissions and every status change.',
  ],
  [
    'permit',
    'ভিসা, পারমিট ও বিএমইটি ধাপ ট্র্যাক করুন',
    'Track visa, permit and BMET steps',
    'শুধু অফিসিয়াল চ্যানেল ও যাচাইকৃত সেবা ব্যবহার করুন।',
    'Use official channels and verified services only.',
  ],
  [
    'departure',
    'প্রি-ডিপার্চার ও নিরাপত্তা প্রস্তুতি নিন',
    'Complete pre-departure and safety preparation',
    'চুক্তি, জরুরি যোগাযোগ, অধিকার ও আগমনের পরিকল্পনা সঙ্গে রাখুন।',
    'Carry the contract, emergency contacts, rights and arrival plan.',
  ],
  [
    'outcome',
    'আগমনের পর প্রতিশ্রুতি বনাম বাস্তব নথিভুক্ত করুন',
    'Record promised versus actual after arrival',
    'বেতন, কাজ, খরচ ও নিরাপত্তার পার্থক্য সম্মতিতে জানান।',
    'Report salary, work, cost and safety differences with consent.',
  ],
] as const;

const STUDY_TASKS = [
  [
    'passport',
    'স্টুডেন্ট পাসপোর্ট সম্পূর্ণ করুন',
    'Complete your Student Passport',
    'একাডেমিক, টেস্ট, বাজেট ও গবেষণা তথ্য প্রমাণসহ পূরণ করুন।',
    'Complete academic, test, budget and research facts with evidence.',
  ],
  [
    'match',
    'দেশ ও প্রোগ্রামের যোগ্যতা মিলিয়ে দেখুন',
    'Match country and programme eligibility',
    'হার্ড যোগ্যতা, অজানা তথ্য ও পছন্দের ফিট আলাদা রাখুন।',
    'Separate hard eligibility, unknown facts and preference fit.',
  ],
  [
    'shortlist',
    'প্রোগ্রাম শর্টলিস্ট নিশ্চিত করুন',
    'Confirm the programme shortlist',
    'স্বীকৃতি, ডেডলাইন, মোট খরচ ও ফলাফল তুলনা করুন।',
    'Compare recognition, deadlines, total cost and outcomes.',
  ],
  [
    'materials',
    'আবেদন উপকরণ প্রস্তুত করুন',
    'Prepare application materials',
    'সিভি, SOP, LOR, পোর্টফোলিও বা গবেষণা প্রস্তাবে সত্য তথ্য ব্যবহার করুন।',
    'Use truthful facts in the CV, SOP, LOR, portfolio or proposal.',
  ],
  [
    'funding',
    'স্কলারশিপ ও অর্থায়ন পরিকল্পনা করুন',
    'Plan scholarship and funding',
    'টিউশন, জীবনযাত্রা, প্রুফ অব ফান্ড ও ঘাটতি একসঙ্গে দেখুন।',
    'Plan tuition, living costs, proof of funds and the remaining gap together.',
  ],
  [
    'application',
    'আবেদন, অফার ও ভর্তি যাচাই করুন',
    'Track application, offer and admission',
    'অফিসিয়াল ডোমেইন, প্রোগ্রাম ও পেমেন্ট প্রাপক মিলিয়ে দেখুন।',
    'Match the official domain, programme and payment recipient.',
  ],
  [
    'visa',
    'স্টুডেন্ট ভিসা ও প্রি-ডিপার্চার সম্পন্ন করুন',
    'Complete student visa and pre-departure',
    'নথি, সাক্ষাৎকার, বাসস্থান, বীমা ও আগমনের পরিকল্পনা রাখুন।',
    'Prepare documents, interview, housing, insurance and arrival.',
  ],
  [
    'outcome',
    'স্টাডি ও পোস্ট-স্টাডি ফলাফল নথিভুক্ত করুন',
    'Record study and post-study outcomes',
    'ভর্তি, খরচ, অগ্রগতি, কাজ ও দীর্ঘমেয়াদি পথ আপডেট করুন।',
    'Update enrolment, cost, progress, work and the long-term path.',
  ],
] as const;

let schemaReady: Promise<void> | null = null;

export function ensureOperationalSchema(): Promise<void> {
  if (env.STORAGE_DRIVER === 'postgres') return Promise.resolve();
  schemaReady ??= createOperationalSchema();
  return schemaReady;
}

async function createOperationalSchema(): Promise<void> {
  const db = getD1();
  const statements = [
    `CREATE TABLE IF NOT EXISTS user_profiles (user_id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL, display_name TEXT, locale TEXT NOT NULL, active_path TEXT NOT NULL, enabled_paths TEXT NOT NULL DEFAULT '["work","study"]', journey_stage TEXT NOT NULL DEFAULT 'exploring', goal_title TEXT, onboarding_completed_at TEXT, passport_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS journeys (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, path TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT, title TEXT NOT NULL, destination_country TEXT, stage TEXT NOT NULL, status TEXT NOT NULL, details_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS journey_tasks (id TEXT PRIMARY KEY NOT NULL, journey_id TEXT NOT NULL, user_id TEXT NOT NULL, task_key TEXT NOT NULL, title_bn TEXT NOT NULL, title_en TEXT NOT NULL, detail_bn TEXT NOT NULL, detail_en TEXT NOT NULL, status TEXT NOT NULL, position INTEGER NOT NULL, due_at TEXT, completed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS journey_records (id TEXT PRIMARY KEY NOT NULL, journey_id TEXT NOT NULL, user_id TEXT NOT NULL, record_type TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL, notes TEXT, due_at TEXT, amount_minor INTEGER, currency TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS saved_opportunities (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, path TEXT NOT NULL, opportunity_type TEXT NOT NULL, opportunity_id TEXT NOT NULL, title TEXT NOT NULL, details_json TEXT NOT NULL, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, journey_id TEXT, category TEXT NOT NULL, label TEXT NOT NULL, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, object_key TEXT NOT NULL, verification_status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS ledger_entries (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, journey_id TEXT, entry_type TEXT NOT NULL, label TEXT NOT NULL, amount_minor INTEGER NOT NULL, currency TEXT NOT NULL, payee TEXT, status TEXT NOT NULL, legal_basis TEXT, receipt_document_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS verification_requests (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, kind TEXT NOT NULL, subject TEXT NOT NULL, evidence TEXT, status TEXT NOT NULL, result_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS delegations (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, journey_id TEXT, delegate_contact TEXT NOT NULL, relationship TEXT NOT NULL, permissions_json TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, revoked_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS alerts (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, journey_id TEXT, alert_type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, severity TEXT NOT NULL, read_at TEXT, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS support_tickets (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, journey_id TEXT, priority TEXT NOT NULL, category TEXT NOT NULL, subject TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS partner_submissions (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, portal_type TEXT NOT NULL, organization_name TEXT NOT NULL, country_code TEXT, submission_type TEXT NOT NULL, title TEXT NOT NULL, evidence TEXT NOT NULL, fee_declaration TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS outcome_reports (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, journey_id TEXT NOT NULL, path TEXT NOT NULL, reached_destination INTEGER NOT NULL, primary_outcome TEXT NOT NULL, promise_matched TEXT NOT NULL, cost_matched TEXT NOT NULL, actual_cost_minor INTEGER, currency TEXT, notes TEXT, consent_given INTEGER NOT NULL, review_status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id TEXT NOT NULL, details_json TEXT NOT NULL, created_at TEXT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_journeys_user_status ON journeys(user_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_journeys_user_path ON journeys(user_id, path)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_journey_key ON journey_tasks(journey_id, task_key)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON journey_tasks(user_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_records_journey_status ON journey_records(journey_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_records_user_due ON journey_records(user_id, due_at)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_user_opportunity ON saved_opportunities(user_id, opportunity_type, opportunity_id)`,
    `CREATE INDEX IF NOT EXISTS idx_documents_user_created ON documents(user_id, created_at)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_object_key ON documents(object_key)`,
    `CREATE INDEX IF NOT EXISTS idx_ledger_user_created ON ledger_entries(user_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_verification_user_status ON verification_requests(user_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_delegations_user_status ON delegations(user_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_alerts_user_read ON alerts(user_id, read_at)`,
    `CREATE INDEX IF NOT EXISTS idx_support_user_status ON support_tickets(user_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_partner_submissions_user_status ON partner_submissions(user_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_outcome_reports_user_review ON outcome_reports(user_id, review_status)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_user_created ON audit_events(user_id, created_at)`,
  ];
  await db.batch(statements.map((statement) => db.prepare(statement)));
  const profileColumns = await db
    .prepare('PRAGMA table_info(user_profiles)')
    .all<{ name: string }>();
  const columnNames = new Set(profileColumns.results.map((column) => column.name));
  const profileUpgrades = [
    !columnNames.has('enabled_paths')
      ? `ALTER TABLE user_profiles ADD COLUMN enabled_paths TEXT NOT NULL DEFAULT '["work","study"]'`
      : null,
    !columnNames.has('journey_stage')
      ? `ALTER TABLE user_profiles ADD COLUMN journey_stage TEXT NOT NULL DEFAULT 'exploring'`
      : null,
    !columnNames.has('goal_title') ? `ALTER TABLE user_profiles ADD COLUMN goal_title TEXT` : null,
    !columnNames.has('onboarding_completed_at')
      ? `ALTER TABLE user_profiles ADD COLUMN onboarding_completed_at TEXT`
      : null,
  ].filter((statement): statement is string => Boolean(statement));
  if (profileUpgrades.length > 0) {
    await db.batch(profileUpgrades.map((statement) => db.prepare(statement)));
  }
  await db.prepare('PRAGMA optimize').run();
}

function now(): string {
  return new Date().toISOString();
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value !== null && typeof value === 'object') return value as T;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function audit(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  await getOperationalDatabase(userId)
    .prepare(
      'INSERT INTO audit_events (id, user_id, action, resource_type, resource_id, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      crypto.randomUUID(),
      userId,
      action,
      resourceType,
      resourceId,
      JSON.stringify(details),
      now(),
    )
    .run();
}

export async function savePassport(
  user: ChatGPTUser,
  locale: string,
  passport: MigrationPassport,
): Promise<OperationalProfile> {
  await ensureOperationalSchema();
  const encoded = JSON.stringify(passport);
  if (encoded.length > 64_000) throw new Error('Passport payload is too large.');
  const activePath =
    passport.intent === 'work' || passport.intent === 'study' || passport.intent === 'both'
      ? passport.intent
      : 'unsure';
  const enabledPaths: JourneyPath[] =
    activePath === 'both'
      ? ['work', 'study']
      : activePath === 'work' || activePath === 'study'
        ? [activePath]
        : ['work', 'study'];
  const timestamp = now();
  await getOperationalDatabase(user.userId)
    .prepare(
      `INSERT INTO user_profiles (user_id, email, display_name, locale, active_path, enabled_paths, journey_stage, passport_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'exploring', ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET email = excluded.email, display_name = excluded.display_name,
         locale = excluded.locale,
         active_path = CASE WHEN user_profiles.onboarding_completed_at IS NULL THEN excluded.active_path ELSE user_profiles.active_path END,
         enabled_paths = CASE WHEN user_profiles.onboarding_completed_at IS NULL THEN excluded.enabled_paths ELSE user_profiles.enabled_paths END,
         passport_json = excluded.passport_json,
         updated_at = excluded.updated_at`,
    )
    .bind(
      user.userId,
      user.email,
      user.fullName,
      locale,
      activePath,
      JSON.stringify(enabledPaths),
      encoded,
      timestamp,
      timestamp,
    )
    .run();
  await audit(user.userId, 'passport.saved', 'user_profile', user.userId, { activePath });
  const profile = await getProfile(user.userId);
  if (!profile) throw new Error('Profile could not be read after saving.');
  return profile;
}

export async function completeOnboarding(
  user: ChatGPTUser,
  locale: string,
  input: {
    path: JourneyPath;
    enabledPaths: JourneyPath[];
    stage: JourneyStage;
    goalTitle?: string;
  },
): Promise<OperationalProfile> {
  await ensureOperationalSchema();
  const timestamp = now();
  const passport: MigrationPassport = {
    ...EMPTY_PASSPORT,
    intent: input.enabledPaths.length === 2 ? 'both' : input.path,
  };
  const goalTitle = input.goalTitle?.trim().slice(0, 180) || null;
  await getOperationalDatabase(user.userId)
    .prepare(
      `INSERT INTO user_profiles (
        user_id, email, display_name, locale, active_path, enabled_paths, journey_stage, goal_title,
        onboarding_completed_at, passport_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        email = excluded.email,
        display_name = excluded.display_name,
        locale = excluded.locale,
        active_path = excluded.active_path,
        enabled_paths = excluded.enabled_paths,
        journey_stage = excluded.journey_stage,
        goal_title = excluded.goal_title,
        onboarding_completed_at = COALESCE(user_profiles.onboarding_completed_at, excluded.onboarding_completed_at),
        updated_at = excluded.updated_at`,
    )
    .bind(
      user.userId,
      user.email,
      user.fullName,
      locale,
      input.path,
      JSON.stringify(input.enabledPaths),
      input.stage,
      goalTitle,
      timestamp,
      JSON.stringify(passport),
      timestamp,
      timestamp,
    )
    .run();
  if (env.STORAGE_DRIVER === 'postgres') {
    const roles = input.enabledPaths.map((path) => (path === 'work' ? 'worker' : 'student'));
    await getOperationalDatabase(user.userId)
      .prepare('UPDATE app_user SET roles = ?::text[] WHERE id = ?')
      .bind(roles, user.userId)
      .run();
  }
  await audit(user.userId, 'onboarding.completed', 'user_profile', user.userId, {
    path: input.path,
    enabledPaths: input.enabledPaths,
    stage: input.stage,
  });
  const profile = await getProfile(user.userId);
  if (!profile) throw new Error('Profile could not be read after onboarding.');
  return profile;
}

export async function updateProfileDirection(
  userId: string,
  input: {
    path: JourneyPath;
    enabledPaths: JourneyPath[];
    stage: JourneyStage;
    goalTitle?: string;
  },
): Promise<void> {
  await ensureOperationalSchema();
  const profile = await getProfile(userId);
  if (!profile) throw new Error('Profile not found.');
  const goalTitle = input.goalTitle?.trim().slice(0, 180) || null;
  const passport: MigrationPassport = {
    ...profile.passport,
    intent: input.enabledPaths.length === 2 ? 'both' : input.path,
  };
  const result = await getOperationalDatabase(userId)
    .prepare(
      `UPDATE user_profiles
       SET active_path = ?, enabled_paths = ?, journey_stage = ?, goal_title = ?, passport_json = ?, updated_at = ?
       WHERE user_id = ?`,
    )
    .bind(
      input.path,
      JSON.stringify(input.enabledPaths),
      input.stage,
      goalTitle,
      JSON.stringify(passport),
      now(),
      userId,
    )
    .run();
  if (!result.meta.changes) throw new Error('Profile not found.');
  await audit(userId, 'profile.direction_updated', 'user_profile', userId, {
    path: input.path,
    enabledPaths: input.enabledPaths,
    stage: input.stage,
  });
}

export async function setActiveWorkspace(userId: string, path: JourneyPath): Promise<void> {
  await ensureOperationalSchema();
  const profile = await getProfile(userId);
  if (!profile || !profile.enabledPaths.includes(path)) {
    throw new Error('Workspace is not enabled for this account.');
  }
  const result = await getOperationalDatabase(userId)
    .prepare('UPDATE user_profiles SET active_path = ?, updated_at = ? WHERE user_id = ?')
    .bind(path, now(), userId)
    .run();
  if (!result.meta.changes) throw new Error('Profile not found.');
  await audit(userId, 'profile.workspace_switched', 'user_profile', userId, { path });
}

export async function getProfile(userId: string): Promise<OperationalProfile | null> {
  await ensureOperationalSchema();
  const row = await getOperationalDatabase(userId)
    .prepare('SELECT * FROM user_profiles WHERE user_id = ? LIMIT 1')
    .bind(userId)
    .first<Record<string, unknown>>();
  if (!row) return null;
  const fallbackPaths: JourneyPath[] = ['work', 'study'];
  const enabledPaths = parseJson<unknown>(row['enabled_paths'], fallbackPaths);
  const safeEnabledPaths = Array.isArray(enabledPaths)
    ? enabledPaths.filter((path): path is JourneyPath => path === 'work' || path === 'study')
    : fallbackPaths;
  return {
    userId: String(row['user_id']),
    email: String(row['email']),
    displayName: row['display_name'] ? String(row['display_name']) : null,
    locale: String(row['locale']),
    activePath: String(row['active_path']) as OperationalProfile['activePath'],
    enabledPaths: safeEnabledPaths.length > 0 ? [...new Set(safeEnabledPaths)] : fallbackPaths,
    journeyStage: String(row['journey_stage'] ?? 'exploring') as JourneyStage,
    goalTitle: row['goal_title'] ? String(row['goal_title']) : null,
    onboardingCompletedAt: row['onboarding_completed_at']
      ? String(row['onboarding_completed_at'])
      : null,
    passport: parseJson(row['passport_json'], EMPTY_PASSPORT),
    createdAt: String(row['created_at']),
    updatedAt: String(row['updated_at']),
  };
}

export async function createJourney(
  userId: string,
  input: {
    path: JourneyPath;
    targetType: string;
    targetId?: string;
    title: string;
    destinationCountry?: string;
    details?: Record<string, unknown>;
  },
): Promise<string> {
  await ensureOperationalSchema();
  if (input.targetId) {
    const existing = await getOperationalDatabase(userId)
      .prepare(
        "SELECT id FROM journeys WHERE user_id = ? AND target_type = ? AND target_id = ? AND status = 'active' LIMIT 1",
      )
      .bind(userId, input.targetType, input.targetId)
      .first<{ id: string }>();
    if (existing) return existing.id;
  }

  const id = crypto.randomUUID();
  const timestamp = now();
  const profile = await getProfile(userId);
  const readinessTasks = profile
    ? buildPreparationPlan(assessMigrationPassport(profile.passport, input.path)).map((task) => {
        const tBn = translator('bn-BD');
        const tEn = translator('en');
        return [
          `readiness_${task.id.replace(':', '_')}`,
          tBn(task.labelKey),
          tEn(task.labelKey),
          tBn(task.actionKey),
          tEn(task.actionKey),
        ] as const;
      })
    : [];
  const tasks = [...readinessTasks, ...(input.path === 'work' ? WORK_TASKS : STUDY_TASKS)];
  const db = getOperationalDatabase(userId);
  const statements = [
    db
      .prepare(
        `INSERT INTO journeys (id, user_id, path, target_type, target_id, title, destination_country, stage, status, details_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'discovery', 'active', ?, ?, ?)`,
      )
      .bind(
        id,
        userId,
        input.path,
        input.targetType,
        input.targetId ?? null,
        input.title.slice(0, 240),
        input.destinationCountry ?? null,
        JSON.stringify(input.details ?? {}),
        timestamp,
        timestamp,
      ),
    ...tasks.map((task, index) =>
      db
        .prepare(
          `INSERT INTO journey_tasks (id, journey_id, user_id, task_key, title_bn, title_en, detail_bn, detail_en, status, position, due_at, completed_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'todo', ?, NULL, NULL, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          id,
          userId,
          task[0],
          task[1],
          task[2],
          task[3],
          task[4],
          index + 1,
          timestamp,
          timestamp,
        ),
    ),
  ];
  await db.batch(statements);
  await audit(userId, 'journey.created', 'journey', id, {
    path: input.path,
    targetType: input.targetType,
    targetId: input.targetId,
  });
  return id;
}

export async function completeJourneyTask(userId: string, journeyId: string, taskId: string) {
  await ensureOperationalSchema();
  const timestamp = now();
  const result = await getOperationalDatabase(userId)
    .prepare(
      "UPDATE journey_tasks SET status = 'done', completed_at = ?, updated_at = ? WHERE id = ? AND journey_id = ? AND user_id = ?",
    )
    .bind(timestamp, timestamp, taskId, journeyId, userId)
    .run();
  if (!result.meta.changes) throw new Error('Task not found.');
  await getOperationalDatabase(userId)
    .prepare('UPDATE journeys SET updated_at = ? WHERE id = ? AND user_id = ?')
    .bind(timestamp, journeyId, userId)
    .run();
  await audit(userId, 'journey.task.completed', 'journey_task', taskId, { journeyId });
}

export async function addJourneyRecord(
  userId: string,
  input: {
    journeyId: string;
    recordType: string;
    title: string;
    status: string;
    notes?: string;
    dueAt?: string;
    amountMinor?: number;
    currency?: string;
  },
): Promise<string> {
  await ensureOperationalSchema();
  const id = crypto.randomUUID();
  const timestamp = now();
  const result = await getOperationalDatabase(userId)
    .prepare(
      `INSERT INTO journey_records
        (id, journey_id, user_id, record_type, title, status, notes, due_at, amount_minor, currency, created_at, updated_at)
       SELECT ?, id, user_id, ?, ?, ?, ?, ?, ?, ?, ?, ?
       FROM journeys WHERE id = ? AND user_id = ?`,
    )
    .bind(
      id,
      input.recordType.slice(0, 60),
      input.title.slice(0, 240),
      input.status.slice(0, 40),
      input.notes?.slice(0, 4000) ?? null,
      input.dueAt || null,
      input.amountMinor ?? null,
      input.currency?.slice(0, 3).toUpperCase() ?? null,
      timestamp,
      timestamp,
      input.journeyId,
      userId,
    )
    .run();
  if (!result.meta.changes) throw new Error('Journey not found.');

  if (input.dueAt) {
    await getOperationalDatabase(userId)
      .prepare(
        `INSERT INTO alerts (id, user_id, journey_id, alert_type, title, body, severity, read_at, created_at)
         VALUES (?, ?, ?, 'deadline', ?, ?, 'info', NULL, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        userId,
        input.journeyId,
        input.title.slice(0, 240),
        `Deadline: ${input.dueAt}`,
        timestamp,
      )
      .run();
  }
  await audit(userId, 'journey.record.created', 'journey_record', id, {
    journeyId: input.journeyId,
    recordType: input.recordType,
  });
  return id;
}

export async function setJourneyRecordStatus(
  userId: string,
  journeyId: string,
  recordId: string,
  status: string,
): Promise<void> {
  await ensureOperationalSchema();
  const timestamp = now();
  const result = await getOperationalDatabase(userId)
    .prepare(
      'UPDATE journey_records SET status = ?, updated_at = ? WHERE id = ? AND journey_id = ? AND user_id = ?',
    )
    .bind(status.slice(0, 40), timestamp, recordId, journeyId, userId)
    .run();
  if (!result.meta.changes) throw new Error('Record not found.');
  await audit(userId, 'journey.record.status_changed', 'journey_record', recordId, {
    journeyId,
    status,
  });
}

export async function markAlertRead(userId: string, alertId: string): Promise<void> {
  await ensureOperationalSchema();
  const result = await getOperationalDatabase(userId)
    .prepare('UPDATE alerts SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL')
    .bind(now(), alertId, userId)
    .run();
  if (result.meta.changes) await audit(userId, 'alert.read', 'alert', alertId);
}

export async function addLedgerEntry(
  userId: string,
  input: {
    journeyId?: string;
    label: string;
    amountMinor: number;
    currency: string;
    payee?: string;
    legalBasis?: string;
  },
): Promise<string> {
  await ensureOperationalSchema();
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0)
    throw new Error('Invalid amount.');
  const id = crypto.randomUUID();
  const timestamp = now();
  await getOperationalDatabase(userId)
    .prepare(
      `INSERT INTO ledger_entries (id, user_id, journey_id, entry_type, label, amount_minor, currency, payee, status, legal_basis, receipt_document_id, created_at, updated_at) VALUES (?, ?, ?, 'requested', ?, ?, ?, ?, 'unverified', ?, NULL, ?, ?)`,
    )
    .bind(
      id,
      userId,
      input.journeyId ?? null,
      input.label.slice(0, 180),
      input.amountMinor,
      input.currency,
      input.payee ?? null,
      input.legalBasis ?? null,
      timestamp,
      timestamp,
    )
    .run();
  await audit(userId, 'ledger.entry.created', 'ledger_entry', id, { journeyId: input.journeyId });
  return id;
}

export async function addDelegation(
  userId: string,
  input: { journeyId?: string; contact: string; relationship: string; permissions: string[] },
): Promise<string> {
  await ensureOperationalSchema();
  const id = crypto.randomUUID();
  await getOperationalDatabase(userId)
    .prepare(
      `INSERT INTO delegations (id, user_id, journey_id, delegate_contact, relationship, permissions_json, status, created_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, NULL)`,
    )
    .bind(
      id,
      userId,
      input.journeyId ?? null,
      input.contact.slice(0, 180),
      input.relationship,
      JSON.stringify(input.permissions),
      now(),
    )
    .run();
  await audit(userId, 'delegation.created', 'delegation', id, { journeyId: input.journeyId });
  return id;
}

export async function revokeDelegation(userId: string, delegationId: string): Promise<void> {
  await ensureOperationalSchema();
  const timestamp = now();
  const result = await getOperationalDatabase(userId)
    .prepare(
      "UPDATE delegations SET status = 'revoked', revoked_at = ? WHERE id = ? AND user_id = ? AND status = 'active'",
    )
    .bind(timestamp, delegationId, userId)
    .run();
  if (result.meta.changes) {
    await audit(userId, 'delegation.revoked', 'delegation', delegationId);
  }
}

export async function createVerificationRequest(
  userId: string,
  input: { kind: string; subject: string; evidence?: string },
): Promise<string> {
  await ensureOperationalSchema();
  const id = crypto.randomUUID();
  const timestamp = now();
  await getOperationalDatabase(userId)
    .prepare(
      `INSERT INTO verification_requests (id, user_id, kind, subject, evidence, status, result_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'submitted', '{}', ?, ?)`,
    )
    .bind(
      id,
      userId,
      input.kind,
      input.subject.slice(0, 500),
      input.evidence?.slice(0, 4000) ?? null,
      timestamp,
      timestamp,
    )
    .run();
  await audit(userId, 'verification.submitted', 'verification_request', id, { kind: input.kind });
  return id;
}

export async function createSupportTicket(
  userId: string,
  input: {
    journeyId?: string;
    priority: string;
    category: string;
    subject: string;
    message: string;
  },
): Promise<string> {
  await ensureOperationalSchema();
  const id = crypto.randomUUID();
  const timestamp = now();
  await getOperationalDatabase(userId)
    .prepare(
      `INSERT INTO support_tickets (id, user_id, journey_id, priority, category, subject, message, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
    )
    .bind(
      id,
      userId,
      input.journeyId ?? null,
      input.priority,
      input.category,
      input.subject.slice(0, 240),
      input.message.slice(0, 8000),
      timestamp,
      timestamp,
    )
    .run();
  await audit(userId, 'support.created', 'support_ticket', id, {
    priority: input.priority,
    category: input.category,
  });
  return id;
}

export async function createPartnerSubmission(
  userId: string,
  input: {
    portalType: string;
    organizationName: string;
    countryCode?: string;
    submissionType: string;
    title: string;
    evidence: string;
    feeDeclaration?: string;
  },
): Promise<string> {
  await ensureOperationalSchema();
  const id = crypto.randomUUID();
  const timestamp = now();
  await getOperationalDatabase(userId)
    .prepare(
      `INSERT INTO partner_submissions
        (id, user_id, portal_type, organization_name, country_code, submission_type, title, evidence, fee_declaration, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'evidence_submitted', ?, ?)`,
    )
    .bind(
      id,
      userId,
      input.portalType.slice(0, 40),
      input.organizationName.slice(0, 240),
      input.countryCode?.slice(0, 2).toUpperCase() ?? null,
      input.submissionType.slice(0, 60),
      input.title.slice(0, 240),
      input.evidence.slice(0, 8000),
      input.feeDeclaration?.slice(0, 4000) ?? null,
      timestamp,
      timestamp,
    )
    .run();
  await audit(userId, 'partner.evidence_submitted', 'partner_submission', id, {
    portalType: input.portalType,
    submissionType: input.submissionType,
  });
  return id;
}

export async function createOutcomeReport(
  userId: string,
  input: {
    journeyId: string;
    path: JourneyPath;
    reachedDestination: boolean;
    primaryOutcome: string;
    promiseMatched: string;
    costMatched: string;
    actualCostMinor?: number;
    currency?: string;
    notes?: string;
  },
): Promise<string> {
  await ensureOperationalSchema();
  const id = crypto.randomUUID();
  const timestamp = now();
  const result = await getOperationalDatabase(userId)
    .prepare(
      `INSERT INTO outcome_reports
        (id, user_id, journey_id, path, reached_destination, primary_outcome, promise_matched, cost_matched, actual_cost_minor, currency, notes, consent_given, review_status, created_at, updated_at)
       SELECT ?, user_id, id, path, ?, ?, ?, ?, ?, ?, ?, 1, 'pending_human_review', ?, ?
       FROM journeys WHERE id = ? AND user_id = ? AND path = ?`,
    )
    .bind(
      id,
      input.reachedDestination ? 1 : 0,
      input.primaryOutcome.slice(0, 60),
      input.promiseMatched.slice(0, 20),
      input.costMatched.slice(0, 20),
      input.actualCostMinor ?? null,
      input.currency?.slice(0, 3).toUpperCase() ?? null,
      input.notes?.slice(0, 4000) ?? null,
      timestamp,
      timestamp,
      input.journeyId,
      userId,
      input.path,
    )
    .run();
  if (!result.meta.changes) throw new Error('Journey not found.');
  await audit(userId, 'outcome.submitted', 'outcome_report', id, {
    journeyId: input.journeyId,
    path: input.path,
  });
  return id;
}

export async function storeDocument(
  userId: string,
  input: { file: File; category: string; label: string; journeyId?: string },
): Promise<string> {
  const gateEvidenceId = requireSensitiveDocumentGate();
  await ensureOperationalSchema();
  const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
  if (!allowed.has(input.file.type)) throw new Error('Unsupported file type.');
  if (input.file.size < 1 || input.file.size > 10 * 1024 * 1024)
    throw new Error('File must be 10 MB or smaller.');
  const bytes = await input.file.arrayBuffer();
  if (!hasExpectedFileSignature(new Uint8Array(bytes), input.file.type)) {
    throw new Error('The file content does not match its declared type.');
  }
  const checksumSha256 = toHex(await crypto.subtle.digest('SHA-256', bytes));
  const id = crypto.randomUUID();
  const objectKey = `quarantine/${userId}/${id}`;
  if (env.STORAGE_DRIVER === 'postgres') {
    return storePostgresDocument(userId, input, {
      bytes,
      checksumSha256,
      documentId: id,
      objectKey,
      gateEvidenceId,
    });
  }
  await getFiles().put(objectKey, bytes, {
    httpMetadata: { contentType: input.file.type },
    customMetadata: { owner: userId, documentId: id, checksumSha256 },
  });
  const timestamp = now();
  try {
    await getOperationalDatabase(userId)
      .prepare(
        `INSERT INTO documents (id, user_id, journey_id, category, label, filename, mime_type, size_bytes, object_key, verification_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'quarantined', ?, ?)`,
      )
      .bind(
        id,
        userId,
        input.journeyId ?? null,
        input.category,
        input.label.slice(0, 180),
        input.file.name.slice(-240),
        input.file.type,
        input.file.size,
        objectKey,
        timestamp,
        timestamp,
      )
      .run();
  } catch (error) {
    await getFiles().delete(objectKey);
    throw error;
  }
  await audit(userId, 'document.quarantined', 'document', id, {
    category: input.category,
    sizeBytes: input.file.size,
    checksumSha256,
    gateEvidenceId,
  });
  await env.DOCUMENT_SCAN_QUEUE!.send({ jobId: id });
  return id;
}

async function storePostgresDocument(
  userId: string,
  input: { file: File; category: string; label: string; journeyId?: string },
  prepared: {
    bytes: ArrayBuffer;
    checksumSha256: string;
    documentId: string;
    objectKey: string;
    gateEvidenceId: string;
  },
): Promise<string> {
  if (!env.HYPERDRIVE || !env.DOCUMENTS_QUARANTINE) {
    throw new Error('The production document infrastructure is unavailable.');
  }
  const intentId = crypto.randomUUID();
  const jobId = crypto.randomUUID();
  const correlationId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
  let metadataCommitted = false;
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    await client.query(
      `INSERT INTO document_upload_intent
        (id, owner_user_id, case_id, expected_content_type, maximum_bytes,
         expected_sha256, object_key, status, expires_at)
       VALUES ($1, $2, NULL, $3, $4, $5, $6, 'pending', $7)`,
      [
        intentId,
        userId,
        input.file.type,
        input.file.size,
        prepared.checksumSha256,
        prepared.objectKey,
        expiresAt,
      ],
    );
    await client.query(
      `INSERT INTO document
        (id, owner_user_id, case_id, type, label, original_filename, storage_key, content_type,
         byte_size, sha256, verification_level, malware_scan_status)
       VALUES ($1, $2, NULL, $3, $4::jsonb, $5, $6, $7, $8, $9, 'unverified', 'pending')`,
      [
        prepared.documentId,
        userId,
        input.category.slice(0, 60),
        JSON.stringify({ bn: input.label.slice(0, 180), en: input.label.slice(0, 180) }),
        input.file.name.slice(-240),
        prepared.objectKey,
        input.file.type,
        input.file.size,
        prepared.checksumSha256,
      ],
    );
    await client.query(
      `INSERT INTO document_scan_job
        (id, upload_intent_id, document_id, object_key, checksum_sha256, state, correlation_id)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
      [
        jobId,
        intentId,
        prepared.documentId,
        prepared.objectKey,
        prepared.checksumSha256,
        correlationId,
      ],
    );
    await client.query(
      `INSERT INTO documents
        (id, user_id, journey_id, category, label, filename, mime_type,
         size_bytes, object_key, verification_status, created_at, updated_at)
       VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, 'quarantined', now(), now())`,
      [
        prepared.documentId,
        userId,
        input.category.slice(0, 60),
        input.label.slice(0, 180),
        input.file.name.slice(-240),
        input.file.type,
        input.file.size,
        prepared.objectKey,
      ],
    );
    await client.query(
      `INSERT INTO document_event
        (id, document_id, upload_intent_id, owner_user_id, actor_user_id,
         event_type, correlation_id, detail)
       VALUES ($1, $2, $3, $4, $4, 'intent.created', $5, $6::jsonb)`,
      [
        crypto.randomUUID(),
        prepared.documentId,
        intentId,
        userId,
        correlationId,
        JSON.stringify({ gateEvidenceId: prepared.gateEvidenceId }),
      ],
    );
    await client.query('COMMIT');
    metadataCommitted = true;

    await env.DOCUMENTS_QUARANTINE.put(prepared.objectKey, prepared.bytes, {
      httpMetadata: { contentType: input.file.type },
      customMetadata: {
        documentId: prepared.documentId,
        checksumSha256: prepared.checksumSha256,
      },
    });

    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    await client.query(
      `UPDATE document_upload_intent
       SET status = 'queued', consumed_at = now()
       WHERE id = $1 AND status = 'pending' AND expires_at > now()`,
      [intentId],
    );
    await client.query(
      "UPDATE document_scan_job SET state = 'queued', updated_at = now() WHERE id = $1",
      [jobId],
    );
    await client.query(
      `INSERT INTO document_event
        (id, document_id, upload_intent_id, owner_user_id, actor_user_id,
         event_type, correlation_id, detail)
       VALUES ($1, $2, $3, $4, $4, 'scan.queued', $5, $6::jsonb)`,
      [
        crypto.randomUUID(),
        prepared.documentId,
        intentId,
        userId,
        correlationId,
        JSON.stringify({ checksumSha256: prepared.checksumSha256 }),
      ],
    );
    await client.query(
      `INSERT INTO outbox_event (id, event_name, payload)
       VALUES ($1, 'document.scan.requested', $2::jsonb)`,
      [crypto.randomUUID(), JSON.stringify({ jobId })],
    );
    await client.query('COMMIT');
    try {
      await env.DOCUMENT_SCAN_QUEUE!.send({ jobId });
    } catch {
      // The committed outbox event is authoritative. Reconciliation republishes it
      // without asking the user to upload the sensitive file a second time.
      console.error(
        JSON.stringify({
          event: 'document.scan.enqueue_failed',
          jobId,
          correlationId,
          errorCode: 'QUEUE_SEND_FAILED',
        }),
      );
    }
    return prepared.documentId;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Preserve the original error; the outbox/reconciliation runbook handles partial state.
    }
    if (metadataCommitted) {
      try {
        await client.query('BEGIN');
        await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
        await client.query("UPDATE document_upload_intent SET status = 'revoked' WHERE id = $1", [
          intentId,
        ]);
        await client.query(
          `UPDATE document_scan_job
           SET state = 'rejected', last_error_code = 'UPLOAD_COMMIT_FAILED', updated_at = now()
           WHERE id = $1`,
          [jobId],
        );
        await client.query("UPDATE document SET malware_scan_status = 'rejected' WHERE id = $1", [
          prepared.documentId,
        ]);
        await client.query(
          "UPDATE documents SET verification_status = 'rejected', updated_at = now() WHERE id = $1",
          [prepared.documentId],
        );
        await client.query(
          `INSERT INTO document_event
            (id, document_id, upload_intent_id, owner_user_id, actor_user_id,
             event_type, correlation_id, detail)
           VALUES ($1, $2, $3, $4, $4, 'scan.rejected', $5,
             '{"errorCode":"UPLOAD_COMMIT_FAILED"}'::jsonb)`,
          [crypto.randomUUID(), prepared.documentId, intentId, userId, correlationId],
        );
        await client.query('COMMIT');
      } catch {
        await client.query('ROLLBACK');
      }
    }
    await env.DOCUMENTS_QUARANTINE.delete(prepared.objectKey);
    throw error;
  } finally {
    await client.end();
  }
}

export async function getDocumentObject(userId: string, documentId: string) {
  if (env.STORAGE_DRIVER === 'postgres') return getPostgresDocumentObject(userId, documentId);
  await ensureOperationalSchema();
  const row = await getOperationalDatabase(userId)
    .prepare(
      "SELECT object_key, filename, mime_type FROM documents WHERE id = ? AND user_id = ? AND verification_status = 'clean' LIMIT 1",
    )
    .bind(documentId, userId)
    .first<{ object_key: string; filename: string; mime_type: string }>();
  if (!row) return null;
  const object = await getFiles().get(row.object_key);
  if (!object) return null;
  await audit(userId, 'document.downloaded', 'document', documentId);
  return { object, filename: row.filename, mimeType: row.mime_type };
}

async function getPostgresDocumentObject(userId: string, documentId: string) {
  if (!env.HYPERDRIVE || !env.DOCUMENTS_CLEAN) return null;
  const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    const result = await client.query<{
      storage_key: string;
      original_filename: string | null;
      content_type: string;
    }>(
      `SELECT storage_key, original_filename, content_type
       FROM document
       WHERE id = $1 AND owner_user_id = $2
         AND malware_scan_status = 'clean' AND storage_key LIKE 'clean/%'
       LIMIT 1`,
      [documentId, userId],
    );
    const row = result.rows[0];
    if (!row) {
      await client.query('ROLLBACK');
      return null;
    }
    const object = await env.DOCUMENTS_CLEAN.get(row.storage_key);
    if (!object) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query(
      `INSERT INTO document_event
        (id, document_id, owner_user_id, actor_user_id, event_type, correlation_id)
       VALUES ($1, $2, $3, $3, 'downloaded', $4)`,
      [crypto.randomUUID(), documentId, userId, crypto.randomUUID()],
    );
    await client.query('COMMIT');
    return {
      object,
      filename: row.original_filename ?? 'document',
      mimeType: row.content_type,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

function hasExpectedFileSignature(bytes: Uint8Array, type: string): boolean {
  if (type === 'application/pdf')
    return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png')
    return bytes
      .slice(0, 8)
      .every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  if (type === 'image/webp')
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
    );
  return false;
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export async function deleteDocument(userId: string, documentId: string): Promise<void> {
  if (env.STORAGE_DRIVER === 'postgres') {
    await deletePostgresDocument(userId, documentId);
    return;
  }
  await ensureOperationalSchema();
  const row = await getOperationalDatabase(userId)
    .prepare('SELECT object_key FROM documents WHERE id = ? AND user_id = ? LIMIT 1')
    .bind(documentId, userId)
    .first<{ object_key: string }>();
  if (!row) return;
  await getFiles().delete(row.object_key);
  await getOperationalDatabase(userId)
    .prepare('DELETE FROM documents WHERE id = ? AND user_id = ?')
    .bind(documentId, userId)
    .run();
  await audit(userId, 'document.deleted', 'document', documentId);
}

async function deletePostgresDocument(userId: string, documentId: string): Promise<void> {
  if (!env.HYPERDRIVE || !env.DOCUMENTS_CLEAN || !env.DOCUMENTS_QUARANTINE) return;
  const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    const result = await client.query<{ storage_key: string }>(
      'SELECT storage_key FROM document WHERE id = $1 AND owner_user_id = $2 FOR UPDATE',
      [documentId, userId],
    );
    const row = result.rows[0];
    if (!row) {
      await client.query('ROLLBACK');
      return;
    }
    await client.query(
      "UPDATE document SET malware_scan_status = 'revoked' WHERE id = $1 AND owner_user_id = $2",
      [documentId, userId],
    );
    await client.query('DELETE FROM documents WHERE id = $1 AND user_id = $2', [
      documentId,
      userId,
    ]);
    await client.query(
      `INSERT INTO document_event
        (id, document_id, owner_user_id, actor_user_id, event_type, correlation_id)
       VALUES ($1, $2, $3, $3, 'deleted', $4)`,
      [crypto.randomUUID(), documentId, userId, crypto.randomUUID()],
    );
    await client.query('COMMIT');
    const bucket = row.storage_key.startsWith('clean/')
      ? env.DOCUMENTS_CLEAN
      : env.DOCUMENTS_QUARANTINE;
    await bucket.delete(row.storage_key);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

export async function getWorkspace(userId: string): Promise<OperationalWorkspace> {
  await ensureOperationalSchema();
  const db = getOperationalDatabase(userId);
  const [
    profile,
    journeyRows,
    taskRows,
    recordRows,
    documentRows,
    ledgerRows,
    verificationRows,
    delegationRows,
    alertRows,
    supportRows,
    partnerRows,
    outcomeRows,
  ] = await Promise.all([
    getProfile(userId),
    db
      .prepare('SELECT * FROM journeys WHERE user_id = ? ORDER BY updated_at DESC')
      .bind(userId)
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM journey_tasks WHERE user_id = ? ORDER BY position ASC')
      .bind(userId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        'SELECT * FROM journey_records WHERE user_id = ? ORDER BY due_at IS NULL, due_at ASC, updated_at DESC',
      )
      .bind(userId)
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM ledger_entries WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM verification_requests WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM delegations WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM partner_submissions WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM outcome_reports WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<Record<string, unknown>>(),
  ]);
  const tasksByJourney = new Map<string, OperationalTask[]>();
  for (const row of taskRows.results) {
    const journeyId = String(row['journey_id']);
    const task: OperationalTask = {
      id: String(row['id']),
      journeyId,
      taskKey: String(row['task_key']),
      title: { bn: String(row['title_bn']), en: String(row['title_en']) },
      detail: { bn: String(row['detail_bn']), en: String(row['detail_en']) },
      status: String(row['status']) as OperationalTask['status'],
      position: Number(row['position']),
      dueAt: row['due_at'] ? String(row['due_at']) : null,
      completedAt: row['completed_at'] ? String(row['completed_at']) : null,
    };
    tasksByJourney.set(journeyId, [...(tasksByJourney.get(journeyId) ?? []), task]);
  }
  return {
    profile,
    journeys: journeyRows.results.map((row) => ({
      id: String(row['id']),
      path: String(row['path']) as JourneyPath,
      targetType: String(row['target_type']),
      targetId: row['target_id'] ? String(row['target_id']) : null,
      title: String(row['title']),
      destinationCountry: row['destination_country'] ? String(row['destination_country']) : null,
      stage: String(row['stage']),
      status: String(row['status']) as JourneyStatus,
      details: parseJson(row['details_json'], {}),
      tasks: tasksByJourney.get(String(row['id'])) ?? [],
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    })),
    records: recordRows.results.map((row) => ({
      id: String(row['id']),
      journeyId: String(row['journey_id']),
      recordType: String(row['record_type']),
      title: String(row['title']),
      status: String(row['status']),
      notes: row['notes'] ? String(row['notes']) : null,
      dueAt: row['due_at'] ? String(row['due_at']) : null,
      amountMinor: row['amount_minor'] === null ? null : Number(row['amount_minor']),
      currency: row['currency'] ? String(row['currency']) : null,
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    })),
    documents: documentRows.results.map((row) => ({
      id: String(row['id']),
      journeyId: row['journey_id'] ? String(row['journey_id']) : null,
      category: String(row['category']),
      label: String(row['label']),
      filename: String(row['filename']),
      mimeType: String(row['mime_type']),
      sizeBytes: Number(row['size_bytes']),
      verificationStatus: String(row['verification_status']),
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    })),
    ledger: ledgerRows.results.map((row) => ({
      id: String(row['id']),
      journeyId: row['journey_id'] ? String(row['journey_id']) : null,
      entryType: String(row['entry_type']),
      label: String(row['label']),
      amountMinor: Number(row['amount_minor']),
      currency: String(row['currency']),
      payee: row['payee'] ? String(row['payee']) : null,
      status: String(row['status']),
      legalBasis: row['legal_basis'] ? String(row['legal_basis']) : null,
      receiptDocumentId: row['receipt_document_id'] ? String(row['receipt_document_id']) : null,
      createdAt: String(row['created_at']),
    })),
    verifications: verificationRows.results.map((row) => ({
      id: String(row['id']),
      kind: String(row['kind']),
      subject: String(row['subject']),
      status: String(row['status']),
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    })),
    delegations: delegationRows.results.map((row) => ({
      id: String(row['id']),
      journeyId: row['journey_id'] ? String(row['journey_id']) : null,
      delegateContact: String(row['delegate_contact']),
      relationship: String(row['relationship']),
      permissions: parseJson(row['permissions_json'], []),
      status: String(row['status']),
      createdAt: String(row['created_at']),
      revokedAt: row['revoked_at'] ? String(row['revoked_at']) : null,
    })),
    alerts: alertRows.results.map((row) => ({
      id: String(row['id']),
      journeyId: row['journey_id'] ? String(row['journey_id']) : null,
      alertType: String(row['alert_type']),
      title: String(row['title']),
      body: String(row['body']),
      severity: String(row['severity']),
      readAt: row['read_at'] ? String(row['read_at']) : null,
      createdAt: String(row['created_at']),
    })),
    supportTickets: supportRows.results.map((row) => ({
      id: String(row['id']),
      journeyId: row['journey_id'] ? String(row['journey_id']) : null,
      priority: String(row['priority']),
      category: String(row['category']),
      subject: String(row['subject']),
      message: String(row['message']),
      status: String(row['status']),
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    })),
    partnerSubmissions: partnerRows.results.map((row) => ({
      id: String(row['id']),
      portalType: String(row['portal_type']),
      organizationName: String(row['organization_name']),
      countryCode: row['country_code'] ? String(row['country_code']) : null,
      submissionType: String(row['submission_type']),
      title: String(row['title']),
      evidence: String(row['evidence']),
      feeDeclaration: row['fee_declaration'] ? String(row['fee_declaration']) : null,
      status: String(row['status']),
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    })),
    outcomes: outcomeRows.results.map((row) => ({
      id: String(row['id']),
      journeyId: String(row['journey_id']),
      path: String(row['path']) as JourneyPath,
      reachedDestination: Boolean(row['reached_destination']),
      primaryOutcome: String(row['primary_outcome']),
      promiseMatched: String(row['promise_matched']),
      costMatched: String(row['cost_matched']),
      actualCostMinor: row['actual_cost_minor'] === null ? null : Number(row['actual_cost_minor']),
      currency: row['currency'] ? String(row['currency']) : null,
      notes: row['notes'] ? String(row['notes']) : null,
      reviewStatus: String(row['review_status']),
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    })),
    pendingVerifications: verificationRows.results.filter((row) =>
      ['submitted', 'in_review'].includes(String(row['status'])),
    ).length,
    activeDelegations: delegationRows.results.filter((row) => row['status'] === 'active').length,
    unreadAlerts: alertRows.results.filter((row) => !row['read_at']).length,
    openSupportTickets: supportRows.results.filter((row) => row['status'] !== 'closed').length,
  };
}
