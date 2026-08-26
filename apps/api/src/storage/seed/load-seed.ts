import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { InvariantViolatedError } from '@probash/domain';
import type {
  CountryRecord,
  CourseRecord,
  FeeRuleRecord,
  InstitutionRecord,
  JobRecord,
  OccupationRecord,
  OrganizationRecord,
  RouteVersionRecord,
  RuleVersionRecord,
  SourceRecord,
} from '../records';
import {
  countryStatusFileSchema,
  coursesFileSchema,
  feeRulesFileSchema,
  institutionsFileSchema,
  isoCountriesFileSchema,
  jobsFileSchema,
  occupationsFileSchema,
  organizationsFileSchema,
  routesFileSchema,
  rulesFileSchema,
  sourcesFileSchema,
} from './schemas';

export interface SeedBundle {
  countries: CountryRecord[];
  sources: SourceRecord[];
  routeVersions: RouteVersionRecord[];
  ruleVersions: RuleVersionRecord[];
  occupations: OccupationRecord[];
  organizations: OrganizationRecord[];
  jobs: JobRecord[];
  feeRules: FeeRuleRecord[];
  institutions: InstitutionRecord[];
  courses: CourseRecord[];
}

/** Walks up from this file to find the repository's `data/` directory. */
export function findDataDir(startDir: string = __dirname): string {
  const fromEnv = process.env['SEED_DATA_DIR'];
  if (fromEnv) return resolve(fromEnv);
  let dir = startDir;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, 'data', 'seed', 'routes.json'))) return join(dir, 'data');
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new InvariantViolatedError('Could not locate the data/ directory for seed loading', {
    startDir,
  });
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

/**
 * Loads and validates the development seed (§64).
 *
 * Cross-references are checked here — a route that points at a missing rule, a job
 * that points at a missing employer, or a fee rule with an unknown source would
 * otherwise surface as a confident-looking but hollow answer to a worker.
 */
export function loadSeed(dataDir: string = findDataDir()): SeedBundle {
  const iso = isoCountriesFileSchema.parse(readJson(join(dataDir, 'iso', 'countries.json')));
  const statuses = countryStatusFileSchema.parse(
    readJson(join(dataDir, 'seed', 'country-status.json')),
  );
  const sourcesFile = sourcesFileSchema.parse(readJson(join(dataDir, 'seed', 'sources.json')));
  const routesFile = routesFileSchema.parse(readJson(join(dataDir, 'seed', 'routes.json')));
  const rulesFile = rulesFileSchema.parse(readJson(join(dataDir, 'seed', 'rules.json')));
  const occupationsFile = occupationsFileSchema.parse(
    readJson(join(dataDir, 'seed', 'occupations.json')),
  );
  const organizationsFile = organizationsFileSchema.parse(
    readJson(join(dataDir, 'seed', 'organizations.json')),
  );
  const jobsFile = jobsFileSchema.parse(readJson(join(dataDir, 'seed', 'jobs.json')));
  const feeRulesFile = feeRulesFileSchema.parse(readJson(join(dataDir, 'seed', 'fee-rules.json')));
  const institutionsFile = institutionsFileSchema.parse(
    readJson(join(dataDir, 'seed', 'institutions.json')),
  );
  const coursesFile = coursesFileSchema.parse(readJson(join(dataDir, 'seed', 'courses.json')));

  const routeVersionsByRouteId = new Map(routesFile.routeVersions.map((r) => [r.routeId, r]));

  const countries: CountryRecord[] = iso.countries.map((country) => {
    const override = statuses.countries[country.code];
    const routeCount = routesFile.routeVersions.filter(
      (r) => r.destinationCountry === country.code,
    ).length;
    void routeCount;
    return {
      id: `country_${country.code}`,
      code: country.code,
      name: country.name,
      supportStatus: (override?.supportStatus ??
        statuses.defaults.supportStatus) as CountryRecord['supportStatus'],
      workPriorityTier: (override?.workPriorityTier ??
        statuses.defaults.workPriorityTier) as CountryRecord['workPriorityTier'],
      isStudyPriority: override?.isStudyPriority ?? statuses.defaults.isStudyPriority,
      statusNotice: override?.statusNotice,
      statusUpdatedAt: '2026-08-25T00:00:00.000Z',
      sourceIds: [],
    };
  });

  const sources = sourcesFile.sources as SourceRecord[];
  const sourceIds = new Set(sources.map((s) => s.id));

  const occupations: OccupationRecord[] = occupationsFile.occupations.map((occupation) => ({
    id: `occ_${occupation.key}`,
    key: occupation.key,
    family: occupation.family as OccupationRecord['family'],
    title: occupation.title,
    iscoCode: occupation.iscoCode,
    skillLevel: occupation.skillLevel,
    aliases: [],
    mappings: [{ classification: 'ISCO08', code: occupation.iscoCode }],
  }));
  const occupationKeys = new Set(occupations.map((o) => o.key));

  const organizations = organizationsFile.organizations as unknown as OrganizationRecord[];
  const organizationIds = new Set(organizations.map((o) => o.id));

  const ruleVersions = rulesFile.ruleVersions as RuleVersionRecord[];
  const ruleIds = new Set(ruleVersions.map((r) => r.ruleId));

  const routeVersions = routesFile.routeVersions as unknown as RouteVersionRecord[];
  const routeVersionIds = new Set(routeVersions.map((r) => r.id));

  const feeRules = feeRulesFile.feeRules as unknown as FeeRuleRecord[];
  const feeRuleIds = new Set(feeRules.map((f) => f.id));

  const jobs: JobRecord[] = jobsFile.jobs.map((job) => ({
    id: job.id,
    publicId: job.publicId,
    routeVersionId: job.routeVersionId,
    destinationCountry: job.destinationCountry,
    occupationId: `occ_${job.occupationKey}`,
    title: job.title,
    description: job.description,
    employerOrganizationId: job.employerOrganizationId,
    recruiterOrganizationId: job.recruiterOrganizationId ?? undefined,
    positions: job.positions,
    terms: job.terms,
    allowedWorkerCost: job.allowedWorkerCost,
    verification: job.verification,
    publicationStatus: job.publicationStatus,
    demandValidFrom: job.demandValidFrom,
    demandValidTo: job.demandValidTo,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    isSyntheticDemoData: job.isSyntheticDemoData,
  }));

  const problems: string[] = [];

  for (const route of routeVersions) {
    if (!ruleIds.has(route.eligibilityRuleId)) {
      problems.push(`route ${route.id} references unknown rule ${route.eligibilityRuleId}`);
    }
    for (const id of route.sourceIds) {
      if (!sourceIds.has(id)) problems.push(`route ${route.id} references unknown source ${id}`);
    }
    for (const id of route.feeRuleIds) {
      if (!feeRuleIds.has(id)) problems.push(`route ${route.id} references unknown fee rule ${id}`);
    }
    if (!countries.some((c) => c.code === route.destinationCountry)) {
      problems.push(`route ${route.id} references unknown country ${route.destinationCountry}`);
    }
  }

  for (const rule of ruleVersions) {
    for (const id of rule.sourceIds) {
      if (!sourceIds.has(id)) problems.push(`rule ${rule.id} references unknown source ${id}`);
    }
  }

  for (const job of jobs) {
    if (!routeVersionIds.has(job.routeVersionId)) {
      problems.push(`job ${job.id} references unknown route version ${job.routeVersionId}`);
    }
    if (!organizationIds.has(job.employerOrganizationId)) {
      problems.push(`job ${job.id} references unknown employer ${job.employerOrganizationId}`);
    }
    if (job.recruiterOrganizationId && !organizationIds.has(job.recruiterOrganizationId)) {
      problems.push(`job ${job.id} references unknown agency ${job.recruiterOrganizationId}`);
    }
    if (!occupationKeys.has(job.occupationId.replace('occ_', ''))) {
      problems.push(`job ${job.id} references unknown occupation ${job.occupationId}`);
    }
  }

  for (const fee of feeRules) {
    if (fee.routeId !== '*' && !routeVersionsByRouteId.has(fee.routeId)) {
      problems.push(`fee rule ${fee.id} references unknown route ${fee.routeId}`);
    }
    for (const id of fee.sourceIds) {
      if (!sourceIds.has(id)) problems.push(`fee rule ${fee.id} references unknown source ${id}`);
    }
    if (fee.payeeOrganizationId && !organizationIds.has(fee.payeeOrganizationId)) {
      problems.push(`fee rule ${fee.id} references unknown payee ${fee.payeeOrganizationId}`);
    }
  }

  const institutions = institutionsFile.institutions as InstitutionRecord[];
  const institutionIds = new Set(institutions.map((i) => i.id));
  const courses = coursesFile.courses as CourseRecord[];
  for (const course of courses) {
    if (!institutionIds.has(course.institutionId)) {
      problems.push(`course ${course.id} references unknown institution ${course.institutionId}`);
    }
  }

  if (problems.length > 0) {
    throw new InvariantViolatedError('Seed data is inconsistent', { problems });
  }

  return {
    countries,
    sources,
    routeVersions,
    ruleVersions,
    occupations,
    organizations,
    jobs,
    feeRules,
    institutions,
    courses,
  };
}
