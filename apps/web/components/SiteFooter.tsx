import Link from 'next/link';
import type { Locale } from '@probash/domain';
import { Container, Icon, LogoMark } from '@probash/web-ui';
import { localeSegment, translator } from '@/lib/i18n';
import { buildSiteNavigation } from './siteNavigation';

/** Complete, structured route directory shared with the global menus. */
export function SiteFooter({ locale, productName }: { locale: Locale; productName: string }) {
  const t = translator(locale);
  const seg = localeSegment(locale);
  const navigationGroups = buildSiteNavigation(t, seg);

  return (
    <footer className="site-footer no-print">
      <Container width="site">
        <div className="site-footer-intro">
          <div className="site-footer-brand">
            <LogoMark size={46} />
            <span>
              <strong>{productName}</strong>
              <small>{t('site.tagline')}</small>
            </span>
          </div>
          <p>{t('site.footerLegalNote')}</p>
          <Link href={`/${seg}/quick-check`} className="site-footer-cta">
            {t('unified.quickCheck')}
            <Icon name="arrow" size={18} />
          </Link>
        </div>

        <div className="site-footer-columns">
          {navigationGroups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2>{group.title}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="site-footer-legal">
          <p>
            <strong>{productName}</strong> — {t('site.tagline')}
          </p>
          <p>{t('legal.notGovernment')}</p>
          <p>{t('legal.dataUse')}</p>
          <p className="pui-badge pui-badge-warning">{t('common.demoDataWarning')}</p>
        </div>
      </Container>
    </footer>
  );
}
