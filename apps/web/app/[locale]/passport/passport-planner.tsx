'use client';

import { useActionState, useMemo, useState, type ReactNode } from 'react';
import {
  buildPreparationPlan,
  compareJourneyReadiness,
  type BudgetBand,
  type EducationLevel,
  type JourneyIntent,
  type LanguageLevel,
  type Locale,
  type MigrationPassport,
  type ReadinessAssessment,
  type ReadinessOutcome,
  type ReadinessState,
  type StudyTarget,
} from '@probash/domain';
import { Badge, ButtonLink, Icon } from '@probash/web-ui';
import { translator, type Translate } from '@/lib/i18n';
import { savePassportAction } from '../operational-actions';

const EMPTY_PASSPORT: MigrationPassport = {
  intent: 'unsure',
  identity: {},
  education: {},
  professional: {},
  study: {},
  language: {},
  finance: {},
  documents: {},
  preferences: { destinationCountries: [] },
};

function fromTriState(value: string): boolean | undefined {
  return value === 'yes' ? true : value === 'no' ? false : undefined;
}

function TriStateField({
  label,
  value,
  onChange,
  t,
}: {
  label: string;
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
  t: Translate;
}) {
  return (
    <label className="passport-field">
      <span>{label}</span>
      <select
        value={value === undefined ? '' : value ? 'yes' : 'no'}
        onChange={(event) => onChange(fromTriState(event.target.value))}
      >
        <option value="">{t('passport.unknown')}</option>
        <option value="yes">{t('passport.yes')}</option>
        <option value="no">{t('passport.no')}</option>
      </select>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  t,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  children: ReactNode;
  t: Translate;
}) {
  return (
    <label className="passport-field">
      <span>{label}</span>
      <select value={value ?? ''} onChange={(event) => onChange(event.target.value || undefined)}>
        <option value="">{t('passport.choose')}</option>
        {children}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <label className="passport-field">
      <span>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={600}
        value={value ?? ''}
        onChange={(event) =>
          onChange(event.target.value === '' ? undefined : Number(event.target.value))
        }
      />
    </label>
  );
}

const OUTCOME_KEYS: Record<ReadinessOutcome, string> = {
  ready: 'passport.outcomeReady',
  near_ready: 'passport.outcomeNearReady',
  needs_preparation: 'passport.outcomeNeedsPreparation',
  needs_review: 'passport.outcomeNeedsReview',
};

const STATE_KEYS: Record<ReadinessState, string> = {
  ready: 'passport.stateReady',
  missing: 'passport.stateMissing',
  unknown: 'passport.stateUnknown',
};

function AssessmentCard({
  title,
  icon,
  assessment,
  t,
}: {
  title: string;
  icon: 'work' | 'study';
  assessment: ReadinessAssessment;
  t: Translate;
}) {
  return (
    <article className={`passport-assessment passport-assessment-${assessment.path}`}>
      <header>
        <span className="passport-path-icon" aria-hidden="true">
          <Icon name={icon} size={22} />
        </span>
        <div>
          <h3>{title}</h3>
          <p>{t(OUTCOME_KEYS[assessment.outcome])}</p>
        </div>
      </header>

      <div className="passport-score-row">
        <div>
          <strong>{assessment.readinessPercent}%</strong>
          <span>{t('passport.readiness')}</span>
        </div>
        <div>
          <strong>{assessment.evidenceCoveragePercent}%</strong>
          <span>{t('passport.coverage')}</span>
        </div>
      </div>
      <div className="passport-meter" aria-hidden="true">
        <span style={{ width: `${assessment.readinessPercent}%` }} />
      </div>

      <div className="passport-state-summary">
        <Badge tone="success">
          {t('passport.stateReady')} {assessment.ready.length}
        </Badge>
        <Badge tone="danger">
          {t('passport.stateMissing')} {assessment.missing.length}
        </Badge>
        <Badge tone="warning">
          {t('passport.stateUnknown')} {assessment.unknown.length}
        </Badge>
      </div>

      <details className="passport-evidence-list">
        <summary>{t('passport.showEvidence')}</summary>
        <ul>
          {assessment.factors.map((factor) => (
            <li key={factor.id} className={`is-${factor.state}`}>
              <span className="passport-factor-state">{t(STATE_KEYS[factor.state])}</span>
              <span>{t(factor.labelKey)}</span>
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

export function PassportPlanner({
  locale,
  localeSegment,
  initialPassport,
}: {
  locale: Locale;
  localeSegment: 'bn' | 'en';
  initialPassport?: MigrationPassport;
}) {
  const t = translator(locale);
  const [passport, setPassport] = useState<MigrationPassport>(initialPassport ?? EMPTY_PASSPORT);
  const [saveState, saveAction, saving] = useActionState(savePassportAction, {});
  const comparison = useMemo(() => compareJourneyReadiness(passport), [passport]);
  const workPlan = useMemo(() => buildPreparationPlan(comparison.work), [comparison.work]);
  const studyPlan = useMemo(() => buildPreparationPlan(comparison.study), [comparison.study]);

  const comparisonKey =
    comparison.currentlyMorePrepared === 'work'
      ? 'passport.comparisonWork'
      : comparison.currentlyMorePrepared === 'study'
        ? 'passport.comparisonStudy'
        : comparison.currentlyMorePrepared === 'balanced'
          ? 'passport.comparisonBalanced'
          : 'passport.comparisonInsufficient';

  const renderPlan = (path: 'work' | 'study') => {
    const plan = path === 'work' ? workPlan : studyPlan;
    return (
      <article className="passport-plan-column">
        <h3>
          <Icon name={path} size={21} />
          <span>{t(path === 'work' ? 'passport.workPath' : 'passport.studyPath')}</span>
        </h3>
        {plan.length === 0 ? <p>{t('passport.planEmpty')}</p> : null}
        <ol>
          {plan.map((task) => (
            <li key={task.id}>
              <div>
                <Badge
                  tone={
                    task.priority === 'now'
                      ? 'danger'
                      : task.priority === 'next'
                        ? 'info'
                        : 'warning'
                  }
                >
                  {t(
                    task.priority === 'now'
                      ? 'passport.priorityNow'
                      : task.priority === 'next'
                        ? 'passport.priorityNext'
                        : 'passport.priorityConfirm',
                  )}
                </Badge>
                {task.needsRouteEvidence ? (
                  <span className="passport-source-label">{t('passport.sourceRequired')}</span>
                ) : null}
              </div>
              <strong>{t(task.labelKey)}</strong>
              <p>{t(task.actionKey)}</p>
            </li>
          ))}
        </ol>
      </article>
    );
  };

  return (
    <>
      <section className="passport-workspace" aria-labelledby="passport-form-title">
        <div className="passport-form-panel">
          <header className="passport-section-heading">
            <p className="pui-eyebrow">01</p>
            <h2 id="passport-form-title">{t('passport.formTitle')}</h2>
            <p>{t('passport.formLead')}</p>
          </header>

          <form action={saveAction}>
            <input type="hidden" name="locale" value={localeSegment} />
            <input type="hidden" name="passportJson" value={JSON.stringify(passport)} />
            <fieldset>
              <legend>{t('passport.sectionDirection')}</legend>
              <SelectField
                label={t('passport.intent')}
                value={passport.intent}
                onChange={(value) =>
                  setPassport((current) => ({
                    ...current,
                    intent: (value as JourneyIntent | undefined) ?? 'unsure',
                  }))
                }
                t={t}
              >
                <option value="work">{t('passport.intentWork')}</option>
                <option value="study">{t('passport.intentStudy')}</option>
                <option value="both">{t('passport.intentBoth')}</option>
                <option value="unsure">{t('passport.intentUnsure')}</option>
              </SelectField>
            </fieldset>

            <fieldset>
              <legend>{t('passport.sectionIdentity')}</legend>
              <div className="passport-field-grid">
                <TriStateField
                  label={t('passport.hasPassport')}
                  value={passport.identity.hasPassport}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      identity: { ...current.identity, hasPassport: value },
                    }))
                  }
                  t={t}
                />
                {passport.identity.hasPassport ? (
                  <NumberField
                    label={t('passport.passportValidity')}
                    value={passport.identity.passportValidityMonths}
                    onChange={(value) =>
                      setPassport((current) => ({
                        ...current,
                        identity: { ...current.identity, passportValidityMonths: value },
                      }))
                    }
                  />
                ) : null}
                <NumberField
                  label={t('passport.targetStart')}
                  value={passport.preferences.targetStartMonths}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      preferences: { ...current.preferences, targetStartMonths: value },
                    }))
                  }
                />
                <TriStateField
                  label={t('passport.policeClearance')}
                  value={passport.documents.hasPoliceClearance}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      documents: { ...current.documents, hasPoliceClearance: value },
                    }))
                  }
                  t={t}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend>{t('passport.sectionEducation')}</legend>
              <div className="passport-field-grid">
                <SelectField
                  label={t('passport.highestEducation')}
                  value={passport.education.highestLevel}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      education: { ...current.education, highestLevel: value as EducationLevel },
                    }))
                  }
                  t={t}
                >
                  <option value="secondary">{t('passport.educationSecondary')}</option>
                  <option value="higher_secondary">{t('passport.educationHigherSecondary')}</option>
                  <option value="diploma">{t('passport.educationDiploma')}</option>
                  <option value="bachelor">{t('passport.educationBachelor')}</option>
                  <option value="master">{t('passport.educationMaster')}</option>
                  <option value="doctorate">{t('passport.educationDoctorate')}</option>
                </SelectField>
                <TriStateField
                  label={t('passport.certificates')}
                  value={passport.education.hasCertificates}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      education: { ...current.education, hasCertificates: value },
                    }))
                  }
                  t={t}
                />
                <TriStateField
                  label={t('passport.transcripts')}
                  value={passport.education.hasTranscripts}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      education: { ...current.education, hasTranscripts: value },
                    }))
                  }
                  t={t}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend>{t('passport.sectionWork')}</legend>
              <div className="passport-field-grid">
                <TriStateField
                  label={t('passport.occupationKnown')}
                  value={passport.professional.occupationKnown}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      professional: { ...current.professional, occupationKnown: value },
                    }))
                  }
                  t={t}
                />
                <NumberField
                  label={t('passport.experienceMonths')}
                  value={passport.professional.experienceMonths}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      professional: { ...current.professional, experienceMonths: value },
                    }))
                  }
                />
                <TriStateField
                  label={t('passport.experienceEvidence')}
                  value={passport.professional.hasExperienceEvidence}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      professional: { ...current.professional, hasExperienceEvidence: value },
                    }))
                  }
                  t={t}
                />
                <TriStateField
                  label={t('passport.skillCertificate')}
                  value={passport.professional.hasSkillCertificate}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      professional: { ...current.professional, hasSkillCertificate: value },
                    }))
                  }
                  t={t}
                />
                <TriStateField
                  label={t('passport.bmetRegistration')}
                  value={passport.professional.hasBmetRegistration}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      professional: { ...current.professional, hasBmetRegistration: value },
                    }))
                  }
                  t={t}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend>{t('passport.sectionStudy')}</legend>
              <div className="passport-field-grid">
                <SelectField
                  label={t('passport.studyTarget')}
                  value={passport.study.target}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      study: { ...current.study, target: value as StudyTarget },
                    }))
                  }
                  t={t}
                >
                  <option value="bachelor">{t('passport.targetBachelor')}</option>
                  <option value="master">{t('passport.targetMaster')}</option>
                  <option value="phd">{t('passport.targetPhd')}</option>
                  <option value="unsure">{t('passport.targetUnsure')}</option>
                </SelectField>
                <TriStateField
                  label={t('passport.academicCv')}
                  value={passport.study.hasAcademicCv}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      study: { ...current.study, hasAcademicCv: value },
                    }))
                  }
                  t={t}
                />
                <TriStateField
                  label={t('passport.statement')}
                  value={passport.study.hasStatement}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      study: { ...current.study, hasStatement: value },
                    }))
                  }
                  t={t}
                />
                <TriStateField
                  label={t('passport.recommendations')}
                  value={passport.study.hasRecommendations}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      study: { ...current.study, hasRecommendations: value },
                    }))
                  }
                  t={t}
                />
                {passport.study.target === 'phd' ? (
                  <TriStateField
                    label={t('passport.researchProposal')}
                    value={passport.study.hasResearchProposal}
                    onChange={(value) =>
                      setPassport((current) => ({
                        ...current,
                        study: { ...current.study, hasResearchProposal: value },
                      }))
                    }
                    t={t}
                  />
                ) : null}
              </div>
            </fieldset>

            <fieldset>
              <legend>{t('passport.sectionLanguage')}</legend>
              <div className="passport-field-grid">
                <SelectField
                  label={t('passport.englishLevel')}
                  value={passport.language.englishLevel}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      language: { ...current.language, englishLevel: value as LanguageLevel },
                    }))
                  }
                  t={t}
                >
                  <option value="none">{t('passport.languageNone')}</option>
                  <option value="basic">{t('passport.languageBasic')}</option>
                  <option value="intermediate">{t('passport.languageIntermediate')}</option>
                  <option value="advanced">{t('passport.languageAdvanced')}</option>
                </SelectField>
                <TriStateField
                  label={t('passport.verifiedTest')}
                  value={passport.language.hasVerifiedTest}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      language: { ...current.language, hasVerifiedTest: value },
                    }))
                  }
                  t={t}
                />
                <TriStateField
                  label={t('passport.willingToLearn')}
                  value={passport.language.willingToLearn}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      language: { ...current.language, willingToLearn: value },
                    }))
                  }
                  t={t}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend>{t('passport.sectionFinance')}</legend>
              <div className="passport-field-grid">
                <SelectField
                  label={t('passport.budgetBand')}
                  value={passport.finance.budgetBand}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      finance: { ...current.finance, budgetBand: value as BudgetBand },
                    }))
                  }
                  t={t}
                >
                  <option value="under_300k">{t('passport.budgetUnder300')}</option>
                  <option value="300k_800k">{t('passport.budget300to800')}</option>
                  <option value="800k_1500k">{t('passport.budget800to1500')}</option>
                  <option value="over_1500k">{t('passport.budgetOver1500')}</option>
                </SelectField>
                <TriStateField
                  label={t('passport.proofOfFunds')}
                  value={passport.finance.proofOfFundsReady}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      finance: { ...current.finance, proofOfFundsReady: value },
                    }))
                  }
                  t={t}
                />
                <TriStateField
                  label={t('passport.needsScholarship')}
                  value={passport.finance.needsScholarship}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      finance: { ...current.finance, needsScholarship: value },
                    }))
                  }
                  t={t}
                />
                <TriStateField
                  label={t('passport.fundingPlan')}
                  value={passport.finance.hasFundingPlan}
                  onChange={(value) =>
                    setPassport((current) => ({
                      ...current,
                      finance: { ...current.finance, hasFundingPlan: value },
                    }))
                  }
                  t={t}
                />
              </div>
            </fieldset>

            <div className="passport-save-bar">
              <div>
                <strong>{t('passport.saveTitle')}</strong>
                <p>{t('passport.saveBody')}</p>
                {saveState.message ? (
                  <p
                    className={`badge ${saveState.status === 'success' ? 'badge-success' : 'badge-danger'}`}
                    role="status"
                  >
                    {saveState.message}
                  </p>
                ) : null}
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? t('common.loading') : t('passport.save')}
              </button>
            </div>
          </form>
        </div>

        <aside className="passport-results" aria-live="polite">
          <header className="passport-section-heading">
            <p className="pui-eyebrow">02</p>
            <h2>{t('passport.resultsTitle')}</h2>
            <p>{t('passport.resultsLead')}</p>
          </header>
          <div className="passport-comparison-message">
            <Icon name="route" size={23} />
            <div>
              <strong>{t(comparisonKey)}</strong>
              <p>{t('passport.comparisonNote')}</p>
            </div>
          </div>
          <div className="passport-assessment-grid">
            <AssessmentCard
              title={t('passport.workPath')}
              icon="work"
              assessment={comparison.work}
              t={t}
            />
            <AssessmentCard
              title={t('passport.studyPath')}
              icon="study"
              assessment={comparison.study}
              t={t}
            />
          </div>
        </aside>
      </section>

      <section className="passport-plan" id="plan" aria-labelledby="passport-plan-title">
        <header className="passport-section-heading">
          <p className="pui-eyebrow">03</p>
          <h2 id="passport-plan-title">{t('passport.planTitle')}</h2>
          <p>{t('passport.planLead')}</p>
        </header>
        <div className="passport-plan-grid">
          {renderPlan('work')}
          {renderPlan('study')}
        </div>
        <div className="passport-next-links">
          <ButtonLink href={`/${localeSegment}/work`} icon={<Icon name="work" size={19} />}>
            {t('passport.exploreWork')}
          </ButtonLink>
          <ButtonLink
            href={`/${localeSegment}/study`}
            variant="secondary"
            icon={<Icon name="study" size={19} />}
          >
            {t('passport.exploreStudy')}
          </ButtonLink>
          <ButtonLink href={`/${localeSegment}/countries`} variant="outline">
            {t('passport.browseCountries')}
          </ButtonLink>
          <ButtonLink href={`/${localeSegment}/verify`} variant="ghost">
            {t('passport.verifyOffer')}
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
