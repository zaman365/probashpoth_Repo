import { Inject, Injectable } from '@nestjs/common';
import type { Subject } from '@probash/auth';
import { DomainError, NotFoundError, uuidv7 } from '@probash/domain';
import type {
  AddStudyShortlistDto,
  CreateStudyApplicationDto,
  ProgramIntelligenceDto,
  RecordStudyOutcomeDto,
  ReviewStudyStatementDto,
  StudyApplicationDto,
  StudyCalendarItemDto,
  StudyDashboardDto,
  StudyDiscoveryQueryDto,
  StudyDiscoveryResultDto,
  StudyOutcomeDto,
  StudyShortlistDto,
  StudyStatementReviewDto,
  StudyWorkHandoffDto,
  StudyWorkHandoffResultDto,
} from '@probash/contracts';
import { STORAGE, type Storage } from '../../storage/ports';
import { ClockService } from '../../core/clock.service';
import { AuditService } from '../../core/audit.service';
import { EventOutboxService } from '../../core/event-outbox.service';
import { PassportService } from '../passport/passport.service';
import { CatalogueService } from '../catalogue/catalogue.service';
import { CasesService } from '../cases/cases.service';

const UNKNOWN_POST_STUDY = {
  bn: 'এই প্রোগ্রামের জন্য অফিসিয়াল post-study work rule এখনো প্রোগ্রাম-স্তরে যুক্ত হয়নি।',
  en: 'An official programme-level post-study work rule has not yet been attached.',
};

@Injectable()
export class StudyService {
  constructor(
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly events: EventOutboxService,
    private readonly passport: PassportService,
    private readonly catalogue: CatalogueService,
    private readonly cases: CasesService,
  ) {}

  private levelMatches(target: string | undefined, degree: string): boolean | undefined {
    if (!target || target === 'unsure') return undefined;
    const normalized = degree.toLowerCase();
    if (target === 'phd') return normalized.includes('phd') || normalized.includes('doctor');
    if (target === 'master') return normalized.includes('master') || normalized.includes('msc');
    if (target === 'bachelor') return normalized.includes('bachelor') || normalized.includes('bsc');
    return normalized.includes('professional') || normalized.includes('mba');
  }

  async program(userId: string, programId: string): Promise<ProgramIntelligenceDto> {
    const visible = await this.catalogue.listCourses();
    const course = visible.find((entry) => entry.id === programId);
    if (!course) throw new NotFoundError('published_program', programId);
    const institution = await this.storage.institutions.require(course.institutionId);
    const bundle = await this.passport.getBundle(userId);
    const levelFit = this.levelMatches(bundle.study.targetLevel, course.degreeLevel);
    const hasAcademicRecord = bundle.study.education.length > 0;
    const hasTranscriptEvidence = bundle.study.education.some(
      (entry) => entry.transcriptDocumentIds.length > 0,
    );
    const factors: ProgramIntelligenceDto['factors'] = [
      {
        key: 'degree_level',
        label: { bn: 'ডিগ্রি স্তর', en: 'Degree level' },
        state: levelFit === undefined ? 'unknown' : levelFit ? 'meets' : 'missing',
        reason:
          levelFit === undefined
            ? { bn: 'লক্ষ্য ডিগ্রি দেওয়া হয়নি।', en: 'No target degree has been recorded.' }
            : levelFit
              ? { bn: 'আপনার লক্ষ্য স্তরের সঙ্গে মেলে।', en: 'Matches your recorded target level.' }
              : {
                  bn: 'আপনার বর্তমান লক্ষ্য স্তরের সঙ্গে মেলে না।',
                  en: 'Does not match your current target level.',
                },
        sourceIds: [],
      },
      {
        key: 'previous_degree_rule',
        label: { bn: 'পূর্ববর্তী ডিগ্রি', en: 'Previous degree' },
        state: 'unknown',
        reason: hasAcademicRecord
          ? {
              bn: 'একাডেমিক রেকর্ড আছে, কিন্তু এই প্রোগ্রামের প্রকাশিত degree rule যুক্ত হয়নি।',
              en: 'An academic record exists, but no published programme degree rule is attached.',
            }
          : { bn: 'একাডেমিক রেকর্ড যোগ করুন।', en: 'Add an academic record.' },
        sourceIds: course.sourceIds,
      },
      {
        key: 'subject_credit_prerequisites',
        label: { bn: 'বিষয় ও ক্রেডিট শর্ত', en: 'Subject and credit prerequisites' },
        state: 'unknown',
        reason: {
          bn: 'প্রোগ্রাম-নির্দিষ্ট subject/credit rule প্রকাশিত ডেটায় নেই।',
          en: 'Programme-specific subject and credit rules are absent from published data.',
        },
        sourceIds: course.sourceIds,
      },
      {
        key: 'language_rule',
        label: { bn: 'ভাষার শর্ত', en: 'Language requirement' },
        state: 'unknown',
        reason: course.languageRequirement
          ? {
              bn: 'ভাষার সারাংশ আছে, কিন্তু test/section/waiver rule machine-readable নয়।',
              en: 'A language summary exists, but test, section and waiver rules are not machine-readable.',
            }
          : { bn: 'ভাষার শর্ত প্রকাশিত হয়নি।', en: 'No language rule is published.' },
        sourceIds: course.sourceIds,
      },
      {
        key: 'document_evidence',
        label: { bn: 'ট্রান্সক্রিপ্ট প্রমাণ', en: 'Transcript evidence' },
        state: hasTranscriptEvidence ? 'meets' : 'missing',
        reason: hasTranscriptEvidence
          ? { bn: 'ট্রান্সক্রিপ্ট প্রমাণ যুক্ত আছে।', en: 'Transcript evidence is attached.' }
          : { bn: 'ট্রান্সক্রিপ্ট প্রমাণ যুক্ত করুন।', en: 'Attach transcript evidence.' },
        sourceIds: [],
      },
    ];
    const weights: Record<string, number> = {
      degree_level: 20,
      previous_degree_rule: 25,
      subject_credit_prerequisites: 25,
      language_rule: 20,
      document_evidence: 10,
    };
    const fitWeight = factors
      .filter((factor) => factor.state === 'meets')
      .reduce((sum, factor) => sum + weights[factor.key]!, 0);
    const knownWeight = factors
      .filter((factor) => factor.state !== 'unknown')
      .reduce((sum, factor) => sum + weights[factor.key]!, 0);
    const eligibility: ProgramIntelligenceDto['eligibility'] = !hasTranscriptEvidence
      ? 'document_missing'
      : 'unknown_institution_confirmation';
    return {
      id: course.id,
      institutionId: institution.id,
      institutionName: institution.legalName,
      institutionCountryCode: institution.countryCode,
      institutionOfficialDomain: institution.officialDomain,
      institutionRecognizedStatus: institution.recognizedStatus,
      institutionTrust: institution.isSyntheticDemoData
        ? 'synthetic_demo'
        : institution.lastVerifiedAt
          ? 'verified'
          : 'review_required',
      title: course.title,
      degreeLevel: course.degreeLevel,
      subjectIscedF: course.subjectIscedF,
      durationMonths: course.durationMonths,
      tuition: course.tuition,
      applicationFee: course.applicationFee,
      intakes: course.intakes,
      languageRequirement: course.languageRequirement,
      eligibility,
      programFitPercent: fitWeight,
      evidenceCoveragePercent: knownWeight,
      factors,
      scholarship: { status: 'unknown', opportunities: [] },
      deadlines: { status: 'unknown', items: [] },
      fullDegreeCost: { status: 'unknown', amount: null },
      postStudyWork: { status: 'unknown', note: UNKNOWN_POST_STUDY },
      sources: await this.catalogue.sourceSummaries([
        ...course.sourceIds,
        ...institution.sourceIds,
      ]),
      lastVerifiedAt: institution.lastVerifiedAt,
      isSyntheticDemoData: course.isSyntheticDemoData,
    };
  }

  async discover(userId: string, query: StudyDiscoveryQueryDto): Promise<StudyDiscoveryResultDto> {
    const bundle = await this.passport.getBundle(userId);
    const visible = await this.catalogue.listCourses();
    const institutions = await this.catalogue.listInstitutions();
    const countryByInstitution = new Map(institutions.map((item) => [item.id, item.countryCode]));
    let candidates = visible;
    if (query.countryCode) {
      candidates = candidates.filter(
        (course) => countryByInstitution.get(course.institutionId) === query.countryCode,
      );
    }
    if (query.mode === 'degree' && query.targetLevel) {
      candidates = candidates.filter((course) =>
        Boolean(this.levelMatches(query.targetLevel, course.degreeLevel)),
      );
    }
    // No verified scholarship or post-study programme records exist yet. Empty is safer
    // than turning a generic country claim into a programme promise.
    if (query.mode === 'scholarship' || query.mode === 'post_study') candidates = [];

    const programs = await Promise.all(candidates.map((course) => this.program(userId, course.id)));
    programs.sort((left, right) => {
      if (left.eligibility !== right.eligibility) {
        return left.eligibility.localeCompare(right.eligibility);
      }
      if (left.programFitPercent !== right.programFitPercent) {
        return right.programFitPercent - left.programFitPercent;
      }
      return left.title.en.localeCompare(right.title.en);
    });
    await this.events.publish(
      'StudyDiscoveryGenerated',
      { mode: query.mode, resultCount: programs.length },
      { actorRef: userId },
    );
    return {
      mode: query.mode,
      passportVersion: bundle.shared.version,
      generatedAt: this.clock.nowIso(),
      programs,
      note:
        query.mode === 'scholarship' || query.mode === 'post_study'
          ? {
              bn: 'এই filter-এর জন্য যাচাইকৃত program-level data এখনো নেই; তাই কোনো অনুমানভিত্তিক ফল দেখানো হয়নি।',
              en: 'No verified programme-level data exists for this filter, so no inferred result is shown.',
            }
          : {
              bn: 'Program fit ভর্তি বা ভিসার সম্ভাবনা নয়; অজানা নিয়মে প্রতিষ্ঠানের নিশ্চিতকরণ প্রয়োজন।',
              en: 'Programme fit is not an admission or visa probability; unknown rules need institution confirmation.',
            },
    };
  }

  async listShortlist(userId: string): Promise<StudyShortlistDto[]> {
    return (await this.storage.studyShortlists.list((entry) => entry.userId === userId)).sort(
      (left, right) => right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  async addShortlist(userId: string, input: AddStudyShortlistDto): Promise<StudyShortlistDto> {
    await this.program(userId, input.programId);
    const existing = await this.storage.studyShortlists.find(
      (entry) => entry.userId === userId && entry.programId === input.programId,
    );
    const now = this.clock.nowIso();
    const record: StudyShortlistDto = {
      id: existing?.id ?? uuidv7(),
      userId,
      ...input,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.storage.studyShortlists.put(record);
    await this.audit.record({
      actorUserId: userId,
      action: 'study_shortlist.updated',
      resourceType: 'study_shortlist',
      resourceId: record.id,
    });
    return record;
  }

  async removeShortlist(userId: string, id: string): Promise<void> {
    const record = await this.storage.studyShortlists.require(id);
    if (record.userId !== userId) throw new DomainError('FORBIDDEN', 'Shortlist item not owned');
    await this.storage.studyShortlists.remove(id);
  }

  async calendar(userId: string): Promise<StudyCalendarItemDto[]> {
    const shortlist = await this.listShortlist(userId);
    const items: StudyCalendarItemDto[] = [];
    for (const entry of shortlist) {
      const program = await this.program(userId, entry.programId);
      for (const intake of program.intakes) {
        items.push({
          id: `${entry.id}:intake:${intake}`,
          programId: program.id,
          kind: 'intake',
          date: intake,
          status: 'known',
          label: { bn: `${program.title.bn} — intake`, en: `${program.title.en} — intake` },
          sourceIds: program.sources.map((source) => source.id),
        });
      }
      for (const kind of ['application_deadline', 'scholarship_deadline'] as const) {
        items.push({
          id: `${entry.id}:${kind}`,
          programId: program.id,
          kind,
          date: null,
          status: 'unknown',
          label:
            kind === 'application_deadline'
              ? { bn: 'আবেদনের শেষ সময় নিশ্চিত করুন', en: 'Confirm application deadline' }
              : { bn: 'স্কলারশিপের শেষ সময় নিশ্চিত করুন', en: 'Confirm scholarship deadline' },
          sourceIds: [],
        });
      }
    }
    return items.sort((left, right) => (left.date ?? '9999').localeCompare(right.date ?? '9999'));
  }

  async createApplication(
    subject: Subject,
    input: CreateStudyApplicationDto,
  ): Promise<StudyApplicationDto> {
    const program = await this.program(subject.userId, input.programId);
    if (!program.intakes.includes(input.intake)) {
      throw new DomainError('VALIDATION_FAILED', 'The selected intake is not published');
    }
    if (
      program.eligibility === 'unknown_institution_confirmation' &&
      !input.unknownRulesAcknowledged
    ) {
      throw new DomainError(
        'PRECONDITION_FAILED',
        'Acknowledge the institution rules that still require confirmation',
      );
    }
    const routes = await this.catalogue.listRoutes({
      countryCode: program.institutionCountryCode,
      purpose: 'study',
    });
    const route = routes.find((entry) => entry.acceptsApplications);
    if (!route) {
      throw new DomainError(
        'PRECONDITION_FAILED',
        'No published student mobility route is open for this country',
      );
    }
    const mobilityCase = await this.cases.create(subject, {
      routeVersionId: route.id,
      purpose: 'study',
    });
    const now = this.clock.nowIso();
    const application: StudyApplicationDto = {
      id: uuidv7(),
      userId: subject.userId,
      programId: program.id,
      institutionId: program.institutionId,
      caseId: mobilityCase.id,
      intake: input.intake,
      status: 'submitted',
      eligibilityAtSubmission: program.eligibility,
      submittedAt: now,
      updatedAt: now,
    };
    await this.storage.studyApplications.put(application);
    await this.audit.record({
      actorUserId: subject.userId,
      action: 'study_application.submitted',
      resourceType: 'study_application',
      resourceId: application.id,
      caseId: application.caseId,
    });
    await this.events.publish(
      'StudyApplicationSubmitted',
      { eligibility: application.eligibilityAtSubmission },
      {
        actorRef: subject.userId,
        caseRef: application.caseId,
        countryCode: program.institutionCountryCode,
      },
    );
    return application;
  }

  async listApplications(userId: string): Promise<StudyApplicationDto[]> {
    return (await this.storage.studyApplications.list((entry) => entry.userId === userId)).sort(
      (left, right) => right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  async reviewStatement(
    userId: string,
    input: ReviewStudyStatementDto,
  ): Promise<StudyStatementReviewDto> {
    const bundle = await this.passport.getBundle(userId);
    const text = input.text;
    const lower = text.toLowerCase();
    const sections = [
      {
        key: 'academic_background',
        present: /degree|university|college|academic|study|শিক্ষা|বিশ্ববিদ্যালয়/.test(lower),
        guidance: {
          bn: 'প্রমাণযোগ্য একাডেমিক পটভূমি দিন।',
          en: 'Describe evidence-backed academic background.',
        },
      },
      {
        key: 'program_fit',
        present: /program|course|curriculum|module|প্রোগ্রাম|কোর্স/.test(lower),
        guidance: {
          bn: 'নির্দিষ্ট প্রোগ্রামের সঙ্গে আপনার fit ব্যাখ্যা করুন।',
          en: 'Explain fit with the specific programme.',
        },
      },
      {
        key: 'career_plan',
        present: /career|goal|future|ক্যারিয়ার|লক্ষ্য/.test(lower),
        guidance: {
          bn: 'বাস্তবসম্মত ভবিষ্যৎ পরিকল্পনা দিন।',
          en: 'State a realistic future plan.',
        },
      },
    ];
    const unsupportedClaimWarnings = [];
    if (
      /published|publication|journal|প্রকাশনা/.test(lower) &&
      bundle.study.publications.length === 0
    ) {
      unsupportedClaimWarnings.push({
        bn: 'লেখায় publication claim আছে, কিন্তু Passport-এ কোনো publication record নেই।',
        en: 'The statement claims a publication, but the Passport has no publication record.',
      });
    }
    if (/award|scholarship winner|পুরস্কার/.test(lower)) {
      unsupportedClaimWarnings.push({
        bn: 'পুরস্কারের claim-এর জন্য প্রমাণ যোগ করুন; সিস্টেম নিজে তা নিশ্চিত করতে পারে না।',
        en: 'Attach evidence for the award claim; the system cannot validate it automatically.',
      });
    }
    return {
      wordCount: text.trim().split(/\s+/).length,
      sections,
      unsupportedClaimWarnings,
      consistencyWarnings: /guaranteed visa|100% visa|নিশ্চিত ভিসা/.test(lower)
        ? [
            {
              bn: 'ভিসা নিশ্চিত—এমন ভাষা সরান; কেউ অনুমোদন নিশ্চিত করতে পারে না।',
              en: 'Remove guaranteed-visa language; approval cannot be promised.',
            },
          ]
        : [],
      authorshipNotice: {
        bn: 'গঠন ও স্পষ্টতায় সহায়তা নিন, কিন্তু অভিজ্ঞতা, অর্জন বা motivation বানাবেন না।',
        en: 'Use assistance for structure and clarity, but never invent experience, achievements or motivation.',
      },
      rawTextStored: false,
    };
  }

  async recordOutcome(userId: string, input: RecordStudyOutcomeDto): Promise<StudyOutcomeDto> {
    const application = await this.storage.studyApplications.require(input.applicationId);
    if (application.userId !== userId) throw new DomainError('FORBIDDEN', 'Application not owned');
    const outcome: StudyOutcomeDto = {
      id: uuidv7(),
      userId,
      ...input,
      observedAt: this.clock.nowIso(),
      reviewStatus: 'pending_human_review',
    };
    await this.storage.studyOutcomes.put(outcome);
    await this.events.publish(
      'StudyOutcomeRecorded',
      {
        admissionObtained: Boolean(input.admissionObtained),
        enrolled: Boolean(input.enrolled),
        pendingHumanReview: true,
      },
      { actorRef: userId, caseRef: application.caseId },
    );
    return outcome;
  }

  async handoff(userId: string, input: StudyWorkHandoffDto): Promise<StudyWorkHandoffResultDto> {
    const bundle = await this.passport.getBundle(userId);
    const shared = await this.passport.updateShared(userId, {
      preferences: { openness: 'both' },
    });
    const work = await this.passport.updateWork(userId, {
      targetOccupationKeys:
        input.targetOccupationKeys.length > 0
          ? input.targetOccupationKeys
          : bundle.work.targetOccupationKeys,
    });
    const recommendations = await this.passport.match(userId);
    return {
      passportVersion: shared.version,
      workProfileVersion: work.version,
      recommendations: recommendations.work,
      unknownOccupationMapping: work.targetOccupationKeys.length === 0,
      note: {
        bn: 'Academic field থেকে occupation স্বয়ংক্রিয়ভাবে অনুমান করা হয়নি; প্রয়োজন হলে লক্ষ্য occupation নিশ্চিত করুন।',
        en: 'No occupation was inferred automatically from the academic field; confirm target occupations when needed.',
      },
    };
  }

  async dashboard(subject: Subject): Promise<StudyDashboardDto> {
    const bundle = await this.passport.getBundle(subject.userId);
    const shortlist = await this.listShortlist(subject.userId);
    const applications = await this.listApplications(subject.userId);
    const cases = (await this.cases.list(subject)).filter(
      (entry) => entry.ownerUserId === subject.userId && entry.purpose === 'study',
    );
    return {
      passportVersion: bundle.shared.version,
      shortlist,
      applications,
      cases,
      calendar: await this.calendar(subject.userId),
      nextActions: cases.flatMap((entry) => {
        const task = entry.tasks.find((candidate) => candidate.status !== 'done');
        return task
          ? [{ caseId: entry.id, taskId: task.id, label: task.title, status: task.status }]
          : [];
      }),
    };
  }
}
