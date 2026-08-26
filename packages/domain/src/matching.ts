/**
 * Deterministic, explainable preparation ranking for Work and Higher Study.
 *
 * Hard eligibility is never converted into a score. It remains an explicit state
 * and is the first sort boundary. The numeric preparation score ranks candidates
 * only inside that boundary and is always accompanied by its factors.
 */

export type HardEligibilityState = 'eligible' | 'conditional' | 'ineligible' | 'unknown';
export type MatchFactorState = 'fit' | 'gap' | 'unknown';

export interface MatchFactorInput {
  key: string;
  state: MatchFactorState;
  weight: number;
  sourceIds?: string[];
}

interface BaseMatchCandidate {
  candidateId: string;
  countryCode: string;
  hardEligibility: HardEligibilityState;
  factors: MatchFactorInput[];
  sourceIds: string[];
  dataStatus: 'verified' | 'review_required' | 'synthetic_demo';
}

export interface WorkMatchCandidate extends BaseMatchCandidate {
  path: 'work';
  routeVersionId: string;
  jobIds: string[];
}

export interface StudyMatchCandidate extends BaseMatchCandidate {
  path: 'study';
  programId: string;
  institutionId: string;
}

export interface RankedMatch {
  rank: number;
  candidateId: string;
  path: 'work' | 'study';
  countryCode: string;
  hardEligibility: HardEligibilityState;
  /** Soft preparation fit only. Never a visa, job, or admission probability. */
  preparationScore: number;
  evidenceCoveragePercent: number;
  factors: MatchFactorInput[];
  strengths: string[];
  gaps: string[];
  unknowns: string[];
  sourceIds: string[];
  dataStatus: BaseMatchCandidate['dataStatus'];
}

const ELIGIBILITY_ORDER: Record<HardEligibilityState, number> = {
  eligible: 0,
  conditional: 1,
  unknown: 2,
  ineligible: 3,
};

function rankCandidates(
  candidates: readonly (WorkMatchCandidate | StudyMatchCandidate)[],
): RankedMatch[] {
  const ranked = candidates.map((candidate) => {
    const totalWeight = candidate.factors.reduce((sum, factor) => sum + factor.weight, 0);
    const fitWeight = candidate.factors
      .filter((factor) => factor.state === 'fit')
      .reduce((sum, factor) => sum + factor.weight, 0);
    const knownWeight = candidate.factors
      .filter((factor) => factor.state !== 'unknown')
      .reduce((sum, factor) => sum + factor.weight, 0);

    return {
      rank: 0,
      candidateId: candidate.candidateId,
      path: candidate.path,
      countryCode: candidate.countryCode,
      hardEligibility: candidate.hardEligibility,
      preparationScore: totalWeight === 0 ? 0 : Math.round((fitWeight / totalWeight) * 100),
      evidenceCoveragePercent:
        totalWeight === 0 ? 0 : Math.round((knownWeight / totalWeight) * 100),
      factors: candidate.factors,
      strengths: candidate.factors
        .filter((factor) => factor.state === 'fit')
        .map((factor) => factor.key),
      gaps: candidate.factors
        .filter((factor) => factor.state === 'gap')
        .map((factor) => factor.key),
      unknowns: candidate.factors
        .filter((factor) => factor.state === 'unknown')
        .map((factor) => factor.key),
      sourceIds: [
        ...new Set([
          ...candidate.sourceIds,
          ...candidate.factors.flatMap((factor) => factor.sourceIds ?? []),
        ]),
      ],
      dataStatus: candidate.dataStatus,
    } satisfies RankedMatch;
  });

  ranked.sort((left, right) => {
    const eligibilityDifference =
      ELIGIBILITY_ORDER[left.hardEligibility] - ELIGIBILITY_ORDER[right.hardEligibility];
    if (eligibilityDifference !== 0) return eligibilityDifference;
    if (left.preparationScore !== right.preparationScore) {
      return right.preparationScore - left.preparationScore;
    }
    if (left.evidenceCoveragePercent !== right.evidenceCoveragePercent) {
      return right.evidenceCoveragePercent - left.evidenceCoveragePercent;
    }
    return left.candidateId.localeCompare(right.candidateId);
  });

  return ranked.map((match, index) => ({ ...match, rank: index + 1 }));
}

/** Work matching keeps occupation, employer/job, permit, and economics factors distinct. */
export function rankWorkMatches(candidates: readonly WorkMatchCandidate[]): RankedMatch[] {
  return rankCandidates(candidates);
}

/** Study matching keeps academic, programme, language, and funding factors distinct. */
export function rankStudyMatches(candidates: readonly StudyMatchCandidate[]): RankedMatch[] {
  return rankCandidates(candidates);
}
