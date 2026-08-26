/**
 * `pnpm seed` — validates the development seed and prints a summary.
 * Run it before starting the API; it is also part of CI (§67).
 */
import { loadSeed } from './load-seed';

type Seed = ReturnType<typeof loadSeed>;

const allFacts = (seed: Seed) =>
  seed.countryProfiles.flatMap((profile) =>
    Object.values(profile.paths).flatMap((path) => path.keyFacts),
  );

const countedFacts = (seed: Seed) => allFacts(seed).filter((f) => f.status === 'researched').length;
const pendingFacts = (seed: Seed) =>
  allFacts(seed).filter((f) => f.status === 'needs_verification').length;

function main(): void {
  const seed = loadSeed();
  const publishedRoutes = seed.routeVersions.filter((r) => r.publicationStatus === 'published');
  const syntheticJobs = seed.jobs.filter((j) => j.isSyntheticDemoData);

  const lines = [
    `countries:        ${seed.countries.length} (all ISO 3166-1)`,
    `supported/pilot:  ${seed.countries.filter((c) => ['supported', 'pilot'].includes(c.supportStatus)).length}`,
    `sources:          ${seed.sources.length}`,
    `route versions:   ${seed.routeVersions.length} (${publishedRoutes.length} published)`,
    `rule versions:    ${seed.ruleVersions.length}`,
    `occupations:      ${seed.occupations.length}`,
    `organizations:    ${seed.organizations.length}`,
    `jobs:             ${seed.jobs.length} (${syntheticJobs.length} flagged synthetic)`,
    `fee rules:        ${seed.feeRules.length}`,
    `institutions:     ${seed.institutions.length}`,
    `courses:          ${seed.courses.length}`,
    `country vaults:   ${seed.countryProfiles.length} (${countedFacts(seed)} facts, ${pendingFacts(seed)} awaiting verification)`,
  ];

  console.log(
    `Seed OK — synthetic development data only\n${lines.map((l) => `  ${l}`).join('\n')}`,
  );

  if (syntheticJobs.length !== seed.jobs.length) {
    throw new Error('Every seeded job must be flagged as synthetic demo data (§64)');
  }
}

main();
