import { describe, expect, it } from 'vitest';
import {
  assessCommunityPostSafety,
  calculateMobilityRoi,
  coverageAtLeast,
  evaluateApplicationQa,
  smartEscalationReasons,
} from './unified-mobility';

const bdt = (minorUnits: string) => ({ minorUnits, currency: 'BDT' });

describe('unified mobility safety primitives', () => {
  it('orders coverage maturity without implying unsupported transactions', () => {
    expect(coverageAtLeast('JOURNEY_SUPPORTED', 'ELIGIBILITY_SUPPORTED')).toBe(true);
    expect(coverageAtLeast('INFORMATION_VERIFIED', 'JOURNEY_SUPPORTED')).toBe(false);
  });

  it('blocks submission until the applicant reviews and approves the immutable snapshot', () => {
    const result = evaluateApplicationQa({
      profileComplete: true,
      mandatoryDocumentsPresent: true,
      documentsNotExpired: true,
      eligibilityChecked: true,
      unresolvedContradictions: false,
      duplicateApplication: false,
      costDisclosureViewed: true,
      providerIdentityChecked: true,
      submissionSnapshotReviewed: true,
      applicantApproved: false,
    });
    expect(result.status).toBe('USER_APPROVAL_REQUIRED');
    expect(result.readyToSubmit).toBe(false);
    expect(result.blockers).toEqual(['APPLICANT_APPROVED']);
  });

  it('uses conservative savings for debt stress and never produces false precision', () => {
    const result = calculateMobilityRoi({
      currency: 'BDT',
      upfrontCosts: [bdt('65000000')],
      officialCosts: [bdt('10000000')],
      optionalCosts: [bdt('5000000')],
      savingsAvailable: bdt('0'),
      borrowedAmount: bdt('65000000'),
      annualInterestBasisPoints: 1200,
      repaymentMonths: 24,
      monthlyNetIncomeRange: { min: bdt('9000000'), max: bdt('12000000') },
      monthlyLivingCostRange: { min: bdt('4000000'), max: bdt('6000000') },
      remittanceGoal: bdt('1000000'),
      assumptions: [{ bn: 'ডেমো অনুমান', en: 'Demo assumption' }],
      sourceIds: ['source-1'],
      confidence: 'ESTIMATED',
    });
    expect(result.totalUpfrontCost).toEqual(bdt('65000000'));
    expect(result.monthlySavingsRange.min).toEqual(bdt('2000000'));
    expect(['HIGH', 'SEVERE']).toContain(result.debtRisk);
    expect(result.warnings).toContain('HIGH_DEBT_SERVICE_SHARE');
  });

  it('escalates conflicting or low-confidence cases without a fake confidence score', () => {
    expect(
      smartEscalationReasons({
        userRequested: false,
        routeComplexity: 'MEDIUM',
        conflictingData: true,
        criticalMissingEvidence: false,
        failedTaskCount: 0,
        documentIssue: false,
        riskFlag: false,
        confidence: 'NEEDS_HUMAN_REVIEW',
        rejectionReview: false,
        assistedServiceNeed: false,
      }),
    ).toEqual(['CONFLICTING_DATA', 'INSUFFICIENT_CONFIDENCE']);
  });

  it('sends phone/payment solicitation and unlinked jobs to moderation', () => {
    const result = assessCommunityPostSafety('চাকরি আছে, 01712345678 নম্বরে bKash করুন', {
      verifiedCommercialRole: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.requiresModeration).toBe(true);
    expect(result.signals).toEqual(
      expect.arrayContaining(['PHONE_SOLICITATION', 'PAYMENT_REQUEST', 'UNVERIFIED_JOB']),
    );
  });
});
