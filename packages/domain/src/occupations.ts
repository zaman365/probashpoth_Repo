import type { LocalizedText } from './localized';

/** §11 — canonical ontology anchored on ISCO-08, mapped outward per destination. */
export type OccupationClassification =
  | 'ISCO08'
  | 'UK_SOC'
  | 'CA_NOC'
  | 'ANZSCO'
  | 'SG_SSOC'
  | 'ESCO'
  | 'JP_SSW_FIELD'
  | 'KR_EPS_SECTOR'
  | 'LOCAL';

export interface OccupationCodeMapping {
  classification: OccupationClassification;
  code: string;
  countryCode?: string;
  label?: LocalizedText;
  sourceId?: string;
  lastVerifiedAt?: string;
}

export type OccupationFamilyKey =
  | 'construction'
  | 'electrical_mechanical'
  | 'welding_fabrication'
  | 'manufacturing'
  | 'marine_process'
  | 'transport'
  | 'logistics'
  | 'hospitality_food'
  | 'care_domestic'
  | 'healthcare'
  | 'agriculture_fisheries'
  | 'retail_service'
  | 'security'
  | 'aviation_airport'
  | 'ict'
  | 'engineering'
  | 'education'
  | 'business_professional'
  | 'science_research'
  | 'creative_media';

export interface Occupation {
  id: string;
  /** Stable slug used in URLs and analytics. */
  key: string;
  family: OccupationFamilyKey;
  title: LocalizedText;
  /** ISCO-08 unit group, the canonical anchor. */
  iscoCode: string;
  skillLevel: 1 | 2 | 3 | 4;
  aliases: LocalizedText[];
  mappings: OccupationCodeMapping[];
}

/** §11 — occupation × country × route metadata. Gender constraints require a lawful source. */
export interface RouteOccupation {
  id: string;
  routeVersionId: string;
  occupationId: string;
  localCode?: string;
  allowedOriginCountries: string[];
  minimumExperienceMonths?: number;
  licenceRequired: boolean;
  testRequired: boolean;
  trainingRequired: boolean;
  languageRequirementRef?: string;
  salaryFloorMinorUnits?: string;
  salaryFloorCurrency?: string;
  contractTermMonths?: number;
  quotaNote?: LocalizedText;
  /**
   * Only present when a lawful, cited source imposes it. Always flagged for
   * human-rights/compliance review (§11).
   */
  genderRestriction?: {
    value: 'male_only' | 'female_only';
    sourceId: string;
    complianceReviewRequired: true;
  };
  knownSafetyRisks: LocalizedText[];
  sourceIds: string[];
  lastVerifiedAt?: string;
}
