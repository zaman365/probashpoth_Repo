import Link from 'next/link';
import type { Locale } from '@probash/domain';
import { Container, Icon, LogoMark } from '@probash/web-ui';
import { localeSegment, otherLocale, translator } from '@/lib/i18n';
import { OfflineBanner } from './OfflineBanner';
import { AccountControl } from './AccountControl';
import type { ChatGPTUser } from '@/app/chatgpt-auth';
import type { OperationalProfile } from '@/db/operations';
import { buildSiteNavigation } from './siteNavigation';

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

  const navigationGroups = buildSiteNavigation(t, seg);

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
            <details className="site-nav-directory">
              <summary>
                <span>{t('nav.services')}</span>
                <Icon name="arrow" size={15} />
              </summary>
              <div className="site-nav-directory-panel">
                <div className="site-nav-directory-intro">
                  <strong>{productName}</strong>
                  <span>{t('site.tagline')}</span>
                </div>
                <div className="site-nav-directory-groups">
                  {navigationGroups.map((group) => (
                    <section key={group.title}>
                      <h2>{group.title}</h2>
                      <div>
                        {group.links.map((link) => (
                          <Link key={link.href} href={link.href}>
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </details>
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
                  {navigationGroups.map((group) => (
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
