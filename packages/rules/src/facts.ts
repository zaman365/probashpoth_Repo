import type { FactValue } from './evaluate';

/**
 * Canonical fact keys. Rules reference these strings, so they are part of the
 * published contract: renaming one is a versioned change, not a refactor.
 */
export const FACT_KEYS = {
  ageYears: 'applicant.ageYears',
  nationality: 'applicant.nationality',
  occupationKey: 'applicant.occupationKey',
  experienceMonths: 'applicant.experienceMonths',
  educationLevel: 'applicant.educationLevel',
  hasValidPassport: 'applicant.hasValidPassport',
  passportValidMonths: 'applicant.passportValidMonths',
  hasBmetRegistration: 'applicant.hasBmetRegistration',
  hasPoliceClearance: 'applicant.hasPoliceClearance',
  languageCertificates: 'applicant.languageCertificates',
  skillCertificates: 'applicant.skillCertificates',
  medicallyFit: 'applicant.medicallyFit',
  hasEmployerOffer: 'applicant.hasEmployerOffer',
  offerIsVerified: 'applicant.offerIsVerified',
  fundsAvailableMinorUnits: 'applicant.fundsAvailableMinorUnits',
  destinationCountry: 'target.destinationCountry',
  routeStatus: 'target.routeStatus',
} as const;

export type FactKey = (typeof FACT_KEYS)[keyof typeof FACT_KEYS];

/** Ordered education ladder so `gte` comparisons are meaningful. */
export const EDUCATION_LEVELS = [
  'none',
  'primary',
  'jsc',
  'ssc',
  'hsc',
  'diploma',
  'bachelor',
  'master',
  'doctorate',
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export function educationRank(level: string | undefined): number | undefined {
  if (!level) return undefined;
  const index = EDUCATION_LEVELS.indexOf(level as EducationLevel);
  return index >= 0 ? index : undefined;
}

/**
 * Build the fact bag from an applicant profile. Facts that are genuinely unknown
 * must stay `undefined` — writing a default here would turn "we do not know" into
 * a confident answer, which is the exact failure ADR 0003 exists to prevent.
 */
export interface ApplicantFactInput {
  ageYears?: number;
  nationality?: string;
  occupationKey?: string;
  experienceMonths?: number;
  educationLevel?: string;
  hasValidPassport?: boolean;
  passportValidMonths?: number;
  hasBmetRegistration?: boolean;
  hasPoliceClearance?: boolean;
  languageCertificates?: string[];
  skillCertificates?: string[];
  medicallyFit?: boolean;
  hasEmployerOffer?: boolean;
  offerIsVerified?: boolean;
  fundsAvailableMinorUnits?: number;
  destinationCountry?: string;
  routeStatus?: string;
}

export function buildFactBag(input: ApplicantFactInput): Record<string, FactValue> {
  const bag: Record<string, FactValue> = {
    [FACT_KEYS.ageYears]: input.ageYears,
    [FACT_KEYS.nationality]: input.nationality,
    [FACT_KEYS.occupationKey]: input.occupationKey,
    [FACT_KEYS.experienceMonths]: input.experienceMonths,
    [FACT_KEYS.hasValidPassport]: input.hasValidPassport,
    [FACT_KEYS.passportValidMonths]: input.passportValidMonths,
    [FACT_KEYS.hasBmetRegistration]: input.hasBmetRegistration,
    [FACT_KEYS.hasPoliceClearance]: input.hasPoliceClearance,
    [FACT_KEYS.languageCertificates]: input.languageCertificates,
    [FACT_KEYS.skillCertificates]: input.skillCertificates,
    [FACT_KEYS.medicallyFit]: input.medicallyFit,
    [FACT_KEYS.hasEmployerOffer]: input.hasEmployerOffer,
    [FACT_KEYS.offerIsVerified]: input.offerIsVerified,
    [FACT_KEYS.fundsAvailableMinorUnits]: input.fundsAvailableMinorUnits,
    [FACT_KEYS.destinationCountry]: input.destinationCountry,
    [FACT_KEYS.routeStatus]: input.routeStatus,
    [FACT_KEYS.educationLevel]: educationRank(input.educationLevel),
  };
  for (const key of Object.keys(bag)) {
    if (bag[key] === undefined) delete bag[key];
  }
  return bag;
}
