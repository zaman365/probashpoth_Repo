'use client';

import { useActionState } from 'react';
import type { Locale } from '@probash/domain';
import {
  addDelegationAction,
  addLedgerEntryAction,
  addJourneyRecordAction,
  submitSupportTicketAction,
  submitPartnerEvidenceAction,
  submitOutcomeReportAction,
  submitVerificationAction,
  uploadDocumentAction,
} from '@/app/[locale]/operational-actions';
import { translator } from '@/lib/i18n';

type JourneyOption = { id: string; title: string };

export function ConfirmSubmitButton({
  label,
  confirmation,
}: {
  label: string;
  confirmation: string;
}) {
  return (
    <button
      type="submit"
      className="btn btn-ghost"
      onClick={(event) => {
        if (!window.confirm(confirmation)) event.preventDefault();
      }}
    >
      {label}
    </button>
  );
}

function Result({ state }: { state: { status?: string; message?: string } }) {
  if (!state.message) return null;
  return (
    <p
      className={`badge ${state.status === 'success' ? 'badge-success' : 'badge-danger'}`}
      role="status"
    >
      {state.message}
    </p>
  );
}

function JourneySelect({
  journeys,
  label,
  optional,
}: {
  journeys: JourneyOption[];
  label: string;
  optional: string;
}) {
  return (
    <label>
      <span>{label}</span>
      <select name="journeyId" className="field">
        <option value="">{optional}</option>
        {journeys.map((journey) => (
          <option key={journey.id} value={journey.id}>
            {journey.title}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DocumentUploadForm({
  locale,
  localeSegment,
  journeys,
}: {
  locale: Locale;
  localeSegment: 'bn' | 'en';
  journeys: JourneyOption[];
}) {
  const t = translator(locale);
  const [state, action, pending] = useActionState(uploadDocumentAction, {});
  return (
    <form action={action} className="card stack">
      <input type="hidden" name="locale" value={localeSegment} />
      <h2 className="card-title">{t('operations.uploadTitle')}</h2>
      <p>{t('operations.uploadLead')}</p>
      <label>
        <span>{t('operations.documentLabel')}</span>
        <input name="label" className="field" required maxLength={180} />
      </label>
      <label>
        <span>{t('operations.documentCategory')}</span>
        <select name="category" className="field" defaultValue="identity">
          <option value="identity">{t('operations.categoryIdentity')}</option>
          <option value="education">{t('operations.categoryEducation')}</option>
          <option value="employment">{t('operations.categoryEmployment')}</option>
          <option value="financial">{t('operations.categoryFinancial')}</option>
          <option value="application">{t('operations.categoryApplication')}</option>
          <option value="receipt">{t('operations.categoryReceipt')}</option>
        </select>
      </label>
      <JourneySelect
        journeys={journeys}
        label={t('operations.journey')}
        optional={t('operations.noJourney')}
      />
      <label>
        <span>{t('operations.chooseFile')}</span>
        <input
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          required
        />
      </label>
      <p className="muted">{t('operations.fileLimits')}</p>
      <Result state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? t('common.loading') : t('operations.upload')}
      </button>
    </form>
  );
}

export function LedgerEntryForm({
  locale,
  localeSegment,
  journeys,
}: {
  locale: Locale;
  localeSegment: 'bn' | 'en';
  journeys: JourneyOption[];
}) {
  const t = translator(locale);
  const [state, action, pending] = useActionState(addLedgerEntryAction, {});
  return (
    <form action={action} className="card stack">
      <input type="hidden" name="locale" value={localeSegment} />
      <h2 className="card-title">{t('operations.addCost')}</h2>
      <JourneySelect
        journeys={journeys}
        label={t('operations.journey')}
        optional={t('operations.noJourney')}
      />
      <label>
        <span>{t('operations.costLabel')}</span>
        <input name="label" className="field" required maxLength={180} />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label>
          <span>{t('operations.amount')}</span>
          <input name="amount" type="number" min="0" step="0.01" className="field" required />
        </label>
        <label>
          <span>{t('operations.currency')}</span>
          <select name="currency" className="field" defaultValue="BDT">
            {[
              'BDT',
              'EUR',
              'GBP',
              'USD',
              'CAD',
              'AUD',
              'JPY',
              'KRW',
              'MYR',
              'SGD',
              'SAR',
              'QAR',
              'AED',
            ].map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span>{t('operations.payee')}</span>
        <input name="payee" className="field" maxLength={180} />
      </label>
      <label>
        <span>{t('operations.legalBasis')}</span>
        <input name="legalBasis" className="field" maxLength={500} />
      </label>
      <Result state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? t('common.loading') : t('operations.saveCost')}
      </button>
    </form>
  );
}

export function DelegationForm({
  locale,
  localeSegment,
  journeys,
}: {
  locale: Locale;
  localeSegment: 'bn' | 'en';
  journeys: JourneyOption[];
}) {
  const t = translator(locale);
  const [state, action, pending] = useActionState(addDelegationAction, {});
  return (
    <form action={action} className="card stack">
      <input type="hidden" name="locale" value={localeSegment} />
      <h2 className="card-title">{t('operations.familyTitle')}</h2>
      <p>{t('operations.familyLead')}</p>
      <JourneySelect
        journeys={journeys}
        label={t('operations.journey')}
        optional={t('operations.allJourneys')}
      />
      <label>
        <span>{t('operations.contact')}</span>
        <input name="contact" className="field" required maxLength={180} />
      </label>
      <label>
        <span>{t('family.relationship')}</span>
        <select name="relationship" className="field" defaultValue="spouse">
          <option value="spouse">{t('family.relationshipSpouse')}</option>
          <option value="parent">{t('family.relationshipParent')}</option>
          <option value="sibling">{t('family.relationshipSibling')}</option>
          <option value="child">{t('family.relationshipChild')}</option>
          <option value="trusted_person">{t('family.relationshipTrusted')}</option>
        </select>
      </label>
      <fieldset className="stack">
        <legend>{t('operations.permissions')}</legend>
        {(
          [
            ['view_progress', 'operations.permissionProgress'],
            ['view_cost', 'operations.permissionCost'],
            ['receive_alerts', 'operations.permissionAlerts'],
            ['upload_documents', 'operations.permissionDocuments'],
          ] as const
        ).map(([value, key]) => (
          <label key={value} className="flex items-center gap-3">
            <input
              type="checkbox"
              name="permissions"
              value={value}
              defaultChecked={value !== 'upload_documents'}
            />
            <span>{t(key)}</span>
          </label>
        ))}
      </fieldset>
      <Result state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? t('common.loading') : t('operations.grantAccess')}
      </button>
    </form>
  );
}

export function VerificationRequestForm({
  locale,
  localeSegment,
}: {
  locale: Locale;
  localeSegment: 'bn' | 'en';
}) {
  const t = translator(locale);
  const [state, action, pending] = useActionState(submitVerificationAction, {});
  return (
    <form action={action} className="card stack">
      <input type="hidden" name="locale" value={localeSegment} />
      <h2 className="card-title">{t('operations.humanReviewTitle')}</h2>
      <p>{t('operations.humanReviewLead')}</p>
      <label>
        <span>{t('operations.reviewKind')}</span>
        <select name="kind" className="field" defaultValue="job">
          {[
            'job',
            'employer',
            'recruiter',
            'contract',
            'visa',
            'payment',
            'institution',
            'programme',
            'admission',
            'scholarship',
            'agent',
          ].map((kind) => (
            <option key={kind} value={kind}>
              {t(`operations.kind.${kind}`)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t('operations.subject')}</span>
        <input name="subject" className="field" required maxLength={500} />
      </label>
      <label>
        <span>{t('operations.evidence')}</span>
        <textarea name="evidence" className="field" rows={5} maxLength={4000} />
      </label>
      <Result state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? t('common.loading') : t('operations.submitReview')}
      </button>
    </form>
  );
}

export function SupportTicketForm({
  locale,
  localeSegment,
  journeys,
}: {
  locale: Locale;
  localeSegment: 'bn' | 'en';
  journeys: JourneyOption[];
}) {
  const t = translator(locale);
  const [state, action, pending] = useActionState(submitSupportTicketAction, {});
  return (
    <form action={action} className="card stack">
      <input type="hidden" name="locale" value={localeSegment} />
      <h2 className="card-title">{t('operations.supportTitle')}</h2>
      <JourneySelect
        journeys={journeys}
        label={t('operations.journey')}
        optional={t('operations.noJourney')}
      />
      <label>
        <span>{t('operations.priority')}</span>
        <select name="priority" className="field" defaultValue="normal">
          <option value="normal">{t('operations.priorityNormal')}</option>
          <option value="urgent">{t('operations.priorityUrgent')}</option>
          <option value="critical">{t('operations.priorityCritical')}</option>
        </select>
      </label>
      <label>
        <span>{t('operations.supportCategory')}</span>
        <select name="category" className="field" defaultValue="guidance">
          <option value="guidance">{t('operations.categoryGuidance')}</option>
          <option value="fraud">{t('operations.categoryFraud')}</option>
          <option value="payment">{t('operations.categoryPayment')}</option>
          <option value="rights">{t('operations.categoryRights')}</option>
          <option value="technical">{t('operations.categoryTechnical')}</option>
        </select>
      </label>
      <label>
        <span>{t('operations.subject')}</span>
        <input name="subject" className="field" required maxLength={240} />
      </label>
      <label>
        <span>{t('operations.message')}</span>
        <textarea name="message" className="field" rows={6} required maxLength={8000} />
      </label>
      <Result state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? t('common.loading') : t('operations.sendSupport')}
      </button>
    </form>
  );
}

const WORK_RECORD_TYPES = [
  'job_application',
  'interview',
  'offer',
  'contract',
  'training',
  'permit',
  'departure',
  'arrival',
  'work_outcome',
] as const;

const STUDY_RECORD_TYPES = [
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
] as const;

export function JourneyRecordForm({
  locale,
  localeSegment,
  journeyId,
  path,
}: {
  locale: Locale;
  localeSegment: 'bn' | 'en';
  journeyId: string;
  path: 'work' | 'study';
}) {
  const t = translator(locale);
  const [state, action, pending] = useActionState(addJourneyRecordAction, {});
  const types = path === 'work' ? WORK_RECORD_TYPES : STUDY_RECORD_TYPES;
  return (
    <form action={action} className="card stack">
      <input type="hidden" name="locale" value={localeSegment} />
      <input type="hidden" name="journeyId" value={journeyId} />
      <h3 className="card-title">{t('operations.addWorkbenchRecord')}</h3>
      <p>{t(path === 'work' ? 'operations.workbenchWorkLead' : 'operations.workbenchStudyLead')}</p>
      <div className="grid grid-cols-2 gap-4">
        <label>
          <span>{t('operations.recordTypeLabel')}</span>
          <select name="recordType" className="field" defaultValue={types[0]}>
            {types.map((type) => (
              <option key={type} value={type}>
                {t(`operations.recordType.${type}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('operations.recordStatusLabel')}</span>
          <select name="status" className="field" defaultValue="planned">
            {[
              'planned',
              'preparing',
              'submitted',
              'in_review',
              'verified',
              'completed',
              'blocked',
              'rejected',
              'withdrawn',
            ].map((status) => (
              <option key={status} value={status}>
                {t(`operations.recordStatus.${status}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span>{t('operations.recordTitleLabel')}</span>
        <input name="title" className="field" required maxLength={240} />
      </label>
      <label>
        <span>{t('operations.recordNotesLabel')}</span>
        <textarea name="notes" className="field" rows={4} maxLength={4000} />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label>
          <span>{t('operations.recordDueLabel')}</span>
          <input name="dueAt" type="date" className="field" />
        </label>
        <label>
          <span>{t('operations.recordAmountLabel')}</span>
          <div className="record-money-fields">
            <input name="amount" type="number" min="0" step="0.01" className="field" />
            <select name="currency" className="field" defaultValue="BDT">
              {[
                'BDT',
                'EUR',
                'GBP',
                'USD',
                'CAD',
                'AUD',
                'JPY',
                'KRW',
                'MYR',
                'SGD',
                'SAR',
                'QAR',
                'AED',
              ].map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </select>
          </div>
        </label>
      </div>
      <Result state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? t('common.loading') : t('operations.saveRecord')}
      </button>
    </form>
  );
}

export function PartnerEvidenceForm({
  locale,
  localeSegment,
}: {
  locale: Locale;
  localeSegment: 'bn' | 'en';
}) {
  const t = translator(locale);
  const [state, action, pending] = useActionState(submitPartnerEvidenceAction, {});
  return (
    <form action={action} className="card stack">
      <input type="hidden" name="locale" value={localeSegment} />
      <div className="grid grid-cols-2 gap-4">
        <label>
          <span>{t('supply.portalType')}</span>
          <select name="portalType" className="field" defaultValue="employer">
            {['employer', 'recruiter', 'institution', 'provider'].map((type) => (
              <option key={type} value={type}>
                {t(`supply.portalTypeValue.${type}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('supply.submissionType')}</span>
          <select name="submissionType" className="field" defaultValue="job_order">
            {['job_order', 'licence', 'programme', 'service', 'source_update'].map((type) => (
              <option key={type} value={type}>
                {t(`supply.submissionTypeValue.${type}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span>{t('supply.organizationName')}</span>
        <input name="organizationName" className="field" required maxLength={240} />
      </label>
      <label>
        <span>{t('supply.countryCode')}</span>
        <input name="countryCode" className="field" minLength={2} maxLength={2} />
      </label>
      <label>
        <span>{t('supply.submissionTitle')}</span>
        <input name="title" className="field" required maxLength={240} />
      </label>
      <label>
        <span>{t('supply.evidence')}</span>
        <textarea name="evidence" className="field" required rows={6} maxLength={8000} />
      </label>
      <label>
        <span>{t('supply.feeDeclaration')}</span>
        <textarea name="feeDeclaration" className="field" rows={4} maxLength={4000} />
      </label>
      <Result state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? t('common.loading') : t('supply.submitEvidence')}
      </button>
    </form>
  );
}

export function OutcomeReportForm({
  locale,
  localeSegment,
  journeys,
}: {
  locale: Locale;
  localeSegment: 'bn' | 'en';
  journeys: Array<JourneyOption & { path: 'work' | 'study' }>;
}) {
  const t = translator(locale);
  const [state, action, pending] = useActionState(submitOutcomeReportAction, {});
  return (
    <form action={action} className="card stack">
      <input type="hidden" name="locale" value={localeSegment} />
      <label>
        <span>{t('operations.journey')}</span>
        <select name="journeyRef" className="field" required defaultValue="">
          <option value="" disabled>
            {t('outcomeIntelligence.chooseJourney')}
          </option>
          {journeys.map((journey) => (
            <option key={journey.id} value={`${journey.path}:${journey.id}`}>
              {journey.title}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="stack">
        <legend>{t('outcomeIntelligence.reachedDestination')}</legend>
        <label className="flex items-center gap-3">
          <input type="radio" name="reachedDestination" value="yes" required />
          <span>{t('common.yes')}</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="radio" name="reachedDestination" value="no" required />
          <span>{t('common.no')}</span>
        </label>
      </fieldset>
      <label>
        <span>{t('outcomeIntelligence.primaryOutcome')}</span>
        <select name="primaryOutcome" className="field" defaultValue="ongoing">
          {['ongoing', 'positive', 'mixed', 'negative'].map((value) => (
            <option key={value} value={value}>
              {t(`outcomeIntelligence.outcomeValue.${value}`)}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-4">
        {(['promiseMatched', 'costMatched'] as const).map((field) => (
          <label key={field}>
            <span>{t(`outcomeIntelligence.${field}`)}</span>
            <select name={field} className="field" defaultValue="unknown">
              {['yes', 'no', 'unknown'].map((value) => (
                <option key={value} value={value}>
                  {t(`outcomeIntelligence.answer.${value}`)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <label>
        <span>{t('outcomeIntelligence.actualCost')}</span>
        <div className="record-money-fields">
          <input name="actualCost" type="number" min="0" step="0.01" className="field" />
          <select name="currency" className="field" defaultValue="BDT">
            {[
              'BDT',
              'EUR',
              'GBP',
              'USD',
              'CAD',
              'AUD',
              'JPY',
              'KRW',
              'MYR',
              'SGD',
              'SAR',
              'QAR',
              'AED',
            ].map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        </div>
      </label>
      <label>
        <span>{t('outcomeIntelligence.notes')}</span>
        <textarea name="notes" className="field" rows={5} maxLength={4000} />
      </label>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="consentGiven" value="yes" required />
        <span>{t('outcomeIntelligence.consentCheckbox')}</span>
      </label>
      <Result state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending || journeys.length === 0}>
        {pending ? t('common.loading') : t('outcomeIntelligence.submit')}
      </button>
    </form>
  );
}
