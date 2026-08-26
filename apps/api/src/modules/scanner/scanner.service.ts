import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { deriveVerdict, Money, uuidv7 } from '@probash/domain';
import type { LocalizedText, RiskSignal, RiskSignalKind } from '@probash/domain';
import type { Env } from '@probash/config';
import type { ScanOfferDto, ScanResultDto } from '@probash/contracts';
import { ENV } from '../../core/tokens';
import { STORAGE, type Storage } from '../../storage/ports';
import { ClockService } from '../../core/clock.service';
import { AuditService } from '../../core/audit.service';
import { EventOutboxService } from '../../core/event-outbox.service';
import { extractFields, namesRoughlyMatch } from './extraction';
import type { JobRecord } from '../../storage/records';

interface Check {
  key: string;
  label: LocalizedText;
  performed: boolean;
  passed: boolean | null;
  detail?: LocalizedText;
}

/**
 * §23 — the offer / visa / document scanner.
 *
 * Every conclusion here comes from a deterministic comparison against verified
 * records. The AI layer may explain the result; it can never upgrade the verdict,
 * add a check, or mark something verified (§41, §76.7).
 */
@Injectable()
export class ScannerService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly events: EventOutboxService,
  ) {}

  private signal(
    kind: RiskSignalKind,
    level: RiskSignal['level'],
    title: LocalizedText,
    explanation: LocalizedText,
    advice: LocalizedText,
    evidence: Record<string, unknown> = {},
    sourceIds: string[] = [],
  ): RiskSignal {
    return {
      id: uuidv7(),
      kind,
      level,
      title,
      explanation,
      advice,
      evidence,
      raisedAt: this.clock.nowIso(),
      sourceIds,
    };
  }

  async scan(dto: ScanOfferDto, userId?: string): Promise<ScanResultDto> {
    const text = dto.messageText ?? '';
    const extracted = extractFields(text);
    const claimed = dto.claimed ?? {};
    const checks: Check[] = [];
    const signals: RiskSignal[] = [];

    // ---- 1. Does the verification id exist at all? -------------------------
    const candidateId = dto.publicJobId?.trim().toUpperCase() ?? extracted.jobPublicIds[0];
    let job: JobRecord | undefined;
    if (candidateId) {
      job = await this.storage.jobs.find((j) => j.publicId === candidateId);
      checks.push({
        key: 'job_id_exists',
        label: {
          bn: 'যাচাই নম্বর আমাদের রেকর্ডে আছে কি না',
          en: 'Verification ID exists in our records',
        },
        performed: true,
        passed: Boolean(job),
      });
      if (!job) {
        signals.push(
          this.signal(
            'job_id_not_found',
            'critical',
            { bn: 'এই যাচাই নম্বর পাওয়া যায়নি', en: 'This verification ID was not found' },
            {
              bn: `“${candidateId}” আমাদের যাচাইকৃত রেকর্ডে নেই।`,
              en: `“${candidateId}” is not in our verified records.`,
            },
            {
              bn: 'এই নম্বরের ভিত্তিতে কাউকে টাকা দেবেন না। সাহায্য নিন।',
              en: 'Do not pay anyone on the basis of this ID. Get help.',
            },
            { publicId: candidateId },
          ),
        );
      }
    } else {
      checks.push({
        key: 'job_id_exists',
        label: {
          bn: 'যাচাই নম্বর আমাদের রেকর্ডে আছে কি না',
          en: 'Verification ID exists in our records',
        },
        performed: false,
        passed: null,
        detail: {
          bn: 'কোনো যাচাই নম্বর দেওয়া হয়নি, তাই চাকরিটি মেলানো যায়নি।',
          en: 'No verification ID was provided, so the job could not be matched.',
        },
      });
    }

    // ---- 2. Employer, role, salary and cost against the verified record ----
    if (job) {
      const employer = await this.storage.organizations.get(job.employerOrganizationId);
      const agency = job.recruiterOrganizationId
        ? await this.storage.organizations.get(job.recruiterOrganizationId)
        : undefined;
      const occupation = await this.storage.occupations.get(job.occupationId);

      if (claimed.employerName && employer) {
        const matches =
          namesRoughlyMatch(claimed.employerName, employer.legalName.en) ||
          namesRoughlyMatch(claimed.employerName, employer.legalName.bn);
        checks.push({
          key: 'employer_match',
          label: { bn: 'নিয়োগকর্তার নাম মিলছে কি না', en: 'Employer name matches' },
          performed: true,
          passed: matches,
        });
        if (!matches) {
          signals.push(
            this.signal(
              'employer_mismatch',
              'high',
              { bn: 'নিয়োগকর্তার নাম মিলছে না', en: 'The employer name does not match' },
              {
                bn: `রেকর্ডে আছে “${employer.legalName.bn}”, কিন্তু বলা হচ্ছে “${claimed.employerName}”।`,
                en: `Our record says “${employer.legalName.en}”, but the offer says “${claimed.employerName}”.`,
              },
              {
                bn: 'সই বা টাকা দেওয়ার আগে যাচাই করুন।',
                en: 'Verify before signing or paying.',
              },
              { recorded: employer.legalName.en, claimed: claimed.employerName },
            ),
          );
        }
      }

      if (claimed.monthlySalary) {
        const claimedSalary = Money.fromJSON(claimed.monthlySalary);
        const recorded = Money.fromJSON(job.terms.monthlySalary);
        const sameCurrency = claimedSalary.currency === recorded.currency;
        const matches = sameCurrency && claimedSalary.equals(recorded);
        checks.push({
          key: 'salary_match',
          label: { bn: 'বেতন মিলছে কি না', en: 'Salary matches the verified record' },
          performed: true,
          passed: matches,
        });
        if (!matches) {
          signals.push(
            this.signal(
              'salary_mismatch',
              'high',
              { bn: 'বেতনে মিল নেই', en: 'The salary does not match' },
              {
                bn: `যাচাইকৃত বেতন ${recorded.toDecimalString()} ${recorded.currency}, কিন্তু বলা হচ্ছে ${claimedSalary.toDecimalString()} ${claimedSalary.currency}।`,
                en: `The verified salary is ${recorded.toDecimalString()} ${recorded.currency}, but the offer says ${claimedSalary.toDecimalString()} ${claimedSalary.currency}.`,
              },
              {
                bn: 'বেশি বেতনের প্রতিশ্রুতি প্রতারণার সাধারণ কৌশল। যাচাই করুন।',
                en: 'A promise of higher pay is a common fraud tactic. Verify it.',
              },
              { recorded: recorded.toDecimalString(), claimed: claimedSalary.toDecimalString() },
            ),
          );
        }
      }

      if (claimed.occupationKey && occupation) {
        const matches = claimed.occupationKey === occupation.key;
        checks.push({
          key: 'role_match',
          label: { bn: 'কাজের ধরন মিলছে কি না', en: 'Job role matches' },
          performed: true,
          passed: matches,
        });
        if (!matches) {
          signals.push(
            this.signal(
              'role_mismatch',
              'high',
              { bn: 'কাজের ধরন মিলছে না', en: 'The job role does not match' },
              {
                bn: `রেকর্ডে কাজ “${occupation.title.bn}”, কিন্তু বলা হচ্ছে “${claimed.occupationKey}”।`,
                en: `Our record says “${occupation.title.en}”, but the offer says “${claimed.occupationKey}”.`,
              },
              {
                bn: 'চুক্তিতে কাজের নাম দেখে নিন।',
                en: 'Check the job title written in the contract.',
              },
            ),
          );
        }
      }

      if (claimed.totalCostToWorker) {
        const demanded = Money.fromJSON(claimed.totalCostToWorker);
        const allowed = Money.fromJSON(job.allowedWorkerCost);
        const comparable = demanded.currency === allowed.currency;
        const withinLimit = comparable ? demanded.compare(allowed) <= 0 : false;
        checks.push({
          key: 'cost_within_allowed',
          label: {
            bn: 'চাওয়া টাকা বৈধ সীমার মধ্যে কি না',
            en: 'Requested amount is within the lawful limit',
          },
          performed: comparable,
          passed: comparable ? withinLimit : null,
          detail: comparable
            ? undefined
            : {
                bn: 'ভিন্ন মুদ্রার কারণে তুলনা করা যায়নি।',
                en: 'Could not compare because the currencies differ.',
              },
        });
        if (comparable && !withinLimit) {
          signals.push(
            this.signal(
              'cost_above_declared',
              'critical',
              {
                bn: 'বৈধ সীমার চেয়ে বেশি টাকা চাওয়া হয়েছে',
                en: 'More than the lawful amount is being demanded',
              },
              {
                bn: `এই চাকরিতে আপনার সর্বোচ্চ বৈধ খরচ ${allowed.toDecimalString()} ${allowed.currency}, কিন্তু চাওয়া হচ্ছে ${demanded.toDecimalString()} ${demanded.currency}।`,
                en: `The maximum lawful cost for this job is ${allowed.toDecimalString()} ${allowed.currency}, but ${demanded.toDecimalString()} ${demanded.currency} is being demanded.`,
              },
              {
                bn: 'অতিরিক্ত টাকা দেবেন না এবং অভিযোগ করুন।',
                en: 'Do not pay the excess, and report it.',
              },
              { allowed: allowed.toDecimalString(), demanded: demanded.toDecimalString() },
            ),
          );
        }
      }

      // ---- 3. Agency licence --------------------------------------------
      if (agency) {
        const licence = agency.licences[0];
        const active = licence?.status === 'active';
        checks.push({
          key: 'agency_licence_active',
          label: { bn: 'এজেন্সির লাইসেন্স সক্রিয় কি না', en: 'Agency licence is active' },
          performed: Boolean(licence),
          passed: licence ? active : null,
        });
        if (licence && !active) {
          signals.push(
            this.signal(
              licence.status === 'expired' ? 'agency_licence_expired' : 'agency_not_licensed',
              'critical',
              { bn: 'এজেন্সির লাইসেন্স সক্রিয় নয়', en: 'The agency licence is not active' },
              {
                bn: `লাইসেন্স ${licence.number}-এর অবস্থা: ${licence.status}।`,
                en: `Licence ${licence.number} status: ${licence.status}.`,
              },
              {
                bn: 'লাইসেন্স ছাড়া কোনো এজেন্সিকে নিয়োগের টাকা দেবেন না।',
                en: 'Never pay recruitment money to an agency without an active licence.',
              },
              { licenceNumber: licence.number, status: licence.status },
              licence.sourceId ? [licence.sourceId] : [],
            ),
          );
        }
      }

      // ---- 4. Suspension --------------------------------------------------
      if (job.publicationStatus === 'suspended') {
        signals.push(
          this.signal(
            'job_id_not_found',
            'critical',
            { bn: 'এই চাকরিটি স্থগিত', en: 'This job is suspended' },
            {
              bn: 'এই চাকরির বিজ্ঞপ্তি স্থগিত করা হয়েছে।',
              en: 'This job posting has been suspended.',
            },
            { bn: 'কোনো টাকা দেবেন না।', en: 'Do not pay anything.' },
          ),
        );
      }
    }

    // ---- 5. Payment destination ------------------------------------------
    const destination = claimed.paymentDestination ?? '';
    const walletFromText = extracted.mobileWalletNumbers[0];
    const personalDestination =
      walletFromText ??
      (/(bkash|বিকাশ|nagad|নগদ|personal|পার্সোনাল)/i.test(destination) ? destination : undefined);
    checks.push({
      key: 'payment_destination_authorized',
      label: { bn: 'টাকা পাঠানোর জায়গা অনুমোদিত কি না', en: 'Payment destination is authorised' },
      performed: Boolean(personalDestination || destination),
      passed: personalDestination ? false : destination ? null : null,
      detail: destination
        ? undefined
        : {
            bn: 'পেমেন্টের কোনো তথ্য পাওয়া যায়নি।',
            en: 'No payment destination was found to check.',
          },
    });
    if (personalDestination) {
      signals.push(
        this.signal(
          'payment_to_personal_account',
          'critical',
          {
            bn: 'ব্যক্তিগত নম্বরে টাকা চাওয়া হয়েছে',
            en: 'Payment to a personal account was requested',
          },
          {
            bn: 'ব্যক্তিগত বিকাশ/নগদ বা ব্যক্তিগত ব্যাংক অ্যাকাউন্টে নিয়োগের টাকা পাঠানো নিরাপদ নয়।',
            en: 'Sending recruitment money to a personal mobile wallet or bank account is not safe.',
          },
          {
            bn: 'এই প্রক্রিয়ার বাইরে টাকা দেবেন না। রসিদ ছাড়া কোনো লেনদেন নয়।',
            en: 'Do not pay outside this process. No transaction without a receipt.',
          },
          { destination: personalDestination },
        ),
      );
    }

    // ---- 6. Language red flags -------------------------------------------
    checks.push({
      key: 'guarantee_language',
      label: { bn: '“ভিসা নিশ্চিত” ধরনের দাবি আছে কি না', en: 'Contains a visa-guarantee claim' },
      performed: text.length > 0,
      passed: text.length > 0 ? extracted.guaranteePhrases.length === 0 : null,
    });
    if (extracted.guaranteePhrases.length > 0) {
      signals.push(
        this.signal(
          'guarantee_language',
          'high',
          { bn: 'ভিসার নিশ্চয়তা দেওয়া হয়েছে', en: 'A visa guarantee is being promised' },
          {
            bn: 'কেউ ভিসার নিশ্চয়তা দিতে পারে না — সিদ্ধান্ত নেয় সংশ্লিষ্ট দেশের কর্তৃপক্ষ।',
            en: 'Nobody can guarantee a visa — the decision belongs to the competent authority.',
          },
          { bn: 'এমন প্রতিশ্রুতিতে টাকা দেবেন না।', en: 'Do not pay against such a promise.' },
          { phrases: extracted.guaranteePhrases },
        ),
      );
    }

    if (extracted.cashPhrases.length > 0) {
      signals.push(
        this.signal(
          'cash_payment_requested',
          'high',
          { bn: 'নগদ টাকা চাওয়া হয়েছে', en: 'Cash payment is being requested' },
          {
            bn: 'নগদ লেনদেনের কোনো প্রমাণ থাকে না, তাই টাকা ফেরত পাওয়া কঠিন হয়।',
            en: 'A cash transaction leaves no evidence, which makes recovering money very hard.',
          },
          {
            bn: 'রসিদসহ নির্ধারিত পথে টাকা দিন।',
            en: 'Pay only through the defined process, with a receipt.',
          },
          { phrases: extracted.cashPhrases },
        ),
      );
    }

    // ---- 7. Visa class consistency ---------------------------------------
    const visaHint = claimed.visaClass ?? extracted.visaClassHints[0];
    if (visaHint) {
      const inconsistent = visaHint === 'visit' || visaHint === 'free_visa';
      checks.push({
        key: 'visa_class_consistent',
        label: {
          bn: 'ভিসার ধরন কাজের সাথে মেলে কি না',
          en: 'Visa class is consistent with working',
        },
        performed: true,
        passed: !inconsistent,
      });
      if (inconsistent) {
        signals.push(
          this.signal(
            'visa_class_inconsistent',
            'critical',
            { bn: 'ভিসার ধরন কাজের জন্য উপযুক্ত নয়', en: 'This visa class is not for working' },
            {
              bn: 'ভিজিট বা “ফ্রি ভিসা”-য় গিয়ে কাজ করা যায় না এবং এতে বড় ঝুঁকি আছে।',
              en: 'You cannot work on a visit visa or a so-called “free visa”, and doing so carries serious risk.',
            },
            {
              bn: 'কাজের জন্য সঠিক ওয়ার্ক ভিসা/পারমিট ছাড়া যাবেন না।',
              en: 'Do not travel for work without the correct work visa or permit.',
            },
            { visaClass: visaHint },
          ),
        );
      }
    }

    // ---- 8. Institution domain (study offers) -----------------------------
    if (claimed.institutionDomain) {
      const domain = claimed.institutionDomain.toLowerCase().replace(/^www\./, '');
      const institution = await this.storage.institutions.find(
        (i) => i.officialDomain.toLowerCase() === domain,
      );
      checks.push({
        key: 'institution_domain_match',
        label: {
          bn: 'প্রতিষ্ঠানের অফিসিয়াল ঠিকানা মিলছে কি না',
          en: "Institution's official domain matches",
        },
        performed: true,
        passed: Boolean(institution),
      });
      if (!institution) {
        signals.push(
          this.signal(
            'institution_domain_mismatch',
            'high',
            { bn: 'প্রতিষ্ঠানের ঠিকানা মিলছে না', en: "The institution's domain does not match" },
            {
              bn: `“${domain}” আমাদের যাচাইকৃত প্রতিষ্ঠানের তালিকায় নেই।`,
              en: `“${domain}” is not in our verified institution list.`,
            },
            {
              bn: 'প্রতিষ্ঠানের অফিসিয়াল ওয়েবসাইট থেকে সরাসরি যাচাই করুন। ব্যক্তিগত অ্যাকাউন্টে টিউশন পাঠাবেন না।',
              en: "Verify directly on the institution's official website. Never send tuition to a personal account.",
            },
            { domain },
          ),
        );
      }
    }

    // ---- 9. Document authenticity — deliberately NOT claimed --------------
    if (dto.documentId) {
      checks.push({
        key: 'document_authenticity',
        label: { bn: 'কাগজটির সত্যতা যাচাই', en: 'Document authenticity verification' },
        performed: false,
        passed: null,
        detail: {
          bn: 'আপলোড করা কাগজ দেখে সত্যতা নিশ্চিত করা যায় না। শুধু লেখা তথ্য মিলিয়ে দেখা হয়েছে।',
          en: 'Authenticity cannot be established from an uploaded file. Only the stated details were compared.',
        },
      });
      signals.push(
        this.signal(
          'offer_document_unverifiable',
          'medium',
          { bn: 'কাগজের সত্যতা যাচাই করা যায়নি', en: 'The document could not be authenticated' },
          {
            bn: 'লোগো বা ফরম্যাট দেখে কোনো কাগজকে “যাচাইকৃত” বলা হয় না।',
            en: 'A document is never called “verified” because of a logo or a layout.',
          },
          {
            bn: 'যে প্রতিষ্ঠান কাগজটি দিয়েছে, তাদের অফিসিয়াল ঠিকানায় সরাসরি যোগাযোগ করে নিশ্চিত হোন।',
            en: 'Confirm directly with the issuing organisation through its official channel.',
          },
        ),
      );
    }

    // A verdict of VERIFIED requires that every required check actually ran.
    const requiredKeys = ['job_id_exists', 'payment_destination_authorized'];
    const checkedEverythingRequired =
      Boolean(job) &&
      requiredKeys.every((key) => checks.find((c) => c.key === key)?.performed) &&
      checks.filter((c) => c.performed).every((c) => c.passed !== null);

    const verdict = deriveVerdict(signals, { checkedEverythingRequired });
    const humanReviewRequested =
      verdict === 'UNKNOWN_HUMAN_CHECK_REQUIRED' || verdict === 'HIGH_RISK';

    const result: ScanResultDto = {
      verdict,
      checksPerformed: checks,
      signals: signals.map((s) => ({
        id: s.id,
        kind: s.kind,
        level: s.level,
        title: s.title,
        explanation: s.explanation,
        advice: s.advice,
        evidence: s.evidence,
        sourceIds: s.sourceIds,
      })),
      matchedJobPublicId: job?.publicId,
      humanReviewRequested,
      scannedAt: this.clock.nowIso(),
      explanation: this.explain(verdict, checks, signals),
    };

    await this.storage.scans.put({
      id: uuidv7(),
      userId,
      verdict,
      signals,
      checksPerformed: checks,
      matchedJobPublicId: job?.publicId,
      humanReviewRequested,
      scannedAt: result.scannedAt,
      // The message itself is not stored; only a digest, so a scan cannot become a
      // second copy of someone's private conversation (§51).
      inputDigest: createHash('sha256')
        .update(JSON.stringify({ text, claimed, publicJobId: dto.publicJobId }))
        .digest('hex'),
    });

    await this.audit.record({
      actorUserId: userId,
      action: 'offer.scanned',
      resourceType: 'offer_scan',
      metadata: { verdict, signalCount: String(signals.length) },
    });
    await this.events.publish(
      'OfferScanned',
      { verdict, signalCount: signals.length, matched: Boolean(job) },
      { actorRef: userId },
    );
    for (const signal of signals) {
      await this.events.publish(
        'RiskSignalRaised',
        { kind: signal.kind, level: signal.level },
        {
          actorRef: userId,
        },
      );
    }

    return result;
  }

  /** The explanation is assembled from the checks and signals — never authored freely. */
  private explain(
    verdict: ScanResultDto['verdict'],
    checks: Check[],
    signals: RiskSignal[],
  ): LocalizedText {
    const ran = checks.filter((c) => c.performed).length;
    const notRun = checks.filter((c) => !c.performed).length;
    const head: Record<ScanResultDto['verdict'], LocalizedText> = {
      VERIFIED: {
        bn: 'যা যা মেলানো দরকার ছিল, সব মিলেছে।',
        en: 'Everything that needed to match, matched.',
      },
      PARTIALLY_VERIFIED: {
        bn: 'কিছু তথ্য মিলেছে, তবে সতর্ক থাকার মতো বিষয় আছে।',
        en: 'Some details matched, but there are things to be careful about.',
      },
      MISMATCH: {
        bn: 'যাচাইকৃত রেকর্ডের সাথে তথ্য মিলছে না।',
        en: 'The details do not match the verified record.',
      },
      HIGH_RISK: {
        bn: 'এখানে গুরুতর ঝুঁকির চিহ্ন পাওয়া গেছে। টাকা দেবেন না।',
        en: 'Serious risk indicators were found here. Do not pay.',
      },
      UNKNOWN_HUMAN_CHECK_REQUIRED: {
        bn: 'যথেষ্ট তথ্য না থাকায় নিশ্চিত হওয়া যায়নি। একজন মানুষ এটি দেখবেন।',
        en: 'There was not enough information to be sure. A person will review this.',
      },
    };
    const counts = {
      bn: ` ${ran}টি বিষয় মিলিয়ে দেখা হয়েছে, ${notRun}টি মেলানো যায়নি।`,
      en: ` ${ran} check(s) were run; ${notRun} could not be run.`,
    };
    const top = signals[0];
    return {
      bn: `${head[verdict].bn}${counts.bn}${top ? ` প্রধান বিষয়: ${top.title.bn}।` : ''}`,
      en: `${head[verdict].en}${counts.en}${top ? ` Main issue: ${top.title.en}.` : ''}`,
    };
  }
}
