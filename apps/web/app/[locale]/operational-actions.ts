'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { MigrationPassport } from '@probash/domain';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import {
  addDelegation,
  addJourneyRecord,
  addLedgerEntry,
  completeJourneyTask,
  completeOnboarding,
  createJourney,
  createPartnerSubmission,
  createOutcomeReport,
  createSupportTicket,
  createVerificationRequest,
  deleteDocument,
  markAlertRead,
  revokeDelegation,
  savePassport,
  storeDocument,
  setJourneyRecordStatus,
  updateProfileDirection,
  type JourneyPath,
  type JourneyStage,
} from '@/db/operations';
import { localeSegment, parseLocaleParam } from '@/lib/i18n';

export interface OperationalActionState {
  status?: 'success' | 'error';
  message?: string;
  savedAt?: string;
}

function segment(formData: FormData): 'bn' | 'en' {
  return localeSegment(parseLocaleParam(String(formData.get('locale') ?? 'bn')));
}

function textField(formData: FormData, name: string, max = 500): string {
  return String(formData.get(name) ?? '')
    .trim()
    .slice(0, max);
}

const RECORD_TYPES = new Set([
  'job_application',
  'interview',
  'offer',
  'contract',
  'training',
  'permit',
  'departure',
  'arrival',
  'work_outcome',
  'shortlist',
  'test',
  'materials',
  'scholarship',
  'funding',
  'study_application',
  'admission',
  'student_visa',
  'housing',
  'study_outcome',
  'work_handoff',
]);

const RECORD_STATUSES = new Set([
  'planned',
  'preparing',
  'submitted',
  'in_review',
  'verified',
  'completed',
  'blocked',
  'rejected',
  'withdrawn',
]);

const JOURNEY_STAGES = new Set<JourneyStage>(['exploring', 'preparing', 'applying', 'progressing']);

function journeyDirection(formData: FormData): {
  path: JourneyPath;
  stage: JourneyStage;
  goalTitle?: string;
} {
  const pathValue = textField(formData, 'path');
  if (pathValue !== 'work' && pathValue !== 'study') {
    throw new Error('Choose one primary journey.');
  }
  const stageValue = textField(formData, 'stage') as JourneyStage;
  if (!JOURNEY_STAGES.has(stageValue)) throw new Error('Choose your current stage.');
  return {
    path: pathValue,
    stage: stageValue,
    goalTitle: textField(formData, 'goalTitle', 180) || undefined,
  };
}

export async function completeOnboardingAction(formData: FormData): Promise<void> {
  const seg = segment(formData);
  const user = await requireChatGPTUser(`/${seg}/onboarding`);
  if (formData.get('consent') !== 'yes') throw new Error('Consent is required.');
  await completeOnboarding(user, seg === 'bn' ? 'bn-BD' : 'en', journeyDirection(formData));
  revalidatePath(`/${seg}`);
  revalidatePath(`/${seg}/dashboard`);
  revalidatePath(`/${seg}/account`);
  redirect(`/${seg}/dashboard?welcome=1`);
}

export async function updateProfileDirectionAction(formData: FormData): Promise<void> {
  const seg = segment(formData);
  const user = await requireChatGPTUser(`/${seg}/account`);
  await updateProfileDirection(user.userId, journeyDirection(formData));
  revalidatePath(`/${seg}`);
  revalidatePath(`/${seg}/dashboard`);
  revalidatePath(`/${seg}/account`);
  redirect(`/${seg}/account?saved=1`);
}

export async function savePassportAction(
  _previous: OperationalActionState,
  formData: FormData,
): Promise<OperationalActionState> {
  const seg = segment(formData);
  try {
    const user = await requireChatGPTUser(`/${seg}/passport`);
    const passport = JSON.parse(textField(formData, 'passportJson', 64_000)) as MigrationPassport;
    await savePassport(user, seg === 'bn' ? 'bn-BD' : 'en', passport);
    revalidatePath(`/${seg}/dashboard`);
    return {
      status: 'success',
      message:
        seg === 'bn'
          ? 'আপনার পাসপোর্ট নিরাপদে সংরক্ষিত হয়েছে।'
          : 'Your Passport has been saved securely.',
      savedAt: new Date().toISOString(),
    };
  } catch {
    return {
      status: 'error',
      message:
        seg === 'bn'
          ? 'এখন সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।'
          : 'Could not save yet. Please try again.',
    };
  }
}

export async function createOperationalJourneyAction(formData: FormData): Promise<void> {
  const seg = segment(formData);
  const user = await requireChatGPTUser(`/${seg}/dashboard`);
  const path = textField(formData, 'path') === 'study' ? 'study' : 'work';
  const id = await createJourney(user.userId, {
    path,
    targetType: textField(formData, 'targetType') || (path === 'study' ? 'programme' : 'route'),
    targetId: textField(formData, 'targetId') || undefined,
    title:
      textField(formData, 'title', 240) ||
      (path === 'study' ? 'Higher Study journey' : 'Work Abroad journey'),
    destinationCountry: textField(formData, 'destinationCountry', 2).toUpperCase() || undefined,
  });
  redirect(`/${seg}/cases/${id}`);
}

export async function completeOperationalTaskAction(formData: FormData): Promise<void> {
  const seg = segment(formData);
  const journeyId = textField(formData, 'journeyId');
  const user = await requireChatGPTUser(`/${seg}/cases/${journeyId}`);
  await completeJourneyTask(user.userId, journeyId, textField(formData, 'taskId'));
  revalidatePath(`/${seg}/cases/${journeyId}`);
  revalidatePath(`/${seg}/dashboard`);
}

export async function addJourneyRecordAction(
  _previous: OperationalActionState,
  formData: FormData,
): Promise<OperationalActionState> {
  const seg = segment(formData);
  const journeyId = textField(formData, 'journeyId');
  try {
    const user = await requireChatGPTUser(`/${seg}/cases/${journeyId}`);
    const recordType = textField(formData, 'recordType', 60);
    const status = textField(formData, 'status', 40);
    if (!RECORD_TYPES.has(recordType) || !RECORD_STATUSES.has(status)) {
      throw new Error('Unsupported workflow record.');
    }
    const dueAtInput = textField(formData, 'dueAt', 20);
    const dueAt = /^\d{4}-\d{2}-\d{2}$/.test(dueAtInput) ? dueAtInput : undefined;
    const amountInput = textField(formData, 'amount');
    const amount = Number(amountInput);
    const amountMinor =
      amountInput && Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : undefined;
    await addJourneyRecord(user.userId, {
      journeyId,
      recordType,
      status,
      title: textField(formData, 'title', 240),
      notes: textField(formData, 'notes', 4000) || undefined,
      dueAt,
      amountMinor,
      currency: amountMinor === undefined ? undefined : textField(formData, 'currency', 3),
    });
    revalidatePath(`/${seg}/cases/${journeyId}`);
    revalidatePath(`/${seg}/dashboard`);
    revalidatePath(`/${seg}/alerts`);
    return {
      status: 'success',
      message:
        seg === 'bn' ? 'ওয়ার্কবেঞ্চ রেকর্ড সংরক্ষিত হয়েছে।' : 'The workbench record was saved.',
    };
  } catch {
    return {
      status: 'error',
      message: seg === 'bn' ? 'রেকর্ডটি সংরক্ষণ করা যায়নি।' : 'The record could not be saved.',
    };
  }
}

export async function setJourneyRecordStatusAction(formData: FormData): Promise<void> {
  const seg = segment(formData);
  const journeyId = textField(formData, 'journeyId');
  const status = textField(formData, 'status', 40);
  if (!RECORD_STATUSES.has(status)) throw new Error('Unsupported status.');
  const user = await requireChatGPTUser(`/${seg}/cases/${journeyId}`);
  await setJourneyRecordStatus(user.userId, journeyId, textField(formData, 'recordId'), status);
  revalidatePath(`/${seg}/cases/${journeyId}`);
  revalidatePath(`/${seg}/dashboard`);
}

export async function markAlertReadAction(formData: FormData): Promise<void> {
  const seg = segment(formData);
  const user = await requireChatGPTUser(`/${seg}/alerts`);
  await markAlertRead(user.userId, textField(formData, 'alertId'));
  revalidatePath(`/${seg}/alerts`);
  revalidatePath(`/${seg}/dashboard`);
}

export async function addLedgerEntryAction(
  _previous: OperationalActionState,
  formData: FormData,
): Promise<OperationalActionState> {
  const seg = segment(formData);
  try {
    const user = await requireChatGPTUser(`/${seg}/money`);
    const amount = Number(textField(formData, 'amount'));
    await addLedgerEntry(user.userId, {
      journeyId: textField(formData, 'journeyId') || undefined,
      label: textField(formData, 'label', 180),
      amountMinor: Math.round(amount * 100),
      currency: textField(formData, 'currency', 3).toUpperCase() || 'BDT',
      payee: textField(formData, 'payee', 180) || undefined,
      legalBasis: textField(formData, 'legalBasis', 500) || undefined,
    });
    revalidatePath(`/${seg}/money`);
    revalidatePath(`/${seg}/dashboard`);
    return {
      status: 'success',
      message: seg === 'bn' ? 'খরচটি লেজারে যোগ হয়েছে।' : 'The cost was added to your ledger.',
    };
  } catch {
    return {
      status: 'error',
      message: seg === 'bn' ? 'খরচটি যোগ করা যায়নি।' : 'The cost could not be added.',
    };
  }
}

export async function addDelegationAction(
  _previous: OperationalActionState,
  formData: FormData,
): Promise<OperationalActionState> {
  const seg = segment(formData);
  try {
    const user = await requireChatGPTUser(`/${seg}/family`);
    await addDelegation(user.userId, {
      journeyId: textField(formData, 'journeyId') || undefined,
      contact: textField(formData, 'contact', 180),
      relationship: textField(formData, 'relationship', 40),
      permissions: formData.getAll('permissions').map(String).slice(0, 8),
    });
    revalidatePath(`/${seg}/family`);
    return {
      status: 'success',
      message: seg === 'bn' ? 'পরিবারের অনুমতি সংরক্ষিত হয়েছে।' : 'Family access was saved.',
    };
  } catch {
    return {
      status: 'error',
      message: seg === 'bn' ? 'অনুমতি সংরক্ষণ করা যায়নি।' : 'Access could not be saved.',
    };
  }
}

export async function uploadDocumentAction(
  _previous: OperationalActionState,
  formData: FormData,
): Promise<OperationalActionState> {
  const seg = segment(formData);
  try {
    const user = await requireChatGPTUser(`/${seg}/documents`);
    const file = formData.get('file');
    if (!(file instanceof File)) throw new Error('Missing file.');
    await storeDocument(user.userId, {
      file,
      category: textField(formData, 'category', 60),
      label: textField(formData, 'label', 180) || file.name,
      journeyId: textField(formData, 'journeyId') || undefined,
    });
    revalidatePath(`/${seg}/documents`);
    revalidatePath(`/${seg}/dashboard`);
    return {
      status: 'success',
      message:
        seg === 'bn'
          ? 'নথি নিরাপদ ভল্টে যোগ হয়েছে; যাচাই এখনও বাকি।'
          : 'Document added to the secure vault; verification is still pending.',
    };
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : seg === 'bn'
            ? 'নথি যোগ করা যায়নি।'
            : 'The document could not be uploaded.',
    };
  }
}

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const seg = segment(formData);
  const user = await requireChatGPTUser(`/${seg}/documents`);
  await deleteDocument(user.userId, textField(formData, 'documentId'));
  revalidatePath(`/${seg}/documents`);
  revalidatePath(`/${seg}/dashboard`);
}

export async function revokeDelegationAction(formData: FormData): Promise<void> {
  const seg = segment(formData);
  const user = await requireChatGPTUser(`/${seg}/family`);
  await revokeDelegation(user.userId, textField(formData, 'delegationId'));
  revalidatePath(`/${seg}/family`);
  revalidatePath(`/${seg}/dashboard`);
}

export async function submitVerificationAction(
  _previous: OperationalActionState,
  formData: FormData,
): Promise<OperationalActionState> {
  const seg = segment(formData);
  try {
    const user = await requireChatGPTUser(`/${seg}/verify`);
    await createVerificationRequest(user.userId, {
      kind: textField(formData, 'kind', 60),
      subject: textField(formData, 'subject', 500),
      evidence: textField(formData, 'evidence', 4000) || undefined,
    });
    revalidatePath(`/${seg}/dashboard`);
    return {
      status: 'success',
      message:
        seg === 'bn'
          ? 'মানব যাচাইয়ের অনুরোধ গ্রহণ করা হয়েছে।'
          : 'Your human-review request was received.',
    };
  } catch {
    return {
      status: 'error',
      message: seg === 'bn' ? 'অনুরোধ পাঠানো যায়নি।' : 'The request could not be submitted.',
    };
  }
}

export async function submitSupportTicketAction(
  _previous: OperationalActionState,
  formData: FormData,
): Promise<OperationalActionState> {
  const seg = segment(formData);
  try {
    const user = await requireChatGPTUser(`/${seg}/help`);
    await createSupportTicket(user.userId, {
      journeyId: textField(formData, 'journeyId') || undefined,
      priority: textField(formData, 'priority', 30),
      category: textField(formData, 'category', 60),
      subject: textField(formData, 'subject', 240),
      message: textField(formData, 'message', 8000),
    });
    revalidatePath(`/${seg}/dashboard`);
    return {
      status: 'success',
      message:
        seg === 'bn' ? 'সহায়তার অনুরোধ গ্রহণ করা হয়েছে।' : 'Your support request was received.',
    };
  } catch {
    return {
      status: 'error',
      message: seg === 'bn' ? 'অনুরোধ পাঠানো যায়নি।' : 'The request could not be submitted.',
    };
  }
}

export async function submitPartnerEvidenceAction(
  _previous: OperationalActionState,
  formData: FormData,
): Promise<OperationalActionState> {
  const seg = segment(formData);
  try {
    const user = await requireChatGPTUser(`/${seg}/partners`);
    const portalType = textField(formData, 'portalType', 40);
    const submissionType = textField(formData, 'submissionType', 60);
    if (!['employer', 'recruiter', 'institution', 'provider'].includes(portalType)) {
      throw new Error('Unsupported portal type.');
    }
    if (
      !['job_order', 'licence', 'programme', 'service', 'source_update'].includes(submissionType)
    ) {
      throw new Error('Unsupported submission type.');
    }
    await createPartnerSubmission(user.userId, {
      portalType,
      submissionType,
      organizationName: textField(formData, 'organizationName', 240),
      countryCode: textField(formData, 'countryCode', 2) || undefined,
      title: textField(formData, 'title', 240),
      evidence: textField(formData, 'evidence', 8000),
      feeDeclaration: textField(formData, 'feeDeclaration', 4000) || undefined,
    });
    revalidatePath(`/${seg}/partners`);
    return {
      status: 'success',
      message:
        seg === 'bn'
          ? 'প্রমাণ জমা হয়েছে; স্বাধীন পর্যালোচনা ছাড়া এটি প্রকাশ হবে না।'
          : 'Evidence submitted; it will not be published without independent review.',
    };
  } catch {
    return {
      status: 'error',
      message: seg === 'bn' ? 'প্রমাণ জমা দেওয়া যায়নি।' : 'The evidence could not be submitted.',
    };
  }
}

export async function submitOutcomeReportAction(
  _previous: OperationalActionState,
  formData: FormData,
): Promise<OperationalActionState> {
  const seg = segment(formData);
  try {
    if (formData.get('consentGiven') !== 'yes') throw new Error('Consent required.');
    const user = await requireChatGPTUser(`/${seg}/outcomes`);
    const [pathValue, journeyId] = textField(formData, 'journeyRef', 100).split(':', 2);
    const path = pathValue === 'study' ? 'study' : 'work';
    const primaryOutcome = textField(formData, 'primaryOutcome', 60);
    const promiseMatched = textField(formData, 'promiseMatched', 20);
    const costMatched = textField(formData, 'costMatched', 20);
    if (!['positive', 'mixed', 'negative', 'ongoing'].includes(primaryOutcome))
      throw new Error('Invalid outcome.');
    if (
      !['yes', 'no', 'unknown'].includes(promiseMatched) ||
      !['yes', 'no', 'unknown'].includes(costMatched)
    ) {
      throw new Error('Invalid comparison.');
    }
    const costInput = textField(formData, 'actualCost');
    const cost = Number(costInput);
    await createOutcomeReport(user.userId, {
      journeyId: journeyId ?? '',
      path,
      reachedDestination: formData.get('reachedDestination') === 'yes',
      primaryOutcome,
      promiseMatched,
      costMatched,
      actualCostMinor:
        costInput && Number.isFinite(cost) && cost >= 0 ? Math.round(cost * 100) : undefined,
      currency: costInput ? textField(formData, 'currency', 3) : undefined,
      notes: textField(formData, 'notes', 4000) || undefined,
    });
    revalidatePath(`/${seg}/outcomes`);
    revalidatePath(`/${seg}/dashboard`);
    return {
      status: 'success',
      message:
        seg === 'bn'
          ? 'ফলাফল সংরক্ষিত হয়েছে; সমষ্টিতে যাওয়ার আগে মানব রিভিউ হবে।'
          : 'Outcome saved; it will be human-reviewed before entering aggregates.',
    };
  } catch {
    return {
      status: 'error',
      message: seg === 'bn' ? 'ফলাফল সংরক্ষণ করা যায়নি।' : 'The outcome could not be saved.',
    };
  }
}

export async function startBlankJourneyAction(formData: FormData): Promise<void> {
  const seg = segment(formData);
  const path = (textField(formData, 'path') === 'study' ? 'study' : 'work') as JourneyPath;
  const user = await requireChatGPTUser(`/${seg}/dashboard`);
  const id = await createJourney(user.userId, {
    path,
    targetType: 'exploration',
    title:
      path === 'work'
        ? seg === 'bn'
          ? 'আমার বিদেশে কাজের যাত্রা'
          : 'My Work Abroad journey'
        : seg === 'bn'
          ? 'আমার উচ্চশিক্ষার যাত্রা'
          : 'My Higher Study journey',
  });
  redirect(`/${seg}/cases/${id}`);
}
