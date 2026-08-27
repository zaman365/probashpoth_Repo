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
    { href: `/${seg}/work`, label: t('nav.work') },
    { href: `/${seg}/study`, label: t('nav.study') },
    { href: `/${seg}/countries`, label: t('nav.countries') },
    { href: `/${seg}/occupations`, label: t('nav.occupations') },
    { href: `/${seg}/safety`, label: t('nav.safety') },
    {
      href: `/${seg}/verify`,
      label: t('home.verifyOffer'),
      icon: 'verify' as const,
    },
  ];

  const mobileGroups = [
    {
      title: t('site.footerProduct'),
      links: [
        { href: `/${seg}/quick-check`, label: t('unified.quickCheck') },
        { href: `/${seg}/work`, label: t('intent.work') },
        { href: `/${seg}/study`, label: t('intent.study') },
        { href: `/${seg}/jobs`, label: t('home.findWork') },
        { href: `/${seg}/scholarships`, label: t('scholarships.nav') },
        { href: `/${seg}/verify`, label: t('home.verifyOffer') },
      ],
    },
    {
      title: t('site.footerGuides'),
      links: [
        { href: `/${seg}/countries`, label: t('guide.browseCountries') },
        { href: `/${seg}/occupations`, label: t('guide.browseOccupations') },
        { href: `/${seg}/safety`, label: t('guide.learnSafety') },
        { href: `/${seg}/explore`, label: t('home.howMuchCost') },
        { href: `/${seg}/services`, label: t('nav.services') },
        { href: `/${seg}/outcomes`, label: t('outcomeIntelligence.title') },
      ],
    },
    {
      title: t('unified.mobilityServices'),
      links: [
        { href: `/${seg}/visa`, label: t('unified.visa') },
        { href: `/${seg}/departure`, label: t('unified.departure') },
        { href: `/${seg}/arrival`, label: t('unified.arrival') },
        { href: `/${seg}/intelligence`, label: t('unified.intelligence') },
        { href: `/${seg}/learn`, label: t('unified.learn') },
        { href: `/${seg}/advisors`, label: t('unified.advisors') },
        { href: `/${seg}/events`, label: t('unified.events') },
        { href: `/${seg}/community`, label: t('unified.community') },
        { href: `/${seg}/return`, label: t('unified.return') },
        { href: `/${seg}/mobility-services`, label: t('unified.mobilityServices') },
      ],
    },
    {
      title: t('unified.trustCenter'),
      links: [
        { href: `/${seg}/trust`, label: t('unified.trustCenter') },
        { href: `/${seg}/official-actions`, label: t('unified.officialActions') },
      ],
    },
    {
      title: t('site.footerOrganizations'),
      links: [
        { href: `/${seg}/for-employers`, label: t('site.orgEmployers') },
        { href: `/${seg}/for-agencies`, label: t('site.orgAgencies') },
        { href: `/${seg}/for-government`, label: t('site.orgGovernment') },
        { href: `/${seg}/partners`, label: t('supply.title') },
      ],
    },
    {
      title: t('site.footerAbout'),
      links: [
        { href: `/${seg}/about`, label: t('site.aboutTitle') },
        { href: `/${seg}/how-it-works`, label: t('site.howItWorksTitle') },
        { href: `/${seg}/faq`, label: t('site.faqPageTitle') },
        { href: `/${seg}/help`, label: t('common.help') },
      ],
    },
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
            <Link href={`/${seg}/quick-check`} className="site-header-quickcheck">
              <Icon name="search" size={18} />
              <span>{t('unified.quickCheck')}</span>
            </Link>
            <Link
              href={`/${localeSegment(target)}`}
              className="site-language-switch"
              hrefLang={localeSegment(target)}
            >
              <Icon name="globe" size={18} />
              <span>
                {target === 'en' ? t('common.switchToEnglish') : t('common.switchToBangla')}
              </span>
            </Link>
            <AccountControl locale={locale} user={user} profile={profile} />

            <details className="site-nav-mobile">
              <summary aria-label={t('common.menu')}>
                <Icon name="menu" size={22} />
                <span>{t('common.menu')}</span>
              </summary>
              <div className="site-nav-mobile-panel">
                <div className="site-nav-mobile-intro">
                  <strong>{productName}</strong>
                  <span>{t('site.tagline')}</span>
                </div>
                <nav aria-label={t('common.menu')}>
                  {mobileGroups.map((group) => (
                    <section key={group.title}>
                      <h2>{group.title}</h2>
                      <div>
                        {group.links.map((link) => (
                          <Link key={link.href} href={link.href}>
                            {link.label}
                            <Icon name="arrow" size={16} />
                          </Link>
                        ))}
                      </div>
                    </section>
                  ))}
                </nav>
              </div>
            </details>
          </div>
        </div>

        <OfflineBanner label={t('common.offline')} />
      </Container>
    </header>
  );
}
