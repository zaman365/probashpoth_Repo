import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { loadEnv } from '@probash/config';
import { fakePdf, signedWebhook, syntheticPhone } from '@probash/testing';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './common/domain-exception.filter';
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
