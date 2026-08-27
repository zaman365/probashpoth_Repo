import Link from 'next/link';
import type { Locale } from '@probash/domain';
import { Container, Icon, LogoMark } from '@probash/web-ui';
import { localeSegment, translator } from '@/lib/i18n';

/** A curated public site map; the complete route directory lives in the mobile menu. */
export function SiteFooter({ locale, productName }: { locale: Locale; productName: string }) {
  const t = translator(locale);
  const seg = localeSegment(locale);

  const columns = [
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
        { href: `/${seg}/countries`, label: t('guide.countriesTitle') },
        { href: `/${seg}/occupations`, label: t('guide.occupationsTitle') },
        { href: `/${seg}/safety`, label: t('guide.safetyTitle') },
        { href: `/${seg}/explore`, label: t('home.howMuchCost') },
        { href: `/${seg}/services`, label: t('nav.services') },
        { href: `/${seg}/outcomes`, label: t('outcomeIntelligence.title') },
        { href: `/${seg}/trust`, label: t('unified.trustCenter') },
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
        { href: `/${seg}/legal`, label: t('site.legalTitle') },
        { href: `/${seg}/help`, label: t('common.help') },
      ],
    },
  ];

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
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2>{column.title}</h2>
              <ul>
                {column.links.map((link) => (
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
