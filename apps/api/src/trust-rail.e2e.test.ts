import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { loadEnv } from '@probash/config';
import { fakePdf, signedWebhook, syntheticPhone } from '@probash/testing';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './common/domain-exception.filter';
import { hashToken } from './common/session.guard';
import { MemoryStorage } from './storage/memory/memory-storage';

/**
 * §63 — the first end-to-end vertical slice, exercised as a whole:
 * account → route → verified job → real cost → fraud scan → case → family co-pilot
 * → sandbox payment → milestone → settlement → receipt.
 */
describe('trust rail (§63 vertical slice)', () => {
  let app: NestFastifyApplication;
  let storage: MemoryStorage;

  const env = loadEnv({ APP_ENV: 'test', STORAGE_DRIVER: 'memory' });

  const json = <T = any>(res: { payload: string }): T => JSON.parse(res.payload) as T;

  const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
    app.inject({ method: 'POST', url, payload: body as object, headers });
  const patch = (url: string, body: unknown, headers: Record<string, string> = {}) =>
    app.inject({ method: 'PATCH', url, payload: body as object, headers });
  const get = (url: string, headers: Record<string, string> = {}) =>
    app.inject({ method: 'GET', url, headers });

  async function signIn(phone: string): Promise<string> {
    const otp = json(await post('/api/v1/auth/request-otp', { phone }));
    const session = json(
      await post('/api/v1/auth/verify-otp', {
        challengeId: otp.challengeId,
        code: otp.devOtp,
        consentAccepted: true,
      }),
    );
    return session.token as string;
  }

  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

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

  describe('seed and health', () => {
    it('serves every ISO country and the published routes', async () => {
      const body = json(await get('/api/v1/health'));
      expect(body.seed.countries).toBe(249);
      expect(body.seed.publishedRoutes).toBeGreaterThanOrEqual(10);
      expect(body.defaultLocale).toBe('bn-BD');
      expect(body.featureFlags.liveLicensedPaymentProvider).toBe(false);
    });

    it('keeps the product name configurable rather than hard-coded', async () => {
      const body = json(await get('/api/v1/health'));
      expect(body.product.nameEn).toBe(env.PUBLIC_PRODUCT_NAME);
    });
  });

  describe('onboarding (§17)', () => {
    it('refuses to create an account without explicit consent', async () => {
      const otp = json(await post('/api/v1/auth/request-otp', { phone: syntheticPhone(1) }));
      const res = await post('/api/v1/auth/verify-otp', {
        challengeId: otp.challengeId,
        code: otp.devOtp,
        consentAccepted: false,
      });
      expect(res.statusCode).toBe(412);
    });

    it('rejects a wrong code and records a security audit event', async () => {
      const otp = json(await post('/api/v1/auth/request-otp', { phone: syntheticPhone(2) }));
      const wrong = otp.devOtp === '000000' ? '111111' : '000000';
      const res = await post('/api/v1/auth/verify-otp', {
        challengeId: otp.challengeId,
        code: wrong,
        consentAccepted: true,
      });
      expect(res.statusCode).toBe(401);
      const events = await storage.auditEvents.list((e) => e.action === 'otp.failed');
      expect(events.length).toBeGreaterThan(0);
    });

    it('rejects a non-Bangladeshi mobile number at the boundary', async () => {
      const res = await post('/api/v1/auth/request-otp', { phone: '+4915112345678' });
      expect(res.statusCode).toBe(400);
    });

    it('never requires an email address', async () => {
      const token = await signIn(syntheticPhone(3));
      expect(token).toBeTruthy();
    });
  });

  describe('eligibility (§19, ADR 0003)', () => {
    it('answers "we cannot determine" for an anonymous visitor with no facts', async () => {
      const body = json(
        await post('/api/v1/eligibility/evaluate', { routeVersionId: 'rv_qat_work_v1' }),
      );
      expect(body.trace.result).toBe('unknown');
      expect(body.humanReviewOffered).toBe(true);
      expect(body.trace.missingFacts.length).toBeGreaterThan(0);
    });

    it('returns eligible with a source-backed trace once the profile is complete', async () => {
      const token = await signIn(syntheticPhone(4));
      await patch(
        '/api/v1/me/profile',
        {
          displayName: 'Test Worker',
          occupationKey: 'electrician',
          experienceMonths: 36,
          hasValidPassport: true,
          passportValidMonths: 18,
          hasBmetRegistration: true,
          educationLevel: 'hsc',
        },
        auth(token),
      );
      const body = json(
        await post(
          '/api/v1/eligibility/evaluate/me',
          { routeVersionId: 'rv_qat_work_v1', facts: { hasEmployerOffer: true } },
          auth(token),
        ),
      );
      expect(body.trace.result).toBe('eligible');
      expect(body.sources.length).toBeGreaterThan(0);
      expect(body.trace.satisfied.length).toBeGreaterThan(0);
    });

    it('offers preparation steps instead of a flat "no" when a gap is fixable', async () => {
      const token = await signIn(syntheticPhone(5));
      await patch(
        '/api/v1/me/profile',
        { hasValidPassport: true, passportValidMonths: 24, educationLevel: 'ssc' },
        auth(token),
      );
      const body = json(
        await post(
          '/api/v1/eligibility/evaluate/me',
          { routeVersionId: 'rv_deu_skilled_v1', facts: { hasEmployerOffer: false } },
          auth(token),
        ),
      );
      expect(body.trace.result).toBe('conditional');
      expect(body.trace.remediable.length).toBeGreaterThan(0);
      expect(body.trace.remediable[0].preparation).toBeTruthy();
    });

    it('never returns a numeric probability of getting a visa', async () => {
      const body = json(
        await post('/api/v1/eligibility/evaluate', { routeVersionId: 'rv_qat_work_v1' }),
      );
      expect(JSON.stringify(body)).not.toMatch(/probability|score|chance/i);
    });
  });

  describe('public job verification (§21)', () => {
    it('verifies a real public id and returns a signed QR payload', async () => {
      const body = json(await get('/api/v1/verify/job/BD-QA-2026-00482915'));
      expect(body.status).toBe('verified');
      expect(body.qrPayload).toBeTruthy();
      expect(body.allowedWorkerCost).toBeTruthy();
      expect(body.isSyntheticDemoData).toBe(true);
    });

    it('says "not found" for an invented id instead of failing quietly', async () => {
      const body = json(await get('/api/v1/verify/job/BD-QA-2026-99999999'));
      expect(body.status).toBe('not_found');
    });

    it('marks a suspended job as suspended, not verified', async () => {
      const body = json(await get('/api/v1/verify/job/BD-MY-2026-00220118'));
      expect(body.status).toBe('suspended');
    });

    it('accepts its own QR token and rejects a tampered one', async () => {
      const verified = json(await get('/api/v1/verify/job/BD-QA-2026-00482915'));
      const ok = json(await post('/api/v1/verify/qr', { token: verified.qrPayload }));
      expect(ok.qrValid).toBe(true);
      expect(ok.publicId).toBe('BD-QA-2026-00482915');

      const [body] = String(verified.qrPayload).split('.');
      const tampered = json(await post('/api/v1/verify/qr', { token: `${body}.deadbeefdeadbeef` }));
      expect(tampered.qrValid).toBe(false);
    });

    it('never puts personal data in the QR payload', async () => {
      const verified = json(await get('/api/v1/verify/job/BD-QA-2026-00482915'));
      const [payload] = String(verified.qrPayload).split('.');
      const decoded = JSON.parse(Buffer.from(payload!, 'base64url').toString('utf8'));
      expect(Object.keys(decoded).sort()).toEqual(['iat', 'id', 'kid', 'v']);
    });
  });

  describe('offer scanner (§23)', () => {
    it('flags a broker message with guarantee, personal wallet and inflated cost', async () => {
      const body = json(
        await post('/api/v1/verify/offer', {
          messageText:
            'Qatar electrician job 100% visa guarantee! Send 150000 taka to my personal bkash 01812345678, cash only.',
          publicJobId: 'BD-QA-2026-00482915',
          claimed: {
            monthlySalary: { minorUnits: '300000', currency: 'QAR' },
            totalCostToWorker: { minorUnits: '15000000', currency: 'BDT' },
          },
        }),
      );
      expect(body.verdict).toBe('HIGH_RISK');
      const kinds = body.signals.map((s: { kind: string }) => s.kind);
      expect(kinds).toEqual(
        expect.arrayContaining([
          'payment_to_personal_account',
          'cost_above_declared',
          'guarantee_language',
          'salary_mismatch',
          'cash_payment_requested',
        ]),
      );
      expect(body.humanReviewRequested).toBe(true);
    });

    it('reports an unknown verification id as critical rather than shrugging', async () => {
      const body = json(await post('/api/v1/verify/offer', { publicJobId: 'BD-QA-2026-11111111' }));
      expect(body.verdict).toBe('HIGH_RISK');
      expect(body.signals[0].kind).toBe('job_id_not_found');
    });

    it('cannot reach VERIFIED when no verification id was supplied', async () => {
      const body = json(
        await post('/api/v1/verify/offer', { messageText: 'Good job offer in Doha, call me' }),
      );
      expect(body.verdict).toBe('UNKNOWN_HUMAN_CHECK_REQUIRED');
      expect(
        body.checksPerformed.find((c: { key: string }) => c.key === 'job_id_exists').performed,
      ).toBe(false);
    });

    it('never claims a document is authentic just because it was uploaded (§22)', async () => {
      const body = json(
        await post('/api/v1/verify/offer', {
          documentId: 'doc_whatever',
          publicJobId: 'BD-QA-2026-00482915',
        }),
      );
      const check = body.checksPerformed.find(
        (c: { key: string }) => c.key === 'document_authenticity',
      );
      expect(check.performed).toBe(false);
      expect(body.verdict).not.toBe('VERIFIED');
    });

    it('flags a visit visa being sold as a work route', async () => {
      const body = json(
        await post('/api/v1/verify/offer', {
          messageText: 'ভিজিট ভিসায় দুবাই পাঠাব, গিয়ে কাজ পাবেন।',
        }),
      );
      const kinds = body.signals.map((s: { kind: string }) => s.kind);
      expect(kinds).toContain('visa_class_inconsistent');
    });

    it('does not store the raw message text', async () => {
      const scans = await storage.scans.list();
      expect(JSON.stringify(scans)).not.toContain('personal bkash');
    });
  });

  describe('case, cost and payment rail (§24, §25)', () => {
    let token: string;
    let caseId: string;
    let plan: any;

    beforeAll(async () => {
      token = await signIn(syntheticPhone(6));
      await patch(
        '/api/v1/me/profile',
        { displayName: 'Rahim', occupationKey: 'electrician', hasValidPassport: true },
        auth(token),
      );
      const created = json(
        await post(
          '/api/v1/cases',
          { routeVersionId: 'rv_qat_work_v1', jobId: 'job_qa_electrician', purpose: 'work' },
          auth(token),
        ),
      );
      caseId = created.id;
      plan = json(await get(`/api/v1/cases/${caseId}/cost-plan`, auth(token)));
    });

    it('refuses to open a case on a paused route (§7)', async () => {
      const res = await post(
        '/api/v1/cases',
        { routeVersionId: 'rv_mys_tep_v1', purpose: 'work' },
        auth(token),
      );
      expect(res.statusCode).toBe(412);
    });

    it('builds tasks and milestones from the route, not by hand', async () => {
      const detail = json(await get(`/api/v1/cases/${caseId}`, auth(token)));
      expect(detail.tasks.length).toBeGreaterThan(0);
      expect(detail.milestones.length).toBe(9);
      expect(detail.tasks[0].whyNeeded).toBeTruthy();
      expect(detail.tasks[0].sourceIds.length).toBeGreaterThan(0);
    });

    it('shows every cost item with payer, payee and refundability', async () => {
      expect(plan.items.length).toBeGreaterThan(0);
      for (const item of plan.items) {
        expect(item.payer.kind).toBeTruthy();
        expect(item.payee.kind).toBeTruthy();
        expect(typeof item.refundable).toBe('boolean');
        expect(item.label.bn).toBeTruthy();
      }
    });

    it('attributes employer-paid costs to the employer (§5)', async () => {
      const bdt = plan.totals.find((t: { currency: string }) => t.currency === 'BDT');
      expect(BigInt(bdt.totals.employerPaid.minorUnits)).toBeGreaterThan(0n);
      expect(BigInt(bdt.totals.workerPaid.minorUnits)).toBeGreaterThan(0n);
    });

    it('lists unconfirmed costs separately instead of quoting them as fact', async () => {
      expect(plan.unresolvedItemIds.length).toBeGreaterThan(0);
    });

    it('refuses to collect an unconfirmed cost', async () => {
      const res = await post(
        `/api/v1/cases/${caseId}/payment-intents`,
        {
          costItemId: plan.unresolvedItemIds[0],
          method: 'mfs',
          idempotencyKey: 'unresolved-key-1',
        },
        auth(token),
      );
      expect(res.statusCode).toBe(412);
    });

    it('refuses to collect a cost the employer is responsible for', async () => {
      const employerItem = plan.items.find((i: any) => i.payer.kind === 'employer');
      const res = await post(
        `/api/v1/cases/${caseId}/payment-intents`,
        { costItemId: employerItem.id, method: 'mfs', idempotencyKey: 'employer-key-1' },
        auth(token),
      );
      expect(res.statusCode).toBe(412);
    });

    it('runs the full milestone-controlled settlement path', async () => {
      const medical = plan.items.find((i: any) => i.category === 'medical_fee');
      const intent = json(
        await post(
          `/api/v1/cases/${caseId}/payment-intents`,
          { costItemId: medical.id, method: 'mfs', idempotencyKey: 'medical-key-1' },
          auth(token),
        ),
      );
      expect(intent.isSandbox).toBe(true);
      expect(intent.milestoneKey).toBe('medical_complete');

      // Replaying the same idempotency key must not create a second payment.
      const replay = json(
        await post(
          `/api/v1/cases/${caseId}/payment-intents`,
          { costItemId: medical.id, method: 'mfs', idempotencyKey: 'medical-key-1' },
          auth(token),
        ),
      );
      expect(replay.id).toBe(intent.id);

      const webhook = {
        providerTransactionId: 'ptx_test_1',
        paymentIntentId: intent.id,
        event: 'payment.confirmed',
        amount: intent.amount,
        occurredAt: '2026-08-25T12:00:00.000Z',
      };

      const unsigned = await post('/api/v1/webhooks/payments/mock', webhook, {
        'x-probash-signature': 'not-a-signature',
      });
      expect(unsigned.statusCode).toBe(403);

      const { signature } = signedWebhook(
        webhook as Parameters<typeof signedWebhook>[0],
        env.PAYMENT_WEBHOOK_SECRET,
      );
      const accepted = json(
        await post('/api/v1/webhooks/payments/mock', webhook, { 'x-probash-signature': signature }),
      );
      expect(accepted).toEqual({ accepted: true, replay: false });

      const replayed = json(
        await post('/api/v1/webhooks/payments/mock', webhook, { 'x-probash-signature': signature }),
      );
      expect(replayed.replay).toBe(true);

      const early = json(
        await post(`/api/v1/cases/${caseId}/payment-intents/${intent.id}/settle`, {}, auth(token)),
      );
      expect(early).toMatchObject({ released: false, reason: 'milestone_not_verified' });

      await post(
        `/api/v1/cases/${caseId}/actions`,
        { action: 'verify_milestone', milestoneKey: 'medical_complete' },
        auth(token),
      );
      const released = json(
        await post(`/api/v1/cases/${caseId}/payment-intents/${intent.id}/settle`, {}, auth(token)),
      );
      expect(released.released).toBe(true);

      const ledger = json(await get(`/api/v1/cases/${caseId}/ledger`, auth(token)));
      expect(ledger.entries.length).toBe(2);
      expect(ledger.trialBalance.minorUnits).toBe('0');

      const receipt = json(await get(`/api/v1/payments/${intent.id}/receipt`, auth(token)));
      expect(receipt.settlementState).toBe('released');
      expect(receipt.isSandbox).toBe(true);
      expect(receipt.smsText.bn).toContain('৳');
      expect(receipt.smsText.en).toMatch(/Refundable|Not refundable/);
    });
  });

  describe('family co-pilot (§28)', () => {
    let workerToken: string;
    let familyToken: string;
    let caseId: string;

    beforeAll(async () => {
      familyToken = await signIn(syntheticPhone(7));
      workerToken = await signIn(syntheticPhone(8));
      const created = json(
        await post(
          '/api/v1/cases',
          { routeVersionId: 'rv_qat_work_v1', jobId: 'job_qa_mason', purpose: 'work' },
          auth(workerToken),
        ),
      );
      caseId = created.id;
      await post(
        '/api/v1/delegations',
        {
          delegatePhone: syntheticPhone(7),
          relationship: 'spouse',
          permissions: ['view_progress', 'view_cost'],
        },
        auth(workerToken),
      );
    });

    it('lets the delegate see progress and cost', async () => {
      const detail = await get(`/api/v1/cases/${caseId}`, auth(familyToken));
      expect(detail.statusCode).toBe(200);
      const cost = await get(`/api/v1/cases/${caseId}/cost-plan`, auth(familyToken));
      expect(cost.statusCode).toBe(200);
    });

    it('does not let the delegate act on the case', async () => {
      const res = await post(
        `/api/v1/cases/${caseId}/actions`,
        { action: 'withdraw', reason: 'no' },
        auth(familyToken),
      );
      expect(res.statusCode).toBe(403);
    });

    it('audits every delegated read', async () => {
      const events = await storage.auditEvents.list(
        (e) => e.kind === 'access' && e.caseId === caseId,
      );
      expect(events.length).toBeGreaterThan(0);
    });

    it('stops all access once revoked', async () => {
      const delegations = json(await get('/api/v1/delegations', auth(workerToken)));
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/delegations/${delegations[0].id}`,
        headers: auth(workerToken),
      });
      const after = await get(`/api/v1/cases/${caseId}`, auth(familyToken));
      expect(after.statusCode).toBe(403);
    });

    it('masks the delegate phone number in responses', async () => {
      const delegations = json(await get('/api/v1/delegations', auth(workerToken)));
      expect(delegations[0].delegatePhoneMasked).not.toContain('1744444444');
    });
  });

  describe('Migration Passport, matching and preparation (blueprint §6–§7, §99)', () => {
    let token: string;

    beforeAll(async () => {
      token = await signIn(syntheticPhone(11));
    });

    it('creates one shared Passport with independent Work and Study profiles', async () => {
      const bundle = json(await get('/api/v1/me/passport', auth(token)));
      expect(bundle.shared.preferences.openness).toBe('unsure');
      expect(bundle.work.targetOccupationKeys).toEqual([]);
      expect(bundle.study.education).toEqual([]);
      expect(bundle.shared.userId).toBe(bundle.work.userId);
      expect(bundle.shared.userId).toBe(bundle.study.userId);
    });

    it('stores full Work and academic evidence without forcing a permanent path choice', async () => {
      const shared = json(
        await patch(
          '/api/v1/me/passport/shared',
          {
            identity: { passportStatus: 'valid', passportValidityMonths: 30 },
            financial: { plannedBudgetBdt: 800000, scholarshipNeeded: true },
            preferences: {
              openness: 'both',
              preferredCountries: ['DE', 'GB'],
              willingToLearnLanguage: true,
            },
          },
          auth(token),
        ),
      );
      expect(shared.preferences.openness).toBe('both');

      const work = json(
        await patch(
          '/api/v1/me/passport/work',
          {
            targetOccupationKeys: ['electrician'],
            totalExperienceMonths: 36,
            employmentHistory: [
              {
                id: 'employment-1',
                employerName: 'Evidence-backed employer',
                occupationKey: 'electrician',
                current: false,
                responsibilities: ['Electrical installation'],
                evidenceDocumentIds: ['document-experience-1'],
              },
            ],
            credentials: [
              {
                id: 'credential-1',
                kind: 'skill_certificate',
                title: 'Electrical trade certificate',
                verificationStatus: 'unverified',
                evidenceDocumentIds: ['document-skill-1'],
              },
            ],
            bmetRegistrationReady: true,
          },
          auth(token),
        ),
      );
      expect(work.targetOccupationKeys).toEqual(['electrician']);

      const study = json(
        await patch(
          '/api/v1/me/passport/study',
          {
            targetLevel: 'master',
            targetFields: ['engineering'],
            education: [
              {
                id: 'education-1',
                level: 'bachelor',
                institution: 'Example University',
                field: 'Electrical Engineering',
                resultKind: 'cgpa',
                resultValue: '3.5',
                resultScale: '4.0',
                certificateDocumentIds: ['document-degree-1'],
                transcriptDocumentIds: ['document-transcript-1'],
              },
            ],
            languageEvidence: [
              {
                id: 'language-1',
                language: 'English',
                selfAssessedLevel: 'advanced',
                testName: 'IELTS Academic',
                overallScore: '7.0',
                evidenceDocumentIds: ['document-language-1'],
              },
            ],
          },
          auth(token),
        ),
      );
      expect(study.targetLevel).toBe('master');
      expect(study.education[0].resultValue).toBe('3.5');
    });

    it('versions transparent assessments and generates separate gap tasks', async () => {
      const result = json(await post('/api/v1/me/passport/assessments', {}, auth(token)));
      expect(result.work.engineVersion).toBe('passport-readiness-v1');
      expect(result.study.engineVersion).toBe('passport-readiness-v1');
      expect(result.work.evidenceCoveragePercent).toBeGreaterThan(0);
      expect(result.study.factors.some((factor: any) => factor.state === 'unknown')).toBe(true);
      expect(result.tasks.every((task: any) => task.templateVersion === 'gap-plan-v1')).toBe(true);
    });

    it('runs distinct Work and Study matchers without declaring a generic winner', async () => {
      const result = json(await post('/api/v1/me/passport/matches', {}, auth(token)));
      expect(result.engineVersion).toBe('transparent-matching-v1');
      expect(result.work.length).toBeGreaterThan(0);
      expect(result.study.length).toBeGreaterThan(0);
      expect(result.work.every((match: any) => match.path === 'work')).toBe(true);
      expect(result.study.every((match: any) => match.path === 'study')).toBe(true);
      expect(result.comparison.genericWinner).toBeNull();
      expect(result.study.some((match: any) => match.hardEligibility === 'unknown')).toBe(true);
    });

    it('stores user-controlled alerts and audits their removal', async () => {
      const created = json(
        await post(
          '/api/v1/me/passport/alerts',
          {
            path: 'both',
            countryCodes: ['DE'],
            candidateIds: [],
            eventTypes: ['rule_changed', 'deadline_changed'],
            channel: 'in_app',
            active: true,
          },
          auth(token),
        ),
      );
      const alerts = json(await get('/api/v1/me/passport/alerts', auth(token)));
      expect(alerts.map((alert: any) => alert.id)).toContain(created.id);
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/me/passport/alerts/${created.id}`,
        headers: auth(token),
      });
      expect(json(await get('/api/v1/me/passport/alerts', auth(token)))).toEqual([]);
    });

    it('keeps assessment and recommendation history instead of overwriting decisions', async () => {
      const history = json(await get('/api/v1/me/passport/history', auth(token)));
      expect(history.assessments.length).toBeGreaterThanOrEqual(4);
      expect(history.recommendations.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Work Abroad OS journey (blueprint §14–§38)', () => {
    let token: string;
    let applicationId: string;
    let caseId: string;

    beforeAll(async () => {
      token = await signIn(syntheticPhone(12));
      await patch(
        '/api/v1/me/profile',
        {
          displayName: 'Evidence Worker',
          occupationKey: 'electrician',
          experienceMonths: 48,
          educationLevel: 'hsc',
          hasValidPassport: true,
          passportValidMonths: 24,
          hasBmetRegistration: true,
        },
        auth(token),
      );
      await patch(
        '/api/v1/me/passport/shared',
        {
          identity: {
            legalName: 'Evidence Worker',
            passportStatus: 'valid',
            passportValidityMonths: 24,
          },
          preferences: { openness: 'work', preferredCountries: ['QA'] },
        },
        auth(token),
      );
      await patch(
        '/api/v1/me/passport/work',
        {
          targetOccupationKeys: ['electrician'],
          totalExperienceMonths: 48,
          technicalSkills: ['Electrical installation', 'Safety inspection'],
          employmentHistory: [
            {
              id: 'work-history-12',
              employerName: 'Recorded Employer',
              occupationKey: 'electrician',
              current: false,
              responsibilities: ['Installed electrical systems'],
              evidenceDocumentIds: ['document-work-12'],
            },
          ],
        },
        auth(token),
      );
    });

    it('discovers source-backed routes without inventing living cost or savings', async () => {
      const discovery = json(
        await get('/api/v1/work/discover?mode=occupation&occupation=electrician', auth(token)),
      );
      expect(discovery.opportunities.length).toBeGreaterThan(0);
      expect(discovery.opportunities[0].eligibility.result).toBeTruthy();
      expect(discovery.opportunities[0].livingCost.status).toBe('unknown');
      expect(discovery.opportunities[0].estimatedSavings.status).toBe('unknown');
      expect(discovery.note.en).toMatch(/not a probability/i);
    });

    it('generates a CV only from recorded facts and evidence', async () => {
      const cv = json(await get('/api/v1/work/cv?format=trade_one_page', auth(token)));
      expect(cv.format).toBe('trade_one_page');
      expect(cv.experience[0].employerName).toBe('Recorded Employer');
      expect(cv.experience[0].evidenceDocumentIds).toContain('document-work-12');
      expect(JSON.stringify(cv)).not.toContain('fabricated');
    });

    it('submits a verified-job application and opens its route-specific case', async () => {
      const application = json(
        await post(
          '/api/v1/work/applications',
          { jobId: 'job_qa_electrician', eligibilityAcknowledged: true },
          auth(token),
        ),
      );
      expect(application.status).toBe('submitted');
      applicationId = application.id;
      caseId = application.caseId;
      const mobilityCase = json(await get(`/api/v1/cases/${caseId}`, auth(token)));
      expect(mobilityCase.jobId).toBe('job_qa_electrician');
      expect(mobilityCase.tasks.length).toBeGreaterThan(0);
    });

    it('does not let a user accept before an employer offer is recorded', async () => {
      const review = json(
        await get(`/api/v1/work/applications/${applicationId}/offer-review`, auth(token)),
      );
      expect(review.acceptanceBlocked).toBe(true);
      expect(review.takeHomeEstimate.status).toBe('unknown');
      const response = await post(
        `/api/v1/work/applications/${applicationId}/decision`,
        { decision: 'accept', acknowledgedRiskIds: [] },
        auth(token),
      );
      expect(response.statusCode).toBe(412);
    });

    it('requires explicit acknowledgement for every unresolved offer risk', async () => {
      const application = await storage.workApplications.require(applicationId);
      await storage.workApplications.put({ ...application, status: 'offer_received' });
      await storage.scans.put({
        id: 'scan-work-risk-12',
        userId: application.userId,
        verdict: 'HIGH_RISK',
        signals: [],
        checksPerformed: [],
        matchedJobPublicId: 'BD-QA-2026-00482915',
        humanReviewRequested: true,
        scannedAt: new Date().toISOString(),
        inputDigest: 'digest-work-risk-12',
      });
      const blocked = await post(
        `/api/v1/work/applications/${applicationId}/decision`,
        { decision: 'accept', acknowledgedRiskIds: [] },
        auth(token),
      );
      expect(blocked.statusCode).toBe(412);
      const accepted = json(
        await post(
          `/api/v1/work/applications/${applicationId}/decision`,
          { decision: 'accept', acknowledgedRiskIds: ['scan-work-risk-12'] },
          auth(token),
        ),
      );
      expect(accepted.decision).toBe('accepted');
    });

    it('records consented outcomes as pending human review, not instant trust', async () => {
      const outcome = json(
        await post(
          '/api/v1/work/outcomes',
          {
            caseId,
            consentGiven: true,
            departed: true,
            arrived: true,
            joinedExpectedEmployer: true,
            salaryMatched: true,
            jobActiveAtDays: 30,
          },
          auth(token),
        ),
      );
      expect(outcome.reviewStatus).toBe('pending_human_review');
      const employer = await storage.organizations.require('org_emp_qa_alnahda');
      expect(employer.trustSignals?.completedPlacements ?? 0).toBe(0);
    });

    it('shows applications, next actions and arrival-mode eligibility on one dashboard', async () => {
      const dashboard = json(await get('/api/v1/work/dashboard', auth(token)));
      expect(dashboard.applications.map((entry: any) => entry.id)).toContain(applicationId);
      expect(dashboard.cases.map((entry: any) => entry.id)).toContain(caseId);
      expect(dashboard.nextActions.length).toBeGreaterThan(0);
    });
  });

  describe('Higher Study OS journey (blueprint §39–§78)', () => {
    let token: string;
    let shortlistId: string;
    let applicationId: string;

    beforeAll(async () => {
      token = await signIn(syntheticPhone(13));
      await patch(
        '/api/v1/me/passport/shared',
        {
          identity: {
            legalName: 'Evidence Student',
            passportStatus: 'valid',
            passportValidityMonths: 36,
          },
          financial: { scholarshipNeeded: true },
          preferences: { openness: 'study', preferredCountries: ['CA'] },
        },
        auth(token),
      );
      await patch(
        '/api/v1/me/passport/study',
        {
          targetLevel: 'bachelor',
          targetFields: ['electrical engineering'],
          education: [
            {
              id: 'academic-13',
              level: 'higher_secondary',
              institution: 'Recorded College',
              field: 'Science',
              resultKind: 'gpa',
              resultValue: '4.7',
              resultScale: '5.0',
              certificateDocumentIds: ['certificate-13'],
              transcriptDocumentIds: ['transcript-13'],
            },
          ],
          transcriptCourses: [
            {
              id: 'course-13',
              academicCredentialId: 'academic-13',
              title: 'Higher Mathematics',
              normalizedSubjectTags: ['mathematics'],
            },
          ],
        },
        auth(token),
      );
    });

    it('shows programme intelligence while preserving unpublished rules as unknown', async () => {
      const program = json(await get('/api/v1/study/programs/crs_ca_electrical', auth(token)));
      expect(program.institutionTrust).toBe('synthetic_demo');
      expect(program.eligibility).toBe('unknown_institution_confirmation');
      expect(
        program.factors.find((item: any) => item.key === 'subject_credit_prerequisites').state,
      ).toBe('unknown');
      expect(program.fullDegreeCost.status).toBe('unknown');
      expect(program.sources.length).toBeGreaterThan(0);
    });

    it('returns no invented scholarship or post-study matches', async () => {
      const funding = json(await get('/api/v1/study/discover?mode=scholarship', auth(token)));
      expect(funding.programs).toEqual([]);
      expect(funding.note.en).toMatch(/no verified/i);
      const postStudy = json(await get('/api/v1/study/discover?mode=post_study', auth(token)));
      expect(postStudy.programs).toEqual([]);
    });

    it('keeps a user-labelled shortlist and an honest calendar', async () => {
      const shortlist = json(
        await post(
          '/api/v1/study/shortlist',
          { programId: 'crs_ca_electrical', category: 'target' },
          auth(token),
        ),
      );
      shortlistId = shortlist.id;
      const calendar = json(await get('/api/v1/study/calendar', auth(token)));
      expect(calendar.some((item: any) => item.kind === 'intake' && item.status === 'known')).toBe(
        true,
      );
      expect(
        calendar.some((item: any) => item.kind === 'application_deadline' && item.date === null),
      ).toBe(true);
    });

    it('reviews a statement without storing it or inventing achievements', async () => {
      const review = json(
        await post(
          '/api/v1/study/materials/statement-review',
          {
            text: 'My university study supports this program and future career. I published a journal article and need a guaranteed visa.',
          },
          auth(token),
        ),
      );
      expect(review.rawTextStored).toBe(false);
      expect(review.unsupportedClaimWarnings.length).toBeGreaterThan(0);
      expect(review.consistencyWarnings.length).toBeGreaterThan(0);
      expect(JSON.stringify(await storage.auditEvents.list())).not.toContain('journal article');
    });

    it('creates a programme application and a country-specific student case', async () => {
      const application = json(
        await post(
          '/api/v1/study/applications',
          {
            programId: 'crs_ca_electrical',
            intake: '2027-09',
            unknownRulesAcknowledged: true,
          },
          auth(token),
        ),
      );
      applicationId = application.id;
      expect(application.status).toBe('submitted');
      const mobilityCase = json(await get(`/api/v1/cases/${application.caseId}`, auth(token)));
      expect(mobilityCase.purpose).toBe('study');
      expect(mobilityCase.destinationCountry).toBe('CA');
    });

    it('stores consented study outcomes for review, not instant rankings', async () => {
      const outcome = json(
        await post(
          '/api/v1/study/outcomes',
          {
            applicationId,
            consentGiven: true,
            admissionObtained: true,
            scholarshipObtained: false,
          },
          auth(token),
        ),
      );
      expect(outcome.reviewStatus).toBe('pending_human_review');
    });

    it('hands Study into Work without guessing an occupation', async () => {
      const handoff = json(
        await post(
          '/api/v1/study/work-handoff',
          { confirmed: true, targetOccupationKeys: [] },
          auth(token),
        ),
      );
      expect(handoff.unknownOccupationMapping).toBe(true);
      expect(handoff.note.en).toMatch(/no occupation was inferred/i);
    });

    it('combines shortlist, application, visa case and next action on the dashboard', async () => {
      const dashboard = json(await get('/api/v1/study/dashboard', auth(token)));
      expect(dashboard.shortlist.map((entry: any) => entry.id)).toContain(shortlistId);
      expect(dashboard.applications.map((entry: any) => entry.id)).toContain(applicationId);
      expect(dashboard.cases.length).toBeGreaterThan(0);
      expect(dashboard.nextActions.length).toBeGreaterThan(0);
    });
  });

  describe('shared trust and operations (blueprint §79–§85, §109–§111)', () => {
    let complainantToken: string;
    let supportToken: string;
    let reviewerToken: string;
    let researcherToken: string;
    let complaintId: string;
    let reviewId: string;

    async function grantInstitutionalSession(token: string, roles: string[]): Promise<void> {
      const session = await storage.sessions.find((entry) => entry.tokenHash === hashToken(token));
      expect(session).toBeTruthy();
      const user = await storage.users.require(session!.userId);
      await storage.users.put({ ...user, roles });
      await storage.sessions.put({ ...session!, mfaSatisfiedAt: new Date().toISOString() });
    }

    beforeAll(async () => {
      complainantToken = await signIn(syntheticPhone(14));
      supportToken = await signIn(syntheticPhone(15));
      reviewerToken = await signIn(syntheticPhone(16));
      researcherToken = await signIn(syntheticPhone(17));
      await grantInstitutionalSession(supportToken, ['support_agent']);
      await grantInstitutionalSession(reviewerToken, ['compliance_reviewer']);
      await grantInstitutionalSession(researcherToken, ['compliance_reviewer']);
    });

    it('opens an immutable complaint history without publishing an accusation', async () => {
      const complaint = json(
        await post(
          '/api/v1/operations/complaints',
          {
            path: 'work',
            category: 'excess_fee',
            organizationId: 'org_agency_meghna',
            summary:
              'A representative requested an additional fee outside the published cost plan.',
            evidenceDocumentIds: [],
            urgentSafetyRisk: false,
          },
          auth(complainantToken),
        ),
      );
      complaintId = complaint.id;
      expect(complaint.safetyState).toBe('reported');
      expect(complaint.events.map((entry: any) => entry.type)).toEqual(['submitted']);
      const directory = json(await get('/api/v1/services?type=recruiting_agency&country=BD'));
      const agency = directory.find((entry: any) => entry.id === 'org_agency_meghna');
      expect(agency.complaintCount).toBe(1);
      expect(agency.publishedSafetyIncidentCount).toBe(0);
    });

    it('lets support append triage events while preserving the original event', async () => {
      const triaged = json(
        await post(
          `/api/v1/operations/complaints/${complaintId}/actions`,
          { action: 'triage', note: 'Fee evidence requested from the complainant.' },
          auth(supportToken),
        ),
      );
      expect(triaged.status).toBe('triage');
      expect(triaged.events.map((entry: any) => entry.type)).toEqual(['submitted', 'triaged']);
      const stored = await storage.complaintEvents.list(
        (entry) => entry.complaintId === complaintId,
      );
      expect(stored).toHaveLength(2);
    });

    it('routes uncertainty to a human without allowing the decision to rewrite a rule', async () => {
      const review = json(
        await post(
          '/api/v1/operations/reviews',
          {
            type: 'cost_dispute',
            resourceType: 'complaint',
            resourceId: complaintId,
            question: 'Does the requested fee have a current official legal basis?',
            evidenceDocumentIds: [],
            priority: 'high',
          },
          auth(complainantToken),
        ),
      );
      reviewId = review.id;
      const decision = json(
        await post(
          `/api/v1/operations/reviews/${reviewId}/decision`,
          {
            outcome: 'needs_more_evidence',
            explanation: 'The submitted record does not include an official fee notice or receipt.',
            sourceIds: ['src_bd_oep'],
            evidenceDocumentIds: [],
          },
          auth(reviewerToken),
        ),
      );
      expect(decision.changesOfficialRule).toBe(false);
    });

    it('enforces two-person, MFA-backed publication review', async () => {
      const change = json(
        await post(
          '/api/v1/operations/publication-changes',
          {
            resourceType: 'route',
            resourceId: 'rv_qat_work_v1',
            summary:
              'Re-check the route status and fee evidence against the current official source.',
            sourceIds: ['src_qa_adlsa'],
            riskLevel: 'high',
          },
          auth(researcherToken),
        ),
      );
      const submitted = json(
        await post(
          `/api/v1/operations/publication-changes/${change.id}/submit`,
          {},
          auth(researcherToken),
        ),
      );
      expect(submitted.status).toBe('in_review');
      const selfApproval = await post(
        `/api/v1/operations/publication-changes/${change.id}/review`,
        { decision: 'approve', note: 'The same researcher should not be allowed to approve this.' },
        auth(researcherToken),
      );
      expect(selfApproval.statusCode).toBe(403);
      const approved = json(
        await post(
          `/api/v1/operations/publication-changes/${change.id}/review`,
          {
            decision: 'approve',
            note: 'Source and change summary reviewed independently and approved.',
          },
          auth(reviewerToken),
        ),
      );
      expect(approved.status).toBe('approved');
      expect(approved.reviewedByUserId).not.toBe(approved.createdByUserId);
    });
  });

  describe('documents (§29, §50)', () => {
    it('rejects a file whose bytes do not match the declared type', async () => {
      const token = await signIn(syntheticPhone(9));
      const res = await post(
        '/api/v1/me/documents',
        {
          type: 'passport',
          contentType: 'application/pdf',
          contentBase64: Buffer.from('this is not a pdf').toString('base64'),
        },
        auth(token),
      );
      expect(res.statusCode).toBe(400);
    });

    it('stores an uploaded document as unverified and unscanned', async () => {
      const token = await signIn(syntheticPhone(10));
      const pdf = fakePdf();
      const body = json(
        await post(
          '/api/v1/me/documents',
          {
            type: 'passport',
            contentType: 'application/pdf',
            contentBase64: pdf.toString('base64'),
          },
          auth(token),
        ),
      );
      expect(body.verificationLevel).toBe('unverified');
      expect(body.malwareScanStatus).toBe('pending');
      expect(body.sensitive).toBe(true);
    });

    it('requires a session', async () => {
      const res = await get('/api/v1/me/documents');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('privacy of the event stream (§47, §51)', () => {
    it('never writes a phone number or name into an outbox event', async () => {
      const events = await storage.outbox.list();
      expect(events.length).toBeGreaterThan(0);
      const serialized = JSON.stringify(events);
      expect(serialized).not.toMatch(/\+8801\d{9}/);
      expect(serialized).not.toContain('Rahim');
    });
  });
});
