import { InvariantViolatedError } from './errors';
import type { LocalizedText } from './localized';

/** §33 — long-lived application workflow. Terminal-ish states are explicit. */
export type CaseState =
  | 'DRAFT'
  | 'ELIGIBILITY_CHECKED'
  | 'OPPORTUNITY_SELECTED'
  | 'DOCUMENTS_PREPARING'
  | 'APPLICATION_READY'
  | 'SUBMITTED'
  | 'EMPLOYER_OR_INSTITUTION_REVIEW'
  | 'SELECTED_OR_ADMITTED'
  | 'CONTRACT_OR_OFFER_ACCEPTED'
  | 'PERMIT_OR_VISA_PREPARATION'
  | 'VISA_SUBMITTED'
  | 'VISA_DECIDED'
  | 'BANGLADESH_CLEARANCE'
  | 'PRE_DEPARTURE'
  | 'DEPARTED'
  | 'ARRIVED'
  | 'POST_ARRIVAL_VERIFIED'
  | 'ACTIVE'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'CANCELLED'
  | 'DISPUTED'
  | 'PAUSED';

const HAPPY_PATH: readonly CaseState[] = [
  'DRAFT',
  'ELIGIBILITY_CHECKED',
  'OPPORTUNITY_SELECTED',
  'DOCUMENTS_PREPARING',
  'APPLICATION_READY',
  'SUBMITTED',
  'EMPLOYER_OR_INSTITUTION_REVIEW',
  'SELECTED_OR_ADMITTED',
  'CONTRACT_OR_OFFER_ACCEPTED',
  'PERMIT_OR_VISA_PREPARATION',
  'VISA_SUBMITTED',
  'VISA_DECIDED',
  'BANGLADESH_CLEARANCE',
  'PRE_DEPARTURE',
  'DEPARTED',
  'ARRIVED',
  'POST_ARRIVAL_VERIFIED',
  'ACTIVE',
] as const;

/** States a case can always drop into, from any non-final state. */
const INTERRUPTS: readonly CaseState[] = [
  'REJECTED',
  'WITHDRAWN',
  'CANCELLED',
  'DISPUTED',
  'PAUSED',
] as const;

const FINAL: readonly CaseState[] = ['WITHDRAWN', 'CANCELLED'] as const;

export function isFinalCaseState(state: CaseState): boolean {
  return FINAL.includes(state);
}

export function nextCaseStates(state: CaseState): CaseState[] {
  if (isFinalCaseState(state)) return [];
  if (state === 'PAUSED' || state === 'DISPUTED') {
    // Resuming returns to the workflow; the resumed state is recorded on the event.
    return [...HAPPY_PATH, 'WITHDRAWN', 'CANCELLED'];
  }
  const index = HAPPY_PATH.indexOf(state);
  const forward = index >= 0 && index < HAPPY_PATH.length - 1 ? [HAPPY_PATH[index + 1]!] : [];
  return [...forward, ...INTERRUPTS.filter((s) => s !== state)];
}

export function assertCaseTransition(from: CaseState, to: CaseState): void {
  if (!nextCaseStates(from).includes(to)) {
    throw new InvariantViolatedError(`Illegal case transition ${from} → ${to}`, { from, to });
  }
}

export type CaseTaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'not_applicable';

/** §20 — every task explains why it exists, what it costs and where it happens. */
export interface CaseTask {
  id: string;
  caseId: string;
  order: number;
  title: LocalizedText;
  whyNeeded: LocalizedText;
  owner: 'worker' | 'student' | 'employer' | 'agency' | 'provider' | 'platform' | 'government';
  mandatory: boolean;
  status: CaseTaskStatus;
  dependsOnTaskIds: string[];
  estimatedDays?: number;
  costItemIds: string[];
  performedAt?: LocalizedText;
  sourceIds: string[];
  dueAt?: string;
  completedAt?: string;
  /** i18n key of the audio instruction for this task (ADR 0002). */
  listenKey?: string;
}
