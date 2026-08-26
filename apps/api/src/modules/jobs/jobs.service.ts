import { Inject, Injectable } from '@nestjs/common';
import { Money, organizationCanTransact } from '@probash/domain';
import type { Env } from '@probash/config';
import type { JobDetailDto, JobSummaryDto, PublicJobVerificationDto } from '@probash/contracts';
import { ENV } from '../../core/tokens';
import { STORAGE, type Storage } from '../../storage/ports';
import { ClockService } from '../../core/clock.service';
import { filterSynthetic } from '../../common/synthetic-data.guard';
import { CatalogueService } from '../catalogue/catalogue.service';
import { QrService } from './qr.service';
import type { JobRecord } from '../../storage/records';

/** §21 — verified jobs and their public verification surface. */
@Injectable()
export class JobsService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
    private readonly catalogue: CatalogueService,
    private readonly qr: QrService,
  ) {}

  private async summary(job: JobRecord): Promise<JobSummaryDto> {
    const employer = await this.storage.organizations.get(job.employerOrganizationId);
    const agency = job.recruiterOrganizationId
      ? await this.storage.organizations.get(job.recruiterOrganizationId)
      : undefined;
    const occupation = await this.storage.occupations.get(job.occupationId);

    return {
      id: job.id,
      publicId: job.publicId,
      title: job.title,
      destinationCountry: job.destinationCountry,
      occupationKey: occupation?.key ?? job.occupationId,
      monthlySalary: job.terms.monthlySalary,
      positions: job.positions,
      employerName: employer?.legalName ?? { bn: 'অজানা', en: 'Unknown' },
      agencyName: agency?.legalName,
      verificationLevel: job.verification.level,
      allowedWorkerCost: job.allowedWorkerCost,
      recruitmentFeePaidBy: job.terms.recruitmentFeePaidBy,
      demandValidTo: job.demandValidTo,
      isSyntheticDemoData: job.isSyntheticDemoData,
    };
  }

  async list(
    filter: {
      country?: string;
      occupationKey?: string;
      employerPaysOnly?: boolean;
    } = {},
  ): Promise<JobSummaryDto[]> {
    const now = this.clock.now().getTime();
    const jobs = filterSynthetic(
      await this.storage.jobs.list((j) => j.publicationStatus === 'published'),
      this.env,
    ).filter((j) => Date.parse(j.demandValidTo) > now);

    const summaries = await Promise.all(jobs.map((j) => this.summary(j)));
    return summaries
      .filter((s) => !filter.country || s.destinationCountry === filter.country)
      .filter((s) => !filter.occupationKey || s.occupationKey === filter.occupationKey)
      .filter((s) => !filter.employerPaysOnly || s.recruitmentFeePaidBy === 'employer');
  }

  async detail(id: string): Promise<JobDetailDto> {
    const job = await this.storage.jobs.require(id);
    const route = await this.storage.routeVersions.require(job.routeVersionId);
    const agency = job.recruiterOrganizationId
      ? await this.storage.organizations.get(job.recruiterOrganizationId)
      : undefined;
    const licence = agency?.licences[0];

    return {
      ...(await this.summary(job)),
      description: job.description,
      routeVersionId: job.routeVersionId,
      terms: job.terms,
      verification: job.verification,
      agencyLicence: licence
        ? { number: licence.number, status: licence.status, validTo: licence.validTo }
        : undefined,
      sources: await this.catalogue.sourceSummaries(route.sourceIds),
    };
  }

  /**
   * §21 — the public verification page. Returns a status for *any* id, including
   * ids that do not exist: "not found" is the most important answer a worker can get
   * when a broker hands them a number.
   */
  async publicVerify(publicId: string): Promise<PublicJobVerificationDto> {
    const job = await this.storage.jobs.find((j) => j.publicId === publicId.trim().toUpperCase());
    if (!job || (job.isSyntheticDemoData && !filterSynthetic([job], this.env).length)) {
      return { publicId, status: 'not_found' };
    }

    const employer = await this.storage.organizations.get(job.employerOrganizationId);
    const agency = job.recruiterOrganizationId
      ? await this.storage.organizations.get(job.recruiterOrganizationId)
      : undefined;
    const occupation = await this.storage.occupations.get(job.occupationId);
    const licence = agency?.licences[0];

    const expired = Date.parse(job.demandValidTo) <= this.clock.now().getTime();
    const suspended =
      job.publicationStatus === 'suspended' ||
      Boolean(employer?.suspendedAt) ||
      (agency ? !organizationCanTransact(agency) : false);

    const status: PublicJobVerificationDto['status'] = suspended
      ? 'suspended'
      : expired
        ? 'expired'
        : 'verified';

    return {
      publicId: job.publicId,
      status,
      employerName: employer?.legalName,
      agencyName: agency?.legalName,
      agencyLicence: licence
        ? { number: licence.number, status: licence.status, validTo: licence.validTo }
        : undefined,
      occupation: occupation?.title,
      destinationCountry: job.destinationCountry,
      monthlySalary: job.terms.monthlySalary,
      allowedWorkerCost: job.allowedWorkerCost,
      demandValidTo: job.demandValidTo,
      verification: job.verification,
      lastVerifiedAt: job.verification.lastVerifiedAt,
      isSyntheticDemoData: job.isSyntheticDemoData,
      qrPayload: status === 'verified' ? this.qr.issue(job.publicId) : undefined,
    };
  }

  async verifyQrToken(
    token: string,
  ): Promise<PublicJobVerificationDto & { qrValid: boolean; qrReason?: string }> {
    const result = this.qr.verify(token);
    if (!result.valid) {
      return { publicId: '', status: 'not_found', qrValid: false, qrReason: result.reason };
    }
    const verification = await this.publicVerify(result.payload.id);
    return { ...verification, qrValid: true };
  }

  /** Maximum lawful worker cost for a job, used by the scanner and cost engine. */
  async allowedWorkerCost(job: JobRecord): Promise<Money> {
    return Money.fromJSON(job.allowedWorkerCost);
  }
}
