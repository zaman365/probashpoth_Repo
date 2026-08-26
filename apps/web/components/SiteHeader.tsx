import Link from 'next/link';
import type { Locale } from '@probash/domain';
import { Container, Icon, LogoMark } from '@probash/web-ui';
import { localeSegment, otherLocale, translator } from '@/lib/i18n';
import { OfflineBanner } from './OfflineBanner';
import { AccountControl } from './AccountControl';
import type { ChatGPTUser } from '@/app/chatgpt-auth';
import type { OperationalProfile } from '@/db/operations';

/**
 * §14.1 — site chrome. The whole public surface is reachable from every page, and the
 * emergency route is never more than one tap away (§15).
 *
 * The small-screen menu is a `<details>` disclosure: it opens with no JavaScript, so
 * navigation still works on a cheap phone with a failed bundle or a dead connection.
 */
export function SiteHeader({
  locale,
  productName,
  user,
  profile,
}: {
  locale: Locale;
  productName: string;
  user: ChatGPTUser | null;
  profile: OperationalProfile | null;
}) {
  const t = translator(locale);
  const seg = localeSegment(locale);
  const target = otherLocale(locale);

  /*
   * Short labels in the bar, full ones in the footer and on the pages themselves.
   * Long labels overflowed the pill and were clipped — links that exist but cannot be
   * seen or clicked are worse than links that are not there.
   */
  const links = [
    {
      href: `/${seg}/verify`,
      label: t('home.verifyOffer'),
      icon: 'verify' as const,
    },
    { href: `/${seg}/work`, label: t('nav.work') },
    { href: `/${seg}/study`, label: t('nav.study') },
    { href: `/${seg}/countries`, label: t('nav.countries') },
  ];

  return (
    <header className="site-header no-print">
      <Container width="site">
        <div className="site-header-row">
          <Link href={`/${seg}`} className="site-brand">
            <LogoMark size={40} />
            <span className="site-brand-copy">
              <strong>{productName}</strong>
              <small>{t('site.tagline')}</small>
            </span>
          </Link>

          <nav className="site-nav-desktop" aria-label={t('site.tagline')}>
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.icon ? <Icon name={link.icon} size={17} /> : null}
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          <div className="site-header-actions">
            <Link
              href={`/${localeSegment(target)}`}
              className="pui-btn pui-btn-ghost pui-btn-md"
              hrefLang={localeSegment(target)}
            >
              <Icon name="globe" size={20} />
              <span>
                {target === 'en' ? t('common.switchToEnglish') : t('common.switchToBangla')}
              </span>
            </Link>
            <AccountControl locale={locale} user={user} profile={profile} />
          </div>
        </div>

        <details className="site-nav-mobile">
          <summary>
            <Icon name="menu" size={22} />
            <span>{t('common.menu')}</span>
          </summary>
          <nav aria-label={t('common.menu')}>
            <Link href={`/${seg}/passport`}>{t('passport.title')}</Link>
            <Link href={`/${seg}/countries`}>{t('guide.browseCountries')}</Link>
            <Link href={`/${seg}/occupations`}>{t('guide.browseOccupations')}</Link>
            <Link href={`/${seg}/work`}>{t('intent.work')}</Link>
            <Link href={`/${seg}/jobs`}>{t('home.findWork')}</Link>
            <Link href={`/${seg}/study`}>{t('home.findStudy')}</Link>
            <Link href={`/${seg}/safety`}>{t('guide.learnSafety')}</Link>
            <Link href={`/${seg}/services`}>{t('nav.services')}</Link>
            <Link href={`/${seg}/outcomes`}>{t('outcomeIntelligence.title')}</Link>
            <Link href={`/${seg}/partners`}>{t('supply.title')}</Link>
            <Link href={`/${seg}/how-it-works`}>{t('site.howItWorksTitle')}</Link>
            <Link href={`/${seg}/cases`}>{t('home.myApplications')}</Link>
            <Link href={`/${seg}/documents`}>{t('workspace.documents')}</Link>
            <Link href={`/${seg}/materials`}>{t('materials.title')}</Link>
            <Link href={`/${seg}/money`}>{t('workspace.money')}</Link>
            <Link href={`/${seg}/family`}>{t('workspace.family')}</Link>
            <Link href={`/${seg}/alerts`}>{t('operations.alertsTitle')}</Link>
            <Link href={`/${seg}/verify`}>{t('workspace.review')}</Link>
            <Link href={`/${seg}/help`}>{t('common.help')}</Link>
          </nav>
        </details>

        <OfflineBanner label={t('common.offline')} />
      </Container>
    </header>
  );
}
