import { redirect } from 'next/navigation';
import { Icon } from '@probash/web-ui';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { getProfile } from '@/db/operations';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { completeOnboardingAction } from '../operational-actions';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const user = await requireChatGPTUser(`/${seg}/onboarding`);
  const profile = await getProfile(user.userId);
  if (profile?.onboardingCompletedAt) redirect(`/${seg}/account`);

  const stages = ['exploring', 'preparing', 'applying', 'progressing'] as const;

  return (
    <div className="talent-onboarding-page wide-page">
      <section className="talent-onboarding-story">
        <span className="talent-kicker">{t('onboarding.kicker')}</span>
        <h1>{t('onboarding.directionTitle')}</h1>
        <p>{t('onboarding.directionLead')}</p>

        <ol className="onboarding-story-rail">
          <li className="active">
            <span>01</span>
            <div>
              <strong>{t('onboarding.storyIdentity')}</strong>
              <small>{t('onboarding.storyIdentityBody')}</small>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>{t('onboarding.storyEvidence')}</strong>
              <small>{t('onboarding.storyEvidenceBody')}</small>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>{t('onboarding.storyOutcome')}</strong>
              <small>{t('onboarding.storyOutcomeBody')}</small>
            </div>
          </li>
        </ol>

        <div className="onboarding-trust-note">
          <Icon name="shield" size={20} />
          <p>{t('onboarding.progressiveNote')}</p>
        </div>
      </section>

      <form action={completeOnboardingAction} className="talent-onboarding-form">
        <input type="hidden" name="locale" value={seg} />
        <header>
          <span className="account-avatar" aria-hidden="true">
            {user.displayName.slice(0, 1).toUpperCase()}
          </span>
          <span>
            <small>{t('onboarding.signedInAs')}</small>
            <strong>{user.displayName}</strong>
          </span>
          <span className="onboarding-step-count">1 / 3</span>
        </header>

        <fieldset>
          <legend>{t('onboarding.pathQuestion')}</legend>
          <p>{t('onboarding.pathHelp')}</p>
          <div className="talent-path-options">
            <label className="talent-path-option work">
              <input type="radio" name="path" value="work" required />
              <span className="talent-path-icon">
                <Icon name="work" size={26} />
              </span>
              <strong>{t('account.workTalent')}</strong>
              <small>{t('onboarding.workPathBody')}</small>
              <span className="talent-option-check">
                <Icon name="check" size={16} />
              </span>
            </label>
            <label className="talent-path-option study">
              <input type="radio" name="path" value="study" required />
              <span className="talent-path-icon">
                <Icon name="study" size={26} />
              </span>
              <strong>{t('account.studyTalent')}</strong>
              <small>{t('onboarding.studyPathBody')}</small>
              <span className="talent-option-check">
                <Icon name="check" size={16} />
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>{t('onboarding.stageQuestion')}</legend>
          <div className="talent-stage-options">
            {stages.map((stage) => (
              <label key={stage}>
                <input type="radio" name="stage" value={stage} required />
                <span>{t(`onboarding.stage.${stage}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="talent-goal-field">
          <span>{t('onboarding.goalQuestion')}</span>
          <small>{t('onboarding.goalHelp')}</small>
          <input name="goalTitle" maxLength={180} placeholder={t('onboarding.goalPlaceholder')} />
        </label>

        <label className="talent-consent-field">
          <input type="checkbox" name="consent" value="yes" required />
          <span>
            <strong>{t('onboarding.consentTitle')}</strong>
            <small>{t('onboarding.consentBody')}</small>
          </span>
        </label>

        <button type="submit" className="talent-onboarding-submit">
          <span>{t('onboarding.buildJourney')}</span>
          <Icon name="arrow" size={19} />
        </button>
      </form>
    </div>
  );
}
