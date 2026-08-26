import type { LocalizedText } from './localized';
import type { MoneyJson } from './money';

/**
 * §5 / §24 — every worker-paid charge is categorized, attributed and sourced.
 * A cost that cannot say who receives it and under what basis cannot be charged.
 */
export type CostCategory =
  | 'government_fee'
  | 'passport_document_fee'
  | 'test_training_fee'
  | 'medical_fee'
  | 'travel_fee'
  | 'insurance_fee'
  | 'education_tuition_deposit'
  | 'recruitment_service_fee'
  | 'assistance_service_fee'
  | 'other_lawful_direct_cost';

export type PartyKind =
  | 'worker'
  | 'student'
  | 'employer'
  | 'agency'
  | 'institution'
  | 'provider'
  | 'government'
  | 'platform'
  | 'assistant'
  | 'financial_partner';

export interface PartyRef {
  kind: PartyKind;
  id?: string;
  name?: LocalizedText;
}

export type CostItemStatus =
  'estimated' | 'due' | 'authorized' | 'paid' | 'refunded' | 'disputed' | 'waived';

export interface CostItem {
  id: string;
  caseId: string;
  category: CostCategory;
  label: LocalizedText;
  amount: MoneyJson;
  payer: PartyRef;
  payee: PartyRef;
  /** null = not yet determined; must never be silently treated as `true`. */
  legallyAllowed: boolean | null;
  legalBasisSourceId?: string;
  refundable: boolean;
  refundRuleId?: string;
  milestoneId?: string;
  mandatory: boolean;
  receiptRequired: boolean;
  status: CostItemStatus;
  sourceIds: string[];
  notes?: LocalizedText;
}

export interface CostTotals {
  workerPaid: MoneyJson;
  employerPaid: MoneyJson;
  institutionOrScholarshipPaid: MoneyJson;
  refundable: MoneyJson;
  nonRefundable: MoneyJson;
  contingent: MoneyJson;
  alreadyPaid: MoneyJson;
  remaining: MoneyJson;
}

export interface CurrencyTotals {
  currency: string;
  totals: CostTotals;
}

export interface CostPlan {
  id: string;
  caseId: string;
  /** The currency the worker actually pays most costs in; usually BDT. */
  primaryCurrency: string;
  items: CostItem[];
  /**
   * One total per currency present. The platform never converts without a rate
   * source and timestamp (§16), so mixed-currency plans are shown, not merged.
   */
  totals: CurrencyTotals[];
  /** Items the platform knows exist but cannot yet price or legally justify. */
  unresolvedItemIds: string[];
  generatedAt: string;
  sourceIds: string[];
}
