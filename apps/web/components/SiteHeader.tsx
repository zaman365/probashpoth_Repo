import Link from 'next/link';
import type { Locale } from '@probash/domain';
import { Container, Icon, LogoMark } from '@probash/web-ui';
import { localeSegment, otherLocale, translator } from '@/lib/i18n';
import { OfflineBanner } from './OfflineBanner';

/**
 * §14.1 — site chrome. The whole public surface is reachable from every page, and the
 * emergency route is never more than one tap away (§15).
 *
 * The small-screen menu is a `<details>` disclosure: it opens with no JavaScript, so
 * navigation still works on a cheap phone with a failed bundle or a dead connection.
 */
export function SiteHeader({ locale, productName }: { locale: Locale; productName: string }) {
  const t = translator(locale);
  const seg = localeSegment(locale);
  const target = otherLocale(locale);

  /*
   * Short labels in the bar, full ones in the footer and on the pages themselves.
   * Long labels overflowed the pill and were clipped — links that exist but cannot be
   * seen or clicked are worse than links that are not there.
   */
  const links = [
    { href: `/${seg}/countries`, label: t('nav.countries') },
    { href: `/${seg}/occupations`, label: t('nav.occupations') },
    { href: `/${seg}/work`, label: t('nav.work') },
    { href: `/${seg}/study`, label: t('nav.study') },
    { href: `/${seg}/safety`, label: t('nav.safety') },
  ];

  return (
    <header className="site-header no-print">
      <Container width="site">
        <div className="site-header-row">
          <Link href={`/${seg}`} className="site-brand">
            <LogoMark />
            <span>{productName}</span>
          </Link>

          <nav className="site-nav-desktop" aria-label={t('site.tagline')}>
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
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
            <Link href={`/${seg}/help`} className="pui-btn pui-btn-outline pui-btn-md">
              <Icon name="phone" size={20} />
              <span>{t('common.emergency')}</span>
            </Link>
          </div>
        </div>

        <details className="site-nav-mobile">
          <summary>
            <Icon name="menu" size={22} />
            <span>{t('common.menu')}</span>
          </summary>
          <nav aria-label={t('common.menu')}>
            <Link href={`/${seg}/countries`}>{t('guide.browseCountries')}</Link>
            <Link href={`/${seg}/occupations`}>{t('guide.browseOccupations')}</Link>
            <Link href={`/${seg}/work`}>{t('intent.work')}</Link>
            <Link href={`/${seg}/jobs`}>{t('home.findWork')}</Link>
            <Link href={`/${seg}/study`}>{t('home.findStudy')}</Link>
            <Link href={`/${seg}/safety`}>{t('guide.learnSafety')}</Link>
            <Link href={`/${seg}/how-it-works`}>{t('site.howItWorksTitle')}</Link>
            <Link href={`/${seg}/cases`}>{t('home.myApplications')}</Link>
          </nav>
        </details>

        <OfflineBanner label={t('common.offline')} />
      </Container>
    </header>
  );
}
