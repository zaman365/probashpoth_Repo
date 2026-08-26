import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { Icon, LogoMark, type IconName } from '@probash/web-ui';
import type { ChatGPTUser } from '@/app/chatgpt-auth';
import type { OperationalProfile } from '@/db/operations';
import { localeSegment, translator, type Locale } from '@/lib/i18n';
import { switchActiveWorkspaceAction } from '@/app/[locale]/operational-actions';
import { DismissibleDetails } from './DismissibleDetails';

type WorkspaceDestination = 'dashboard' | 'account';

interface RailItem {
  href: string;
  icon: IconName;
  label: string;
  active?: boolean;
  badge?: string;
}

interface RailGroup {
  label: string;
  items: RailItem[];
}

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

function RailNavigation({ groups, label }: { groups: RailGroup[]; label: string }) {
  return (
    <nav className="journey-rail-navigation" aria-label={label}>
      {groups.map((group) => (
        <section className="journey-rail-group" key={group.label}>
          <h2>{group.label}</h2>
          <div>
            {group.items.map((item) => (
              <Link
                key={`${group.label}-${item.href}`}
                href={item.href}
                className={item.active ? 'active' : undefined}
                aria-current={item.active ? 'page' : undefined}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
                {item.badge ? <small>{item.badge}</small> : null}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </nav>
  );
}

export function JourneyWorkspaceShell({
  active,
  children,
  locale,
  needsCount = 0,
  profile,
  progress = 0,
  user,
}: {
  active: WorkspaceDestination;
  children: ReactNode;
  locale: Locale;
  needsCount?: number;
  profile: OperationalProfile;
  progress?: number;
  user: ChatGPTUser;
}) {
  const t = translator(locale);
  const seg = localeSegment(locale);
  const path = profile.activePath === 'study' ? 'study' : 'work';
  const enabledPaths = new Set(profile.enabledPaths);
  const boundedProgress = Math.max(0, Math.min(100, progress));
  const dashboardHref = `/${seg}/dashboard`;
  const groups: RailGroup[] = [
    {
      label: t('workspaceNav.journey'),
      items: [
        {
          href: dashboardHref,
          icon: 'route',
          label: t('nav.dashboard'),
          active: active === 'dashboard',
        },
        {
          href: `${dashboardHref}#journey-attention`,
          icon: 'warning',
          label: t('journey.needsYou'),
          badge: needsCount > 0 ? String(needsCount) : undefined,
        },
        {
          href: `${dashboardHref}#journey-chapters`,
          icon: 'check',
          label: t('workspaceNav.chapters'),
        },
      ],
    },
    {
      label: t('workspaceNav.prepare'),
      items: [
        { href: `/${seg}/passport`, icon: 'document', label: t('passport.title') },
        {
          href: `/${seg}/${path}`,
          icon: path,
          label: t(path === 'work' ? 'intent.work' : 'intent.study'),
        },
        { href: `/${seg}/countries`, icon: 'globe', label: t('nav.countries') },
      ],
    },
    {
      label: t('workspaceNav.opportunities'),
      items: [
        {
          href: `${dashboardHref}#journey-opportunities`,
          icon: 'search',
          label: t('workspaceNav.matches'),
        },
        path === 'work'
          ? { href: `/${seg}/jobs`, icon: 'work', label: t('workspaceNav.jobs') }
          : {
              href: `/${seg}/study#study-programmes`,
              icon: 'study',
              label: t('workspaceNav.programmes'),
            },
        {
          href: path === 'work' ? `/${seg}/occupations` : `/${seg}/scholarships`,
          icon: path === 'work' ? 'work' : 'money',
          label: t(path === 'work' ? 'guide.browseOccupations' : 'scholarships.nav'),
        },
      ],
    },
    {
      label: t('workspaceNav.records'),
      items: [
        { href: `/${seg}/documents`, icon: 'document', label: t('workspace.documents') },
        { href: `/${seg}/money`, icon: 'money', label: t('workspace.money') },
        { href: `/${seg}/verify`, icon: 'verify', label: t('workspace.review') },
        {
          href: `/${seg}/alerts`,
          icon: 'warning',
          label: t('operations.alertsTitle'),
        },
      ],
    },
    {
      label: t('workspaceNav.support'),
      items: [
        { href: `/${seg}/family`, icon: 'family', label: t('workspace.family') },
        { href: `/${seg}/help`, icon: 'phone', label: t('common.help') },
        {
          href: `/${seg}/account`,
          icon: 'shield',
          label: t('account.myAccount'),
          active: active === 'account',
        },
      ],
    },
  ];
  const pathLabel = t(path === 'work' ? 'account.workTalent' : 'account.studyTalent');
  const alternateLocale = seg === 'bn' ? 'en' : 'bn';
  const progressStyle = {
    '--journey-rail-progress': `${boundedProgress}%`,
  } as CSSProperties;

  const workspaceHead = (
    <Link href={dashboardHref} className="journey-rail-head">
      <LogoMark size={38} />
      <span>
        <small>{t('workspaceNav.privateWorkspace')}</small>
        <strong>{t('workspaceNav.talentWorkspace')}</strong>
      </span>
    </Link>
  );

  const workspaceProgress = (
    <section className="journey-rail-progress" aria-label={t('workspaceNav.progress')}>
      <header>
        <span>{t('workspaceNav.progress')}</span>
        <strong>{boundedProgress}%</strong>
      </header>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={boundedProgress}
        style={progressStyle}
      >
        <span />
      </div>
      <p>{t('workspaceNav.progressHelp')}</p>
    </section>
  );

  const accountCard = (
    <Link
      href={`/${seg}/account`}
      className={`journey-rail-account${active === 'account' ? ' active' : ''}`}
    >
      <span className="journey-rail-avatar" aria-hidden="true">
        {initials(user)}
      </span>
      <span>
        <strong>{user.displayName}</strong>
        <small>{pathLabel}</small>
      </span>
      <b aria-hidden="true">→</b>
    </Link>
  );

  const workspaceSwitcher = (
    <form
      action={switchActiveWorkspaceAction}
      className="journey-rail-path-switcher"
      aria-label={t('workspaceNav.switchWorkspace')}
    >
      <input type="hidden" name="locale" value={seg} />
      <input type="hidden" name="returnTo" value={`/${seg}/${active}`} />
      {(['work', 'study'] as const).map((workspacePath) => {
        const isEnabled = enabledPaths.has(workspacePath);
        const isActive = path === workspacePath;
        const label = t(workspacePath === 'work' ? 'account.workTalent' : 'account.studyTalent');
        return isEnabled ? (
          <button
            key={workspacePath}
            type="submit"
            name="path"
            value={workspacePath}
            className={isActive ? 'active' : undefined}
            aria-pressed={isActive}
            disabled={isActive}
          >
            <Icon name={workspacePath} size={16} />
            <span>{label}</span>
          </button>
        ) : (
          <Link
            key={workspacePath}
            href={`/${seg}/account#journey-settings`}
            className="disabled"
            title={t('workspaceNav.enableWorkspace')}
          >
            <Icon name={workspacePath} size={16} />
            <span>{label}</span>
            <b aria-hidden="true">+</b>
          </Link>
        );
      })}
    </form>
  );

  return (
    <div className={`journey-workspace-shell wide-page journey-rail-${path}`}>
      <header className="journey-workspace-toolbar">
        <div className="journey-toolbar-brand">{workspaceHead}</div>
        <Link href={`/${seg}`} className="journey-toolbar-context journey-toolbar-home">
          <span aria-hidden="true">
            <Icon name="globe" size={18} />
          </span>
          <span>
            <strong>{t('workspaceNav.publicSite')}</strong>
          </span>
        </Link>
        <nav className="journey-toolbar-actions" aria-label={t('workspaceNav.toolbarLabel')}>
          <span className="journey-toolbar-vacancy" aria-hidden="true" />
          <DismissibleDetails className="journey-toolbar-help">
            <summary className="journey-toolbar-link">
              <Icon name="phone" size={18} />
              <span>{t('common.help')}</span>
              <span className="journey-help-chevron" aria-hidden="true" />
            </summary>
            <div className="journey-help-menu" data-dismiss-details>
              <header>
                <small>{t('workspaceNav.support')}</small>
                <strong>{t('workspaceNav.chooseContact')}</strong>
              </header>
              <Link href={`/${seg}/help?channel=ai#support-form`} className="journey-help-option">
                <span>
                  <Icon name="chat" size={19} />
                </span>
                <span>
                  <strong>{t('workspaceNav.aiChat')}</strong>
                  <small>{t('workspaceNav.aiChatHelp')}</small>
                </span>
                <b aria-hidden="true">→</b>
              </Link>
              <Link
                href={`/${seg}/help?channel=whatsapp#support-form`}
                className="journey-help-option whatsapp"
              >
                <span>
                  <Icon name="phone" size={19} />
                </span>
                <span>
                  <strong>{t('workspaceNav.whatsapp')}</strong>
                  <small>{t('workspaceNav.whatsappHelp')}</small>
                </span>
                <b aria-hidden="true">→</b>
              </Link>
              <Link href={`/${seg}/help#support-form`} className="journey-help-option">
                <span>
                  <Icon name="document" size={19} />
                </span>
                <span>
                  <strong>{t('workspaceNav.contactForm')}</strong>
                  <small>{t('workspaceNav.contactFormHelp')}</small>
                </span>
                <b aria-hidden="true">→</b>
              </Link>
            </div>
          </DismissibleDetails>
          <Link
            href={`/${alternateLocale}/${active}`}
            className="journey-toolbar-language"
            aria-label={t(seg === 'bn' ? 'common.switchToEnglish' : 'common.switchToBangla')}
          >
            <Icon name="globe" size={17} />
            <span>{t(seg === 'bn' ? 'common.switchToEnglish' : 'common.switchToBangla')}</span>
          </Link>
          <Link
            href={`/${seg}/account`}
            className={`journey-toolbar-account${active === 'account' ? ' active' : ''}`}
            aria-current={active === 'account' ? 'page' : undefined}
          >
            <span className="journey-rail-avatar" aria-hidden="true">
              {initials(user)}
            </span>
            <span>
              <strong>{user.displayName}</strong>
              <small>{t('account.myAccount')}</small>
            </span>
          </Link>
        </nav>
      </header>

      <aside className="journey-workspace-sidebar">
        {workspaceSwitcher}
        <RailNavigation groups={groups} label={t('workspaceNav.navigation')} />
        {workspaceProgress}
        {accountCard}
      </aside>

      <details className="journey-workspace-mobile-nav">
        <summary>
          <Icon name="menu" size={20} />
          <span>{t('workspaceNav.openNavigation')}</span>
          <small>{pathLabel}</small>
        </summary>
        <div className="journey-workspace-mobile-panel">
          {workspaceSwitcher}
          <RailNavigation groups={groups} label={t('workspaceNav.navigation')} />
          {workspaceProgress}
          {accountCard}
        </div>
      </details>

      <div className="journey-workspace-content">{children}</div>
    </div>
  );
}
