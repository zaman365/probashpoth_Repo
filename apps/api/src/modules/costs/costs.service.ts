import { Inject, Injectable } from '@nestjs/common';
import { Money, uuidv7 } from '@probash/domain';
import type { CostItem, CostTotals, PartyKind } from '@probash/domain';
import type { CostPlanDto } from '@probash/contracts';
import { STORAGE, type Storage } from '../../storage/ports';
import { ClockService } from '../../core/clock.service';
import type {
  CaseRecord,
  CostItemRecord,
  CostPlanRecord,
  FeeRuleRecord,
} from '../../storage/records';

const WORKER_PAYERS: PartyKind[] = ['worker', 'student'];

/**
 * §24 — the cost transparency engine.
 *
 * Rules that hold here:
 * - every item names payer, payee, legal basis and refundability;
 * - an item whose amount or legal basis is unresolved is listed as *not confirmed*
 *   rather than quoted as a number;
 * - amounts in different currencies are never merged without a rate source (§16).
 */
@Injectable()
export class CostsService {
  constructor(
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
  ) {}

  private async applicableFeeRules(caseRecord: CaseRecord): Promise<FeeRuleRecord[]> {
    const route = await this.storage.routeVersions.require(caseRecord.routeVersionId);
    const all = await this.storage.feeRules.list();
    return all.filter(
      (fee) =>
        route.feeRuleIds.includes(fee.id) &&
        (fee.routeId === '*' || fee.routeId === route.routeId) &&
        Date.parse(fee.effectiveFrom) <= this.clock.now().getTime() &&
        (!fee.effectiveTo || Date.parse(fee.effectiveTo) > this.clock.now().getTime()),
    );
  }

  /** Builds (or rebuilds) the cost plan for a case from the route's fee rules. */
  async generatePlan(caseRecord: CaseRecord): Promise<CostPlanRecord> {
    const feeRules = await this.applicableFeeRules(caseRecord);
    const job = caseRecord.jobId ? await this.storage.jobs.get(caseRecord.jobId) : undefined;

    const items: CostItemRecord[] = [];
    const unresolvedItemIds: string[] = [];
    for (const fee of feeRules) {
      const payee = fee.payeeOrganizationId
        ? await this.storage.organizations.get(fee.payeeOrganizationId)
        : undefined;

      // The employer bears recruitment cost when the verified job says so (§5).
      const payerKind: PartyKind =
        fee.category === 'recruitment_service_fee' && job?.terms.recruitmentFeePaidBy === 'employer'
          ? 'employer'
          : (fee.payerKind as PartyKind);

      const itemId = uuidv7();
      if (fee.unresolved || fee.legallyAllowed === null) unresolvedItemIds.push(itemId);

      items.push({
        id: itemId,
        caseId: caseRecord.id,
        category: fee.category as CostItem['category'],
        label: fee.label,
        amount: fee.amount,
        payer: { kind: payerKind },
        payee: {
          kind: fee.payeeKind as PartyKind,
          id: fee.payeeOrganizationId,
          name: payee?.legalName,
        },
        legallyAllowed: fee.legallyAllowed,
        legalBasisSourceId: fee.legalBasisSourceId,
        refundable: fee.refundable,
        mandatory: fee.mandatory,
        receiptRequired: fee.receiptRequired,
        milestoneId: fee.milestoneKey,
        status: 'estimated',
        sourceIds: fee.sourceIds,
        notes: fee.unresolved
          ? {
              bn: 'এই খরচের পরিমাণ বা আইনি ভিত্তি এখনো নিশ্চিত হয়নি। কেউ এই বাবদ টাকা চাইলে আগে যাচাই করুন।',
              en: 'The amount or legal basis for this cost is not confirmed yet. Verify before paying anyone for it.',
            }
          : undefined,
      });
    }

    for (const item of items) await this.storage.costItems.put(item);

    const existing = await this.storage.costPlans.find((p) => p.caseId === caseRecord.id);
    const plan: CostPlanRecord = {
      id: existing?.id ?? uuidv7(),
      caseId: caseRecord.id,
      currency: 'BDT',
      itemIds: items.map((i) => i.id),
      unresolvedItemIds,
      generatedAt: this.clock.nowIso(),
      sourceIds: [...new Set(items.flatMap((i) => i.sourceIds))],
    };
    await this.storage.costPlans.put(plan);
    return plan;
  }

  private emptyTotals(currency: string): CostTotals {
    const zero = Money.zero(currency).toJSON();
    return {
      workerPaid: zero,
      employerPaid: zero,
      institutionOrScholarshipPaid: zero,
      refundable: zero,
      nonRefundable: zero,
      contingent: zero,
      alreadyPaid: zero,
      remaining: zero,
    };
  }

  async getPlan(caseId: string): Promise<CostPlanDto> {
    const plan = await this.storage.costPlans.find((p) => p.caseId === caseId);
    if (!plan) {
      return {
        id: '',
        caseId,
        primaryCurrency: 'BDT',
        items: [],
        totals: [],
        unresolvedItemIds: [],
        generatedAt: this.clock.nowIso(),
      };
    }

    const items = await this.storage.costItems.list((i) => plan.itemIds.includes(i.id));
    const currencies = [...new Set(items.map((i) => i.amount.currency))];

    const totals = currencies.map((currency) => {
      const scoped = items.filter((i) => i.amount.currency === currency);
      const sum = (predicate: (item: CostItemRecord) => boolean) =>
        scoped
          .filter(predicate)
          .reduce((acc, i) => acc.add(Money.fromJSON(i.amount)), Money.zero(currency));

      const workerPaid = sum((i) => WORKER_PAYERS.includes(i.payer.kind));
      const alreadyPaid = sum((i) => WORKER_PAYERS.includes(i.payer.kind) && i.status === 'paid');
      const contingent = sum((i) => plan.unresolvedItemIds.includes(i.id));

      return {
        currency,
        totals: {
          workerPaid: workerPaid.toJSON(),
          employerPaid: sum((i) => i.payer.kind === 'employer').toJSON(),
          institutionOrScholarshipPaid: sum((i) => i.payer.kind === 'institution').toJSON(),
          refundable: sum((i) => WORKER_PAYERS.includes(i.payer.kind) && i.refundable).toJSON(),
          nonRefundable: sum((i) => WORKER_PAYERS.includes(i.payer.kind) && !i.refundable).toJSON(),
          contingent: contingent.toJSON(),
          alreadyPaid: alreadyPaid.toJSON(),
          remaining: workerPaid.subtract(alreadyPaid).toJSON(),
        },
      };
    });

    return {
      id: plan.id,
      caseId,
      primaryCurrency: plan.currency,
      items: items.map((item) => ({
        id: item.id,
        category: item.category,
        label: item.label,
        amount: item.amount,
        payer: item.payer,
        payee: item.payee,
        legallyAllowed: item.legallyAllowed,
        legalBasisSourceId: item.legalBasisSourceId,
        refundable: item.refundable,
        mandatory: item.mandatory,
        receiptRequired: item.receiptRequired,
        milestoneId: item.milestoneId,
        status: item.status,
        sourceIds: item.sourceIds,
      })),
      totals: totals.sort((a, b) =>
        a.currency === plan.currency
          ? -1
          : b.currency === plan.currency
            ? 1
            : a.currency.localeCompare(b.currency),
      ),
      unresolvedItemIds: plan.unresolvedItemIds,
      generatedAt: plan.generatedAt,
    };
  }

  /**
   * §23/§24 — does a demanded amount exceed what this case may lawfully cost the
   * worker? Used by the scanner to catch "pay me a bit more" fraud.
   */
  async workerPayableTotal(caseId: string, currency = 'BDT'): Promise<Money> {
    const plan = await this.getPlan(caseId);
    const block = plan.totals.find((t) => t.currency === currency);
    return block ? Money.fromJSON(block.totals.workerPaid) : Money.zero(currency);
  }
}
