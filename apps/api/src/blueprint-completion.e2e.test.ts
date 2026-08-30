import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { loadEnv } from '@probash/config';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './common/domain-exception.filter';
import { hashToken } from './common/session.guard';
import { MemoryStorage } from './storage/memory/memory-storage';

describe('blueprint supply, mobile API and outcome moat', () => {
  let app: NestFastifyApplication;
  let storage: MemoryStorage;
  const env = loadEnv({ APP_ENV: 'test', STORAGE_DRIVER: 'memory' });
  const now = '2026-01-01T00:00:00.000Z';
  const expiresAt = '2030-01-01T00:00:00.000Z';

  const json = <T = any>(response: { payload: string }): T => JSON.parse(response.payload) as T;
  const auth = (token: string) => ({ authorization: `Bearer ${token}` });
  const get = (url: string, token?: string) =>
    app.inject({ method: 'GET', url, headers: token ? auth(token) : {} });
  const post = (url: string, body: unknown, token?: string) =>
    app.inject({ method: 'POST', url, payload: body as object, headers: token ? auth(token) : {} });
  const del = (url: string, token: string) =>
    app.inject({ method: 'DELETE', url, headers: auth(token) });

  async function session(input: {
    id: string;
    roles: string[];
    organizationId?: string;
    mfa?: boolean;
    mfaSatisfiedAt?: string;
  }): Promise<string> {
    const token = `token-${input.id}`;
    await storage.users.put({
      id: input.id,
      phone: `+8801700${input.id.replace(/\D/g, '').padStart(6, '0').slice(-6)}`,
      roles: input.roles,
      organizationId: input.organizationId,
      locale: 'bn-BD',
      createdAt: now,
    });
    await storage.sessions.put({
      id: `session-${input.id}`,
      userId: input.id,
      tokenHash: hashToken(token),
      issuedAt: now,
      expiresAt,
      kind: 'self',
      // A fixed timestamp made this fixture expire 12 hours after it was written
      // (session.guard.ts treats MFA older than 12h as unsatisfied), so the suite
      // passed only on the day it was authored. The step-up must be current
      // unless a test is deliberately pinning a stale one.
      mfaSatisfiedAt: input.mfaSatisfiedAt ?? (input.mfa ? new Date().toISOString() : undefined),
    });
    return token;
  }

  beforeAll(async () => {
    storage = new MemoryStorage();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.register(env, storage)],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // Regression: the step-up window is a security control, not a test nuisance. If a
  // future fixture expires again, the fix is a current timestamp — never a wider
  // window in session.guard.ts. This test fails if that window is loosened.
  it('refuses a reviewer action when the MFA step-up has expired', async () => {
    const thirteenHoursAgo = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString();
    const staleToken = await session({
      id: 'stale-mfa-reviewer',
      roles: ['compliance_reviewer'],
      mfaSatisfiedAt: thirteenHoursAgo,
    });

    // The payload is valid, so the request reaches the service, where the MFA gate
    // is checked before the change is loaded: a non-existent id must still be
    // refused with 403 and never reach a 404.
    const reviewBody = { decision: 'approve', note: 'Approving after source check.' };
    const response = await post(
      '/api/v1/operations/publication-changes/does-not-exist/review',
      reviewBody,
      staleToken,
    );

    expect(response.statusCode).toBe(403);
    expect(json(response).error.code).toBe('FORBIDDEN');

    // A current step-up gets past the gate, proving 403 came from MFA expiry
    // alone and not from the role or the unknown id.
    const freshToken = await session({
      id: 'fresh-mfa-reviewer',
      roles: ['compliance_reviewer'],
      mfa: true,
    });
    const withFreshMfa = await post(
      '/api/v1/operations/publication-changes/does-not-exist/review',
      reviewBody,
      freshToken,
    );
    expect(withFreshMfa.statusCode).toBe(404);
  });

  it('keeps partner submissions evidence-gated and payment-neutral', async () => {
    const partnerToken = await session({
      id: 'partner1',
      roles: ['employer_staff'],
      organizationId: 'org_emp_qa_alnahda',
      mfa: true,
    });
    const submission = json(
      await post(
        '/api/v1/partner/submissions',
        {
          kind: 'employer_job_order',
          title: { bn: 'নতুন নিয়োগ চাহিদা', en: 'New recruitment demand' },
          countryCode: 'QA',
          sourceIds: ['src_qa_adlsa'],
          payload: { positions: 10, occupationKey: 'electrician' },
          safetyAttestations: {
            noGuaranteedOutcome: true,
            feesDeclared: true,
            dataUseConsent: true,
            officialAuthorityNotImplied: true,
          },
          promotionDisclosure: {
            paid: true,
            label: { bn: 'স্পনসরড', en: 'Sponsored' },
          },
        },
        partnerToken,
      ),
    );
    expect(submission.status).toBe('draft');
    expect(submission.verificationLevel).toBe('evidence_submitted');
    expect(submission.organicRankInfluencedByPayment).toBe(false);

    const reviewed = json(
      await post(`/api/v1/partner/submissions/${submission.id}/submit`, {}, partnerToken),
    );
    expect(reviewed.status).toBe('in_review');
    expect(reviewed.publicationChangeId).toBeTruthy();
    const reviewerToken = await session({
      id: 'partner-reviewer1',
      roles: ['compliance_reviewer'],
      mfa: true,
    });
    const approvedChange = json(
      await post(
        `/api/v1/operations/publication-changes/${reviewed.publicationChangeId}/review`,
        {
          decision: 'approve',
          note: 'Independent reviewer checked the official sources and partner attestations.',
        },
        reviewerToken,
      ),
    );
    expect(approvedChange.status).toBe('approved');
    const approvedSubmission = await storage.partnerSubmissions.require(submission.id);
    expect(approvedSubmission.status).toBe('approved');
    expect(approvedSubmission.verificationLevel).toBe('human_verified');

    const protectedField = await post(
      '/api/v1/partner/submissions',
      {
        kind: 'employer_job_order',
        title: { bn: 'অবৈধ র‍্যাঙ্ক', en: 'Invalid rank' },
        countryCode: 'QA',
        sourceIds: ['src_qa_adlsa'],
        payload: { paid_rank_boost: 100 },
        safetyAttestations: {
          noGuaranteedOutcome: true,
          feesDeclared: true,
          dataUseConsent: true,
          officialAuthorityNotImplied: true,
        },
      },
      partnerToken,
    );
    expect(protectedField.statusCode).toBe(400);
  });

  it('shows a partner only pseudonymous candidates with active explicit consent', async () => {
    const applicantToken = await session({ id: 'worker2', roles: ['worker'] });
    const partnerToken = await session({
      id: 'partner2',
      roles: ['employer_staff'],
      organizationId: 'org_emp_qa_alnahda',
    });
    await storage.cases.put({
      id: 'case-consent',
      ownerUserId: 'worker2',
      purpose: 'work',
      state: 'SUBMITTED',
      routeVersionId: 'rv_qat_work_v1',
      jobId: 'job_qa_electrician',
      destinationCountry: 'QA',
      createdAt: now,
      updatedAt: now,
      documentIds: [],
      history: [],
    });
    await storage.workApplications.put({
      id: 'application-consent',
      userId: 'worker2',
      jobId: 'job_qa_electrician',
      caseId: 'case-consent',
      status: 'submitted',
      eligibilityAtSubmission: 'eligible',
      submittedAt: now,
      updatedAt: now,
    });
    const before = json(await get('/api/v1/partner/candidates', partnerToken));
    expect(before).toEqual([]);

    const grant = json(
      await post(
        '/api/v1/me/partner-access',
        {
          applicationType: 'work',
          applicationId: 'application-consent',
          organizationId: 'org_emp_qa_alnahda',
          consentGiven: true,
        },
        applicantToken,
      ),
    );
    const candidates = json(await get('/api/v1/partner/candidates', partnerToken));
    expect(candidates).toHaveLength(1);
    expect(candidates[0].sharedByExplicitConsent).toBe(true);
    expect(candidates[0].pseudonymousCandidateRef).toMatch(/^candidate_/);
    expect(JSON.stringify(candidates[0])).not.toMatch(/phone|passport|displayName/i);

    const event = json(
      await post(
        '/api/v1/partner/applications/application-consent/actions',
        { applicationType: 'work', action: 'record_offer', note: 'Recorded employer offer.' },
        partnerToken,
      ),
    );
    expect(event.action).toBe('record_offer');
    expect((await storage.workApplications.require('application-consent')).status).toBe(
      'offer_received',
    );

    await del(`/api/v1/me/partner-access/${grant.id}`, applicantToken);
    expect(json(await get('/api/v1/partner/candidates', partnerToken))).toEqual([]);
  });

  it('suppresses small outcome cohorts and exposes reviewed aggregates at k=5', async () => {
    const reviewerToken = await session({
      id: 'reviewer3',
      roles: ['compliance_reviewer'],
      mfa: true,
    });
    const partnerToken = await session({
      id: 'partner3',
      roles: ['employer_staff'],
      organizationId: 'org_emp_qa_alnahda',
    });
    const early = json(
      await get('/api/v1/public/outcomes/aggregates?path=work&organization=org_emp_qa_alnahda'),
    );
    expect(early.suppressed).toBe(true);
    expect(early.metrics).toBeNull();

    for (let index = 0; index < 5; index += 1) {
      const userId = `cohort${index}`;
      await storage.users.put({
        id: userId,
        phone: `+88017110000${index}`,
        roles: ['worker'],
        locale: 'bn-BD',
        createdAt: now,
      });
      await storage.cases.put({
        id: `case-cohort-${index}`,
        ownerUserId: userId,
        purpose: 'work',
        state: 'ARRIVED',
        routeVersionId: 'rv_qat_work_v1',
        jobId: 'job_qa_electrician',
        destinationCountry: 'QA',
        createdAt: now,
        updatedAt: now,
        documentIds: [],
        history: [],
      });
      await storage.workOutcomes.put({
        id: `outcome-cohort-${index}`,
        userId,
        caseId: `case-cohort-${index}`,
        jobId: 'job_qa_electrician',
        consentGiven: true,
        departed: true,
        arrived: true,
        joinedExpectedEmployer: true,
        occupationMatched: true,
        salaryMatched: true,
        accommodationMatched: true,
        actualMonthlySalary: { minorUnits: '180000', currency: 'QAR' },
        actualWorkerCost: { minorUnits: String(900000 + index * 10000), currency: 'BDT' },
        observedAt: `2026-06-0${index + 1}T00:00:00.000Z`,
        reviewStatus: 'pending_human_review',
      });
      const review = await post(
        `/api/v1/outcomes/reviews/work/outcome-cohort-${index}`,
        {
          decision: 'verified',
          note: 'Evidence reviewed independently against the recorded case and job terms.',
          evidenceDocumentIds: [],
        },
        reviewerToken,
      );
      expect(review.statusCode).toBe(201);
    }

    const aggregate = json(
      await get(
        '/api/v1/public/outcomes/aggregates?path=work&organization=org_emp_qa_alnahda&currency=BDT',
      ),
    );
    expect(aggregate.suppressed).toBe(false);
    expect(aggregate.reviewedCohortSize).toBe(5);
    expect(aggregate.metrics.actualCostMedian).toEqual({
      minorUnits: '920000',
      currency: 'BDT',
    });
    expect(aggregate.metrics.promisedTermsMatchedPercent).toBe(100);

    const institutional = json(
      await get('/api/v1/outcomes/institutional/org_emp_qa_alnahda?path=work', partnerToken),
    );
    expect(institutional.organicRanking.paymentInfluence).toBe(false);
    expect(institutional.organicRanking.eligibleForOutcomeSignal).toBe(true);
    expect(institutional.trustEdges.length).toBeGreaterThan(0);
  });

  it('keeps unknown study promises unknown in the user comparison', async () => {
    const studentToken = await session({ id: 'student4', roles: ['student'] });
    await storage.cases.put({
      id: 'case-study-outcome',
      ownerUserId: 'student4',
      purpose: 'study',
      state: 'ACTIVE',
      routeVersionId: 'rv_can_study_v1',
      destinationCountry: 'CA',
      createdAt: now,
      updatedAt: now,
      documentIds: [],
      history: [],
    });
    await storage.studyApplications.put({
      id: 'application-study-outcome',
      userId: 'student4',
      programId: 'crs_ca_electrical',
      institutionId: 'inst_ca_maple',
      caseId: 'case-study-outcome',
      intake: '2027-01',
      status: 'accepted',
      eligibilityAtSubmission: 'unknown_institution_confirmation',
      submittedAt: now,
      updatedAt: now,
    });
    await storage.studyOutcomes.put({
      id: 'study-outcome-one',
      userId: 'student4',
      applicationId: 'application-study-outcome',
      consentGiven: true,
      admissionObtained: true,
      enrolled: true,
      scholarshipObtained: false,
      actualTuition: { minorUnits: '1650000', currency: 'CAD' },
      observedAt: '2027-02-01T00:00:00.000Z',
      reviewStatus: 'pending_human_review',
    });
    const comparisons = json(await get('/api/v1/me/outcomes/comparisons', studentToken));
    const scholarship = comparisons[0].fields.find(
      (field: { key: string }) => field.key === 'scholarship',
    );
    expect(scholarship.promised).toBeNull();
    expect(scholarship.state).toBe('unknown');
    expect(comparisons[0].reviewStatus).toBe('pending');

    const followUps = json(await get('/api/v1/me/outcomes/follow-ups', studentToken));
    expect(followUps.map((item: { checkpointDays: number }) => item.checkpointDays)).toEqual([
      90, 180,
    ]);
  });
});
