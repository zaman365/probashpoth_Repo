import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { loadEnv } from '@probash/config';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './common/domain-exception.filter';
import { hashToken } from './common/session.guard';
import { MemoryStorage } from './storage/memory/memory-storage';

describe('unified mobility strengthening', () => {
  let app: NestFastifyApplication;
  let storage: MemoryStorage;
  const json = <T = any>(response: { payload: string }): T => JSON.parse(response.payload) as T;
  const auth = (token: string) => ({ authorization: `Bearer ${token}` });
  const now = '2026-08-27T08:00:00.000Z';

  async function session(id: string, roles: string[], mfa = false): Promise<string> {
    const token = `unified-${id}`;
    await storage.users.put({
      id,
      phone: `+8801712${id.replace(/\D/g, '').padStart(6, '0').slice(-6)}`,
      roles,
      locale: 'bn-BD',
      createdAt: now,
    });
    await storage.sessions.put({
      id: `session-${id}`,
      userId: id,
      tokenHash: hashToken(token),
      issuedAt: now,
      expiresAt: '2030-01-01T00:00:00.000Z',
      kind: 'self',
      mfaSatisfiedAt: mfa ? new Date().toISOString() : undefined,
    });
    return token;
  }

  beforeAll(async () => {
    storage = new MemoryStorage();
    const moduleRef = await Test.createTestingModule({
      imports: [
        AppModule.register(loadEnv({ APP_ENV: 'test', STORAGE_DRIVER: 'memory' }), storage),
      ],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => app.close());

  it('gives an anonymous, source-backed QuickCheck before account creation', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/quick-check',
      payload: {
        goal: 'WORK',
        age: 29,
        citizenship: 'BD',
        residenceCountry: 'BD',
        occupationKey: 'electrician',
        experienceMonths: 48,
        languageCertificates: [],
        skillCertificates: ['electrical_trade'],
        preferredCountryCodes: ['QA'],
      },
    });
    expect(response.statusCode).toBe(201);
    const result = json(response);
    expect(result.accountRequired).toBe(false);
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0]).toMatchObject({
      routeVersionId: 'rv_qat_work_v1',
      coverageMaturity: 'RESEARCH_ONLY',
      confidence: 'NEEDS_HUMAN_REVIEW',
    });
    expect(result.disclaimer.en).toMatch(/not a job, admission, or visa guarantee/i);
  });

  it('exposes official handoffs without claiming authority status', async () => {
    const actions = json(
      await app.inject({ method: 'GET', url: '/api/v1/official-actions?country=BD' }),
    );
    expect(actions.some((item: any) => item.actionType === 'AGENCY_VERIFICATION')).toBe(true);
    expect(actions.every((item: any) => item.isExternal === true)).toBe(true);

    const token = await session('worker101', ['worker']);
    const completion = json(
      await app.inject({
        method: 'POST',
        url: '/api/v1/me/official-actions',
        headers: auth(token),
        payload: { actionId: 'official_bd_raims_agency', event: 'HANDED_OFF' },
      }),
    );
    expect(completion).toMatchObject({
      status: 'HANDED_OFF',
      statusProvenance: 'USER_CONFIRMED',
    });
    expect(completion.authorizedExternalReference).toBeUndefined();
  });

  it('lets an applicant review and revoke privacy-safe shared-device sessions', async () => {
    const token = await session('worker151', ['worker']);
    await storage.sessions.put({
      id: 'session-shared-device',
      userId: 'worker151',
      tokenHash: hashToken('never-return-this-token'),
      issuedAt: now,
      expiresAt: '2030-01-01T00:00:00.000Z',
      kind: 'assisted',
    });

    const sessions = json<any[]>(
      await app.inject({ method: 'GET', url: '/api/v1/me/sessions', headers: auth(token) }),
    );
    expect(sessions).toHaveLength(2);
    expect(sessions.every((item) => item.tokenHash === undefined && item.token === undefined)).toBe(
      true,
    );

    const revoked = await app.inject({
      method: 'DELETE',
      url: '/api/v1/me/sessions/session-shared-device',
      headers: auth(token),
    });
    expect(revoked.statusCode).toBe(200);
    expect((await storage.sessions.require('session-shared-device')).revokedAt).toBeTruthy();
  });

  it('checks agencies and fees without making a binary fraud claim', async () => {
    const agency = json(
      await app.inject({
        method: 'POST',
        url: '/api/v1/safety/agency-check',
        payload: { licenceNumber: 'DEMO-RL-1421' },
      }),
    );
    expect(agency.conclusiveFraudFinding).toBe(false);
    expect(['VERIFIED', 'LICENSE_EXPIRED', 'NEEDS_MANUAL_REVIEW']).toContain(agency.status);

    const fee = json(
      await app.inject({
        method: 'POST',
        url: '/api/v1/safety/fee-check',
        payload: {
          countryCode: 'QA',
          routeVersionId: 'rv_qat_work_v1',
          quotedAmount: { minorUnits: '50000000', currency: 'BDT' },
          breakdown: [],
        },
      }),
    );
    expect(BigInt(fee.unexplainedDifference.minorUnits)).toBeGreaterThan(0n);
    expect(fee.questionsToAsk.length).toBeGreaterThan(0);
    expect(fee.officialActions.length).toBeGreaterThan(0);
  });

  it('creates an immutable submission snapshot but blocks unapproved applications', async () => {
    const token = await session('worker202', ['worker']);
    await storage.workApplications.put({
      id: 'application-unified',
      userId: 'worker202',
      jobId: 'job_qa_electrician',
      caseId: 'case-unified',
      status: 'draft',
      eligibilityAtSubmission: 'conditional',
      submittedAt: now,
      updatedAt: now,
    });
    const result = json(
      await app.inject({
        method: 'POST',
        url: '/api/v1/me/application-qa',
        headers: auth(token),
        payload: {
          applicationId: 'application-unified',
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
          profileVersion: 1,
          documentIds: [],
          renderedSummary: { bn: 'জমা দেওয়ার সারাংশ', en: 'Submission summary' },
          applicationPayloadHash: 'a'.repeat(64),
          costDisclosureIds: [],
          providerVerificationEvidenceIds: [],
        },
      }),
    );
    expect(result.status).toBe('USER_APPROVAL_REQUIRED');
    expect(result.readyToSubmit).toBe(false);
    expect(result.immutableSnapshotCreated).toBe(true);
    expect((await storage.submissionSnapshots.require(result.snapshotId)).immutable).toBe(true);
  });

  it('stores conservative ROI/debt warnings, shared deadlines and saved items', async () => {
    const token = await session('worker303', ['worker']);
    const roi = json(
      await app.inject({
        method: 'POST',
        url: '/api/v1/me/mobility-roi',
        headers: auth(token),
        payload: {
          currency: 'BDT',
          upfrontCosts: [{ minorUnits: '65000000', currency: 'BDT' }],
          officialCosts: [{ minorUnits: '10000000', currency: 'BDT' }],
          optionalCosts: [{ minorUnits: '5000000', currency: 'BDT' }],
          savingsAvailable: { minorUnits: '0', currency: 'BDT' },
          borrowedAmount: { minorUnits: '65000000', currency: 'BDT' },
          annualInterestBasisPoints: 1200,
          repaymentMonths: 24,
          monthlyNetIncomeRange: {
            min: { minorUnits: '9000000', currency: 'BDT' },
            max: { minorUnits: '12000000', currency: 'BDT' },
          },
          monthlyLivingCostRange: {
            min: { minorUnits: '4000000', currency: 'BDT' },
            max: { minorUnits: '6000000', currency: 'BDT' },
          },
          remittanceGoal: { minorUnits: '1000000', currency: 'BDT' },
          assumptions: [{ bn: 'আনুমানিক', en: 'Estimated' }],
          sourceIds: ['src_bd_oep'],
          confidence: 'ESTIMATED',
        },
      }),
    );
    expect(['HIGH', 'SEVERE']).toContain(roi.debtRisk);
    expect(roi.informationalOnly).toBe(true);

    const deadline = json(
      await app.inject({
        method: 'POST',
        url: '/api/v1/me/deadlines',
        headers: auth(token),
        payload: {
          entityType: 'route',
          entityId: 'rv_qat_work_v1',
          kind: 'VISA',
          title: { bn: 'ভিসা সময়সীমা', en: 'Visa deadline' },
          dueAt: '2027-01-01T10:00:00.000Z',
          timezone: 'Asia/Dhaka',
          hardness: 'HARD',
          reminderOffsetsMinutes: [1440, 10080],
          sourceIds: ['src_bd_oep'],
        },
      }),
    );
    expect(deadline.ownerUserId).toBe('worker303');

    const saved = json(
      await app.inject({
        method: 'POST',
        url: '/api/v1/me/saved-items',
        headers: auth(token),
        payload: {
          itemType: 'PATHWAY',
          itemId: 'rv_qat_work_v1',
          state: 'SHORTLISTED',
          compare: true,
          delegateShareIds: [],
          alertPreference: 'ALL_UPDATES',
        },
      }),
    );
    expect(saved.compare).toBe(true);
  });

  it('keeps the freshness dashboard behind MFA and exposes P1/P2 gates honestly', async () => {
    const applicantToken = await session('worker404', ['worker']);
    const denied = await app.inject({
      method: 'GET',
      url: '/api/v1/me/freshness-dashboard',
      headers: auth(applicantToken),
    });
    expect(denied.statusCode).toBe(403);

    const reviewerToken = await session('reviewer505', ['compliance_reviewer'], true);
    const dashboard = json(
      await app.inject({
        method: 'GET',
        url: '/api/v1/me/freshness-dashboard',
        headers: auth(reviewerToken),
      }),
    );
    expect(dashboard.items.length).toBeGreaterThan(0);

    const capabilities = json(
      await app.inject({ method: 'GET', url: '/api/v1/mobility-capabilities' }),
    );
    expect(capabilities.some((item: any) => item.status === 'LEGAL_REVIEW_REQUIRED')).toBe(true);
    expect(capabilities.filter((item: any) => item.live).length).toBe(0);
  });
});
