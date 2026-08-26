import Link from 'next/link';
import type { Locale } from '@probash/domain';
import { Container } from '@probash/web-ui';
import { localeSegment, translator } from '@/lib/i18n';

/** The footer doubles as the site map: every public page is reachable from here. */
export function SiteFooter({ locale, productName }: { locale: Locale; productName: string }) {
  const t = translator(locale);
  const seg = localeSegment(locale);

  const columns = [
    {
      title: t('site.footerProduct'),
      links: [
        { href: `/${seg}/jobs`, label: t('home.findWork') },
        { href: `/${seg}/study`, label: t('home.findStudy') },
        { href: `/${seg}/verify`, label: t('home.verifyOffer') },
        { href: `/${seg}/cases`, label: t('home.myApplications') },
        { href: `/${seg}/prepare`, label: t('home.howToPrepare') },
      ],
    },
    {
      title: t('site.footerGuides'),
      links: [
        { href: `/${seg}/countries`, label: t('guide.countriesTitle') },
        { href: `/${seg}/occupations`, label: t('guide.occupationsTitle') },
        { href: `/${seg}/safety`, label: t('guide.safetyTitle') },
        { href: `/${seg}/explore`, label: t('home.howMuchCost') },
      ],
    },
    {
      title: t('site.footerOrganizations'),
      links: [
        { href: `/${seg}/for-employers`, label: t('site.orgEmployers') },
        { href: `/${seg}/for-agencies`, label: t('site.orgAgencies') },
        { href: `/${seg}/for-government`, label: t('site.orgGovernment') },
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
          <p>{t('site.footerLegalNote')}</p>
          <p>{t('legal.notGovernment')}</p>
          <p>{t('legal.dataUse')}</p>
          <p className="pui-badge pui-badge-warning">{t('common.demoDataWarning')}</p>
        </div>
      </Container>
    </footer>
  );
}
