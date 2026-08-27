import { Inject, Injectable } from '@nestjs/common';
import { freshnessOf, routeAcceptsApplications } from '@probash/domain';
import type { Env } from '@probash/config';
import type {
  CountrySummaryDto,
  OccupationSummaryDto,
  RouteDetailDto,
  RouteSummaryDto,
  SourceSummaryDto,
} from '@probash/contracts';
import { ENV } from '../../core/tokens';
import { STORAGE, type Storage } from '../../storage/ports';
import { ClockService } from '../../core/clock.service';
import { filterSynthetic } from '../../common/synthetic-data.guard';
import type { RouteVersionRecord, SourceRecord } from '../../storage/records';

/** §7, §9, §38 — country and route catalogue with user-facing provenance. */
@Injectable()
export class CatalogueService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
  ) {}

  private async publishedRoutes(): Promise<RouteVersionRecord[]> {
    const routes = await this.storage.routeVersions.list(
      (r) => r.publicationStatus === 'published',
    );
    return filterSynthetic(routes, this.env);
  }

  async listCountries(
    options: { purpose?: 'work' | 'study'; withRoutesOnly?: boolean } = {},
  ): Promise<CountrySummaryDto[]> {
    const routes = await this.publishedRoutes();
    const countries = await this.storage.countries.list();

    return countries
      .map((country) => {
        const countryRoutes = routes.filter(
          (r) =>
            r.destinationCountry === country.code &&
            (!options.purpose ||
              (options.purpose === 'study' ? r.purpose === 'study' : r.purpose !== 'study')),
        );
        return {
          code: country.code,
          name: country.name,
          supportStatus: country.supportStatus,
          workPriorityTier: country.workPriorityTier,
          isStudyPriority: country.isStudyPriority,
          statusNotice: country.statusNotice,
          routeCount: countryRoutes.length,
        };
      })
      .filter((c) => (options.withRoutesOnly ? c.routeCount > 0 : true))
      .sort((a, b) => {
        if (a.routeCount !== b.routeCount) return b.routeCount - a.routeCount;
        return a.name.en.localeCompare(b.name.en);
      });
  }

  private freshness(route: RouteVersionRecord) {
    return freshnessOf(route.lastReviewedAt, route.reviewCadenceDays, this.clock.now());
  }

  private toSummary(route: RouteVersionRecord): RouteSummaryDto {
    return {
      id: route.id,
      routeId: route.routeId,
      version: route.version,
      purpose: route.purpose,
      destinationCountry: route.destinationCountry,
      officialName: route.officialName,
      summary: route.summary,
      status: route.status,
      acceptsApplications: routeAcceptsApplications(route.status),
      expectedTimeline: route.expectedTimeline,
      lastReviewedAt: route.lastReviewedAt,
      freshness: this.freshness(route),
      coverageMaturity:
        route.coverageMaturity ??
        (route.isSyntheticDemoData ? 'RESEARCH_ONLY' : 'INFORMATION_VERIFIED'),
      bangladeshAccessibility:
        route.bangladeshAccessibility ??
        (!routeAcceptsApplications(route.status)
          ? 'NOT_ELIGIBLE'
          : route.purpose === 'work'
            ? 'POTENTIALLY_ELIGIBLE'
            : 'NOT_CONFIRMED'),
    };
  }

  async listRoutes(
    options: { countryCode?: string; purpose?: string } = {},
  ): Promise<RouteSummaryDto[]> {
    const routes = await this.publishedRoutes();
    return routes
      .filter((r) => !options.countryCode || r.destinationCountry === options.countryCode)
      .filter((r) => !options.purpose || r.purpose === options.purpose)
      .map((r) => this.toSummary(r));
  }

  async sourceSummaries(sourceIds: readonly string[]): Promise<SourceSummaryDto[]> {
    const summaries: SourceSummaryDto[] = [];
    for (const id of new Set(sourceIds)) {
      const source = await this.storage.sources.get(id);
      if (!source) continue;
      summaries.push(this.toSourceSummary(source));
    }
    return summaries;
  }

  private toSourceSummary(source: SourceRecord): SourceSummaryDto {
    return {
      id: source.id,
      authority: source.authority,
      title: source.title,
      url: source.url,
      kind: source.kind,
      lastReviewedAt: source.lastReviewedAt,
      freshness: freshnessOf(source.lastReviewedAt, source.reviewCadenceDays, this.clock.now()),
      trustTier: source.trustTier,
      status: source.status,
    };
  }

  async getRoute(id: string): Promise<RouteDetailDto> {
    const route = await this.storage.routeVersions.require(id);
    const allSourceIds = [
      ...route.sourceIds,
      ...route.requirements.flatMap((r) => r.sources.map((s) => s.sourceId)),
      ...route.riskNotices.flatMap((r) => r.sources.map((s) => s.sourceId)),
    ];

    return {
      ...this.toSummary(route),
      visaClass: route.visaClass,
      permitClass: route.permitClass,
      requirements: route.requirements.map((r) => ({
        id: r.id,
        kind: r.kind,
        label: r.label,
        description: r.description,
        mandatory: r.mandatory,
        estimatedDays: r.estimatedDays,
        performedAt: r.performedAt,
        sourceIds: r.sources.map((s) => s.sourceId),
      })),
      postArrivalObligations: route.postArrivalObligations.map((r) => ({
        id: r.id,
        kind: r.kind,
        label: r.label,
        description: r.description,
        mandatory: r.mandatory,
        estimatedDays: r.estimatedDays,
        performedAt: r.performedAt,
        sourceIds: r.sources.map((s) => s.sourceId),
      })),
      riskNotices: route.riskNotices.map((r) => ({
        id: r.id,
        severity: r.severity,
        title: r.title,
        body: r.body,
        sourceIds: r.sources.map((s) => s.sourceId),
      })),
      workRightsNote: route.workRightsNote,
      studyRightsNote: route.studyRightsNote,
      dependantsNote: route.dependantsNote,
      permanentPathwayNotes: route.permanentPathwayNotes,
      sources: await this.sourceSummaries(allSourceIds),
      effectiveFrom: route.effectiveFrom,
      verifiedAt: route.verifiedAt,
      publicationStatus: route.publicationStatus,
    };
  }

  async listOccupations(query?: string): Promise<OccupationSummaryDto[]> {
    const occupations = await this.storage.occupations.list();
    const q = query?.trim().toLowerCase();
    const normalized = q
      ?.replace(/\s+/g, ' ')
      .replace(/electrician|ইলেকট্রিশিয়ান|ইলেক্ট্রিশিয়ান/g, 'electrician')
      .replace(/nurse|নার্স/g, 'nurse')
      .replace(/driver|ড্রাইভার|চালক/g, 'driver')
      .replace(/care giver|caregiver|কেয়ারগিভার|কেয়ারগিভার/g, 'caregiver');
    return occupations
      .filter(
        (o) =>
          !q ||
          o.key.includes(normalized ?? q) ||
          o.title.en.toLowerCase().includes(normalized ?? q) ||
          o.title.bn.includes(query ?? '') ||
          o.aliases.some(
            (alias) => alias.en.toLowerCase().includes(q) || alias.bn.includes(query ?? ''),
          ),
      )
      .map((o) => ({
        id: o.id,
        key: o.key,
        family: o.family,
        title: o.title,
        iscoCode: o.iscoCode,
        skillLevel: o.skillLevel,
      }))
      .sort((a, b) => a.title.en.localeCompare(b.title.en));
  }

  async listSources(countryCode?: string): Promise<SourceSummaryDto[]> {
    const sources = await this.storage.sources.list(
      (s) => !countryCode || s.countryCode === countryCode,
    );
    return sources.map((s) => this.toSourceSummary(s));
  }

  /**
   * §14.1 — the country vault. Sources are resolved to summaries with their freshness
   * so the page can show where every figure came from and how old it is (§38).
   */
  async getCountryProfile(countryCode: string) {
    const profile = await this.storage.countryProfiles.find(
      (p) => p.countryCode === countryCode.toUpperCase(),
    );
    if (!profile) return undefined;

    const citedSourceIds = [
      ...profile.sources,
      ...Object.values(profile.paths).flatMap((path) => [
        ...path.visas.map((visa) => visa.sourceId),
        ...path.keyFacts.map((fact) => fact.sourceId),
      ]),
    ];

    return {
      countryCode: profile.countryCode,
      verifiedAt: profile.verifiedAt,
      verifiedBy: profile.verifiedBy,
      paths: profile.paths,
      sources: await this.sourceSummaries(citedSourceIds),
    };
  }

  async listInstitutions(countryCode?: string) {
    const institutions = await this.storage.institutions.list(
      (i) => !countryCode || i.countryCode === countryCode,
    );
    return filterSynthetic(institutions, this.env);
  }

  async listCourses(institutionId?: string) {
    const courses = await this.storage.courses.list(
      (c) => !institutionId || c.institutionId === institutionId,
    );
    return filterSynthetic(courses, this.env);
  }
}
