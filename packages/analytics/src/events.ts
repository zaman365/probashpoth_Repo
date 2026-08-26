import { z } from 'zod';

/**
 * §47 — the event taxonomy. Events are published through a transactional outbox,
 * so their payloads are part of the platform contract, not ad-hoc logging.
 *
 * Hard rule: an analytics payload never carries personal data (§51, §76.5).
 * `assertNoPersonalData` enforces it and is covered by tests.
 */
export const EVENT_NAMES = [
  'UserRegistered',
  'ProfileUpdated',
  'PassportProfileUpdated',
  'PassportReadinessAssessed',
  'PassportMatchesGenerated',
  'WorkDiscoveryGenerated',
  'WorkApplicationSubmitted',
  'WorkOutcomeRecorded',
  'StudyDiscoveryGenerated',
  'StudyApplicationSubmitted',
  'StudyOutcomeRecorded',
  'HumanReviewRequested',
  'HumanReviewDecided',
  'PublicationChangeReviewed',
  'CredentialSubmitted',
  'CredentialVerified',
  'RegulatorySourceChanged',
  'RuleVersionPublished',
  'RouteStatusChanged',
  'EmployerVerified',
  'AgencyLicenceChanged',
  'JobOrderVerified',
  'JobPublished',
  'JobSuspended',
  'EligibilityEvaluated',
  'PreparationPlanCreated',
  'CaseCreated',
  'CaseTaskCompleted',
  'OfferReceived',
  'ContractAccepted',
  'PaymentAuthorized',
  'PaymentConfirmed',
  'MilestoneVerified',
  'SettlementEligible',
  'SettlementReleased',
  'RefundRequested',
  'RefundCompleted',
  'VisaSubmitted',
  'VisaDecisionRecorded',
  'EmigrationClearanceRecorded',
  'DepartureConfirmed',
  'ArrivalConfirmed',
  'EmploymentMatchChecked',
  'RiskSignalRaised',
  'ComplaintOpened',
  'ComplaintEscalated',
  'ComplaintResolved',
  'OfferScanned',
  'DelegationInvited',
  'DelegationAccepted',
  'DelegationRevoked',
  'DocumentShared',
  'DocumentShareRevoked',
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

/** Identifiers only — never a name, phone number, NID, passport or address. */
export const baseEventSchema = z.object({
  eventId: z.string().min(1),
  name: z.enum(EVENT_NAMES),
  occurredAt: z.string(),
  /** Pseudonymous actor id. Joining it to a person requires a permissioned lookup. */
  actorRef: z.string().optional(),
  caseRef: z.string().optional(),
  organizationRef: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  routeRef: z.string().optional(),
  locale: z.enum(['bn-BD', 'en']).optional(),
  surface: z.enum(['web', 'mobile', 'desktop', 'api', 'worker']).optional(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});

export type PlatformEvent = z.infer<typeof baseEventSchema>;

/** Keys that may never appear in an analytics payload (§51). */
export const FORBIDDEN_ATTRIBUTE_KEYS = [
  'name',
  'fullname',
  'phone',
  'phonenumber',
  'msisdn',
  'email',
  'nid',
  'nidnumber',
  'passport',
  'passportnumber',
  'address',
  'dob',
  'dateofbirth',
  'bankaccount',
  'accountnumber',
  'otp',
  'token',
  'password',
] as const;

const PII_VALUE_PATTERNS: RegExp[] = [
  /\b(?:\+?880|0)1[3-9]\d{8}\b/, // Bangladeshi mobile number
  /\b[A-Z]{1,2}\d{7}\b/, // passport-like identifier
  /\b\d{10,17}\b/, // NID-like long numeric identifier
  /[\w.+-]+@[\w-]+\.[\w.]+/, // email
];

export class PersonalDataInEventError extends Error {
  constructor(readonly offendingKeys: string[]) {
    super(`Analytics payload contains personal data: ${offendingKeys.join(', ')}`);
    this.name = 'PersonalDataInEventError';
  }
}

export function assertNoPersonalData(event: PlatformEvent): void {
  const offenders: string[] = [];
  for (const [key, value] of Object.entries(event.attributes)) {
    const normalized = key.toLowerCase().replace(/[^a-z]/g, '');
    if (
      FORBIDDEN_ATTRIBUTE_KEYS.includes(normalized as (typeof FORBIDDEN_ATTRIBUTE_KEYS)[number])
    ) {
      offenders.push(key);
      continue;
    }
    if (typeof value === 'string' && PII_VALUE_PATTERNS.some((p) => p.test(value))) {
      offenders.push(key);
    }
  }
  if (offenders.length > 0) throw new PersonalDataInEventError(offenders);
}

export function defineEvent(input: unknown): PlatformEvent {
  const event = baseEventSchema.parse(input);
  assertNoPersonalData(event);
  return event;
}
