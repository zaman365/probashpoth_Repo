import { Inject, Injectable } from '@nestjs/common';
import { DomainError, Money, uuidv7 } from '@probash/domain';
import type { Env } from '@probash/config';
import { openCaseAccounts, recordConfirmedPayment, recordSettlementRelease } from '@probash/ledger';
import type { Subject } from '@probash/auth';
import type {
  CreatePaymentIntentDto,
  LedgerViewDto,
  PaymentIntentDto,
  PaymentWebhookDto,
  ReceiptDto,
} from '@probash/contracts';
import { ACCOUNT_CODES } from '@probash/ledger';
import { formatMoney, lookupMessage } from '@probash/i18n';
import { ENV } from '../../core/tokens';
import { STORAGE, type Storage } from '../../storage/ports';
import { ClockService } from '../../core/clock.service';
import { AuditService } from '../../core/audit.service';
import { EventOutboxService } from '../../core/event-outbox.service';
import { MockPaymentProvider, type PaymentProvider, type WebhookPayload } from './payment-provider';
import type { PaymentIntentRecord } from '../../storage/records';

/**
 * §25 / ADR 0004 — payment orchestration.
 *
 * Invariants enforced here:
 * - an intent is only created for a cost item whose legal basis is settled;
 * - only a provider-confirmed webhook posts to the ledger;
 * - settlement releases only against a *verified* milestone;
 * - every mutation is idempotent.
 */
@Injectable()
export class PaymentsService {
  private readonly provider: PaymentProvider;

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly events: EventOutboxService,
  ) {
    this.provider = new MockPaymentProvider(env.PAYMENT_WEBHOOK_SECRET);
  }

  get providerName(): string {
    return this.provider.name;
  }

  signWebhookForDevelopment(payload: WebhookPayload): string {
    if (!(this.provider instanceof MockPaymentProvider)) {
      throw new DomainError(
        'NOT_AVAILABLE',
        'Webhook signing is only available for the mock provider',
      );
    }
    return this.provider.sign(payload);
  }

  private toDto(intent: PaymentIntentRecord): PaymentIntentDto {
    return {
      id: intent.id,
      caseId: intent.caseId,
      costItemId: intent.costItemId,
      amount: intent.amount,
      payee: { kind: intent.payeeKind, id: intent.payeeId, name: intent.payeeName },
      method: intent.method,
      provider: intent.provider,
      status: intent.status,
      milestoneKey: intent.milestoneKey,
      createdAt: intent.createdAt,
      confirmedAt: intent.confirmedAt,
      isSandbox: intent.isSandbox,
      providerReference: intent.providerReference,
    };
  }

  async createIntent(
    subject: Subject,
    caseId: string,
    dto: CreatePaymentIntentDto,
  ): Promise<PaymentIntentDto> {
    const caseRecord = await this.storage.cases.require(caseId);
    if (caseRecord.ownerUserId !== subject.userId) {
      throw new DomainError('FORBIDDEN', 'Only the applicant can start a payment');
    }

    const replay = await this.storage.paymentIntents.find(
      (i) => i.idempotencyKey === dto.idempotencyKey,
    );
    if (replay) return this.toDto(replay);

    const costItem = await this.storage.costItems.require(dto.costItemId);
    if (costItem.caseId !== caseId) {
      throw new DomainError('VALIDATION_FAILED', 'This cost item belongs to a different case');
    }
    if (costItem.legallyAllowed === false) {
      throw new DomainError('PRECONDITION_FAILED', 'This charge is not lawful and cannot be paid', {
        messageKey: 'cost.payOnlyHere',
      });
    }
    if (costItem.legallyAllowed === null) {
      // §24 — an unconfirmed cost is never collectable. Silence here would be the
      // exact "processing fee" abuse the platform exists to prevent.
      throw new DomainError(
        'PRECONDITION_FAILED',
        'This cost is not confirmed yet and cannot be collected',
        { messageKey: 'cost.unresolved' },
      );
    }
    if (costItem.status === 'paid') {
      throw new DomainError('CONFLICT', 'This cost item is already paid');
    }
    if (costItem.payer.kind !== 'worker' && costItem.payer.kind !== 'student') {
      throw new DomainError('PRECONDITION_FAILED', 'This cost is not payable by the applicant', {
        details: { payer: costItem.payer.kind },
      });
    }

    const amount = Money.fromJSON(costItem.amount);
    const intent: PaymentIntentRecord = {
      id: uuidv7(),
      caseId,
      costItemId: costItem.id,
      userId: subject.userId,
      amount: costItem.amount,
      payeeKind: costItem.payee.kind,
      payeeId: costItem.payee.id ?? costItem.payee.kind,
      payeeName: costItem.payee.name ?? costItem.label,
      method: dto.method,
      provider: this.provider.name,
      status: 'created',
      milestoneKey: costItem.milestoneId,
      idempotencyKey: dto.idempotencyKey,
      createdAt: this.clock.nowIso(),
      isSandbox: this.provider.isSandbox,
    };

    const providerIntent = await this.provider.createPaymentIntent({
      intentId: intent.id,
      amount,
      method: dto.method,
      payeeRef: intent.payeeId,
      caseRef: caseId,
      idempotencyKey: dto.idempotencyKey,
    });

    intent.providerReference = providerIntent.providerReference;
    intent.status = providerIntent.status;
    await this.storage.paymentIntents.put(intent);
    await this.storage.costItems.put({ ...costItem, status: 'authorized' });

    await this.audit.record({
      actorUserId: subject.userId,
      action: 'payment.intent_created',
      resourceType: 'payment_intent',
      resourceId: intent.id,
      caseId,
      metadata: { provider: intent.provider, sandbox: String(intent.isSandbox) },
    });
    await this.events.publish(
      'PaymentAuthorized',
      { method: dto.method, sandbox: intent.isSandbox },
      { actorRef: subject.userId, caseRef: caseId },
    );

    return this.toDto(intent);
  }

  /**
   * Provider webhook. This is the only path that posts to the ledger: an in-app
   * status change is never financial truth (§25).
   */
  async handleWebhook(
    payload: PaymentWebhookDto,
    signature: string,
  ): Promise<{ accepted: boolean; replay: boolean }> {
    if (!this.provider.verifyWebhook(payload as WebhookPayload, signature)) {
      await this.audit.record({
        kind: 'security',
        action: 'payment.webhook_signature_invalid',
        resourceType: 'payment_intent',
        resourceId: payload.paymentIntentId,
      });
      throw new DomainError('FORBIDDEN', 'Invalid webhook signature');
    }

    const existing = await this.storage.providerTransactions.find(
      (t) => t.id === payload.providerTransactionId,
    );
    if (existing) return { accepted: true, replay: true };

    const intent = await this.storage.paymentIntents.require(payload.paymentIntentId);
    const amount = Money.fromJSON(payload.amount);
    if (!amount.equals(Money.fromJSON(intent.amount))) {
      throw new DomainError('VALIDATION_FAILED', 'Webhook amount does not match the intent');
    }

    await this.storage.providerTransactions.put({
      id: payload.providerTransactionId,
      paymentIntentId: intent.id,
      provider: intent.provider,
      event: payload.event,
      amount: payload.amount,
      occurredAt: payload.occurredAt,
      receivedAt: this.clock.nowIso(),
      rawSignature: signature,
      idempotencyKey: payload.providerTransactionId,
    });

    if (payload.event === 'payment.failed') {
      await this.storage.paymentIntents.put({ ...intent, status: 'failed' });
      const costItem = await this.storage.costItems.get(intent.costItemId);
      if (costItem) await this.storage.costItems.put({ ...costItem, status: 'due' });
      return { accepted: true, replay: false };
    }

    if (payload.event === 'payment.confirmed') {
      const caseRecord = await this.storage.cases.require(intent.caseId);
      openCaseAccounts(this.storage.ledger, {
        currency: amount.currency,
        payeeKind: intent.payeeKind,
        payeeId: intent.payeeId,
        workerUserId: caseRecord.ownerUserId,
      });
      recordConfirmedPayment(this.storage.ledger, {
        providerTransactionId: payload.providerTransactionId,
        caseId: intent.caseId,
        costItemId: intent.costItemId,
        payeeKind: intent.payeeKind,
        payeeId: intent.payeeId,
        amount,
        occurredAt: payload.occurredAt,
        idempotencyKey: `confirm:${payload.providerTransactionId}`,
      });

      await this.storage.paymentIntents.put({
        ...intent,
        status: 'confirmed',
        confirmedAt: this.clock.nowIso(),
      });
      const costItem = await this.storage.costItems.get(intent.costItemId);
      if (costItem) await this.storage.costItems.put({ ...costItem, status: 'paid' });

      await this.audit.record({
        action: 'payment.confirmed',
        resourceType: 'payment_intent',
        resourceId: intent.id,
        caseId: intent.caseId,
        metadata: { providerTransactionId: payload.providerTransactionId },
      });
      await this.events.publish(
        'PaymentConfirmed',
        { sandbox: intent.isSandbox, milestone: intent.milestoneKey ?? 'none' },
        { caseRef: intent.caseId },
      );
    }

    return { accepted: true, replay: false };
  }

  /**
   * §25 — settlement release. Refuses unless the milestone attached to the cost item
   * is verified; the ledger refuses again independently.
   */
  async releaseSettlement(
    subject: Subject,
    caseId: string,
    paymentIntentId: string,
  ): Promise<{ released: boolean; milestoneKey?: string; reason?: string }> {
    const caseRecord = await this.storage.cases.require(caseId);
    const intent = await this.storage.paymentIntents.require(paymentIntentId);
    if (intent.caseId !== caseId) {
      throw new DomainError('VALIDATION_FAILED', 'This payment belongs to a different case');
    }
    if (intent.status !== 'confirmed') {
      return { released: false, reason: 'payment_not_confirmed' };
    }
    if (!intent.milestoneKey) {
      return { released: false, reason: 'no_milestone_attached' };
    }

    const milestone = await this.storage.caseMilestones.find(
      (m) => m.caseId === caseId && m.key === intent.milestoneKey,
    );
    if (!milestone || milestone.status !== 'verified') {
      return {
        released: false,
        milestoneKey: intent.milestoneKey,
        reason: 'milestone_not_verified',
      };
    }

    recordSettlementRelease(this.storage.ledger, {
      settlementInstructionId: `si_${intent.id}`,
      caseId,
      milestoneKey: intent.milestoneKey,
      payeeKind: intent.payeeKind,
      payeeId: intent.payeeId,
      amount: Money.fromJSON(intent.amount),
      occurredAt: this.clock.nowIso(),
      idempotencyKey: `release:${intent.id}`,
      milestoneVerified: true,
    });

    await this.audit.record({
      actorUserId: subject.userId,
      action: 'settlement.released',
      resourceType: 'payment_intent',
      resourceId: intent.id,
      caseId,
      metadata: { milestone: intent.milestoneKey },
    });
    await this.events.publish(
      'SettlementReleased',
      { milestone: intent.milestoneKey },
      {
        caseRef: caseId,
        actorRef: caseRecord.ownerUserId,
      },
    );

    return { released: true, milestoneKey: intent.milestoneKey };
  }

  async listIntents(caseId: string): Promise<PaymentIntentDto[]> {
    const intents = await this.storage.paymentIntents.list((i) => i.caseId === caseId);
    return intents.map((i) => this.toDto(i));
  }

  /** §24 — a receipt a worker can read, print, or receive as an SMS. */
  async receipt(paymentIntentId: string): Promise<ReceiptDto> {
    const intent = await this.storage.paymentIntents.require(paymentIntentId);
    const costItem = await this.storage.costItems.require(intent.costItemId);
    const caseRecord = await this.storage.cases.require(intent.caseId);
    const user = await this.storage.users.require(caseRecord.ownerUserId);
    const milestone = intent.milestoneKey
      ? await this.storage.caseMilestones.find(
          (m) => m.caseId === intent.caseId && m.key === intent.milestoneKey,
        )
      : undefined;

    const released = milestone?.status === 'verified';
    const amountText = formatMoney(intent.amount, { compactMinorUnits: true });
    const receiptNumber = `RCPT-${intent.id.slice(0, 8).toUpperCase()}`;

    // ADR 0002 — receipt copy is critical, user-facing text: it comes from the
    // catalogue so it goes through the same Bangla review gate as every other
    // money-related string, and never gets hard-coded here.
    const say = (locale: 'bn-BD' | 'en', key: string): string => lookupMessage(locale, key) ?? key;
    const smsLine = (locale: 'bn-BD' | 'en'): string => {
      const stop = locale === 'en' ? '. ' : '। ';
      const payeeName = locale === 'en' ? intent.payeeName.en : intent.payeeName.bn;
      const label = locale === 'en' ? costItem.label.en : costItem.label.bn;
      return (
        `${receiptNumber}: ${amountText} — ${label} (${payeeName})${stop}` +
        `${say(locale, costItem.refundable ? 'cost.refundable' : 'cost.nonRefundable')}${stop}` +
        `${say(locale, released ? 'payment.settlementReleased' : 'payment.heldUntilMilestone')}${stop}` +
        `${intent.isSandbox ? `[${say(locale, 'cost.sandboxTag')}]` : ''}`
      ).trim();
    };

    return {
      receiptNumber,
      issuedAt: intent.confirmedAt ?? intent.createdAt,
      caseId: intent.caseId,
      costItem: { id: costItem.id, label: costItem.label, category: costItem.category },
      amount: intent.amount,
      payer: {
        bn: user.displayName ?? say('bn-BD', 'cost.applicant'),
        en: user.displayName ?? say('en', 'cost.applicant'),
      },
      payee: intent.payeeName,
      method: intent.method,
      providerReference: intent.providerReference,
      refundable: costItem.refundable,
      milestoneKey: intent.milestoneKey,
      settlementState: released ? 'released' : 'held_until_milestone',
      isSandbox: intent.isSandbox,
      smsText: { bn: smsLine('bn-BD'), en: smsLine('en') },
    };
  }

  /** §25 — the case ledger view. Shows what is held and for whom, in plain terms. */
  async ledgerView(caseId: string, currency = 'BDT'): Promise<LedgerViewDto> {
    const entries = this.storage.ledger
      .listEntries()
      .filter((entry) => entry.metadata['caseId'] === caseId);

    const payeeAccounts = new Set(
      (await this.storage.paymentIntents.list((i) => i.caseId === caseId)).map((i) =>
        ACCOUNT_CODES.payable(i.payeeKind, i.payeeId, Money.fromJSON(i.amount).currency),
      ),
    );

    const heldForPayees = [...payeeAccounts]
      .filter((code) => this.storage.ledger.getAccount(code))
      .map((code) => ({
        accountCode: code,
        balance: this.storage.ledger.balanceOf(code).balance.toJSON(),
      }));

    return {
      caseId,
      currency,
      entries: entries.map((entry) => ({
        id: entry.id,
        reference: entry.reference,
        description: entry.description,
        occurredAt: entry.occurredAt,
        lines: entry.lines.map((line) => ({
          accountCode: line.accountCode,
          direction: line.direction,
          amount: line.amount,
          memo: line.memo,
        })),
      })),
      heldForPayees,
      trialBalance: this.storage.ledger.trialBalance(currency).toJSON(),
    };
  }
}
