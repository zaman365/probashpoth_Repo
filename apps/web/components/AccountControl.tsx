import Link from 'next/link';
import type { Locale } from '@probash/domain';
import { Icon } from '@probash/web-ui';
import type { ChatGPTUser } from '@/app/chatgpt-auth';
import { chatGPTSignInPath, chatGPTSignOutPath } from '@/app/chatgpt-auth';
import type { OperationalProfile } from '@/db/operations';
import { localeSegment, translator } from '@/lib/i18n';
import { DismissibleDetails } from './DismissibleDetails';

function initials(user: ChatGPTUser): string {
  return (
    user.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'PJ'
  );
}

export function AccountControl({
  locale,
  user,
  profile,
}: {
  locale: Locale;
  user: ChatGPTUser | null;
  profile: OperationalProfile | null;
}) {
  const t = translator(locale);
  const seg = localeSegment(locale);

  if (!user) {
    return (
      <Link
        href={chatGPTSignInPath(`/${seg}/dashboard`)}
        className="journey-account-cta journey-account-signin journey-cta-guest"
      >
        <span className="nav-account-icon" aria-hidden="true" />
        <strong>{t('nav.dashboard')}</strong>
      </Link>
    );
  }

  const primaryPath =
    profile?.activePath === 'work' || profile?.activePath === 'study' ? profile.activePath : null;

  const journeyTone = primaryPath ?? 'unset';

  return (
    <DismissibleDetails
      className={`account-control journey-account-control journey-cta-${journeyTone}`}
    >
      <summary aria-label={t('account.openMenu')}>
        <Icon
          name={primaryPath === 'study' ? 'study' : primaryPath === 'work' ? 'work' : 'route'}
          size={18}
        />
        <strong>{t('nav.dashboard')}</strong>
        <span className="account-chevron" aria-hidden="true">
          ⌄
        </span>
      </summary>

      <div className="account-menu">
        <div className="account-menu-identity">
          <span className="account-avatar account-avatar-large" aria-hidden="true">
            {initials(user)}
          </span>
          <span>
            <strong>{user.displayName}</strong>
            <small>{user.email}</small>
          </span>
        </div>

        <div className={`account-path-badge ${primaryPath ?? 'unset'}`}>
          <Icon name={primaryPath === 'study' ? 'study' : 'work'} size={18} />
          <span>
            <small>{t('account.primaryJourney')}</small>
            <strong>
              {primaryPath
                ? t(primaryPath === 'work' ? 'account.workTalent' : 'account.studyTalent')
                : t('account.notCategorized')}
            </strong>
          </span>
        </div>

        <nav aria-label={t('account.menuLabel')} data-dismiss-details>
          {!profile?.onboardingCompletedAt ? (
            <Link className="account-menu-highlight" href={`/${seg}/onboarding`}>
              <Icon name="route" size={18} />
              <span>{t('account.completeOnboarding')}</span>
              <span aria-hidden="true">→</span>
            </Link>
          ) : null}
          <Link
            href={`/${seg}/dashboard`}
            className={profile?.onboardingCompletedAt ? 'account-menu-highlight' : undefined}
          >
            <Icon name="route" size={18} />
            <span>{t('nav.dashboard')}</span>
          </Link>
          <Link href={`/${seg}/account`}>
            <Icon name="shield" size={18} />
            <span>{t('account.myAccount')}</span>
          </Link>
          <Link href={`/${seg}/passport`}>
            <Icon name="document" size={18} />
            <span>{t('account.migrationPassport')}</span>
          </Link>
          <Link href={chatGPTSignOutPath(`/${seg}`)}>
            <Icon name="arrow" size={18} />
            <span>{t('account.signOut')}</span>
          </Link>
        </nav>
      </div>
    </DismissibleDetails>
  );
}
