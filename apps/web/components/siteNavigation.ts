import type { Translate } from '@/lib/i18n';

export type SiteNavigationLink = {
  href: string;
  label: string;
};

export type SiteNavigationGroup = {
  title: string;
  links: SiteNavigationLink[];
};

/**
 * One information architecture for every shared navigation surface.
 * Detail routes remain reachable from their collection page, while every
 * top-level public and account route is represented here exactly once.
 */
export function buildSiteNavigation(t: Translate, seg: 'bn' | 'en'): SiteNavigationGroup[] {
  return [
    {
      title: t('site.footerProduct'),
      links: [
        { href: `/${seg}/quick-check`, label: t('unified.quickCheck') },
        { href: `/${seg}/work`, label: t('intent.work') },
        { href: `/${seg}/jobs`, label: t('home.findWork') },
        { href: `/${seg}/study`, label: t('intent.study') },
        { href: `/${seg}/scholarships`, label: t('scholarships.nav') },
        { href: `/${seg}/countries`, label: t('guide.browseCountries') },
        { href: `/${seg}/occupations`, label: t('guide.browseOccupations') },
        { href: `/${seg}/explore`, label: t('home.howMuchCost') },
        { href: `/${seg}/prepare`, label: t('home.howToPrepare') },
      ],
    },
    {
      title: t('unified.mobilityServices'),
      links: [
        { href: `/${seg}/services`, label: t('nav.services') },
        { href: `/${seg}/mobility-services`, label: t('unified.mobilityServices') },
        { href: `/${seg}/visa`, label: t('unified.visa') },
        { href: `/${seg}/departure`, label: t('unified.departure') },
        { href: `/${seg}/arrival`, label: t('unified.arrival') },
        { href: `/${seg}/intelligence`, label: t('unified.intelligence') },
        { href: `/${seg}/learn`, label: t('unified.learn') },
        { href: `/${seg}/advisors`, label: t('unified.advisors') },
        { href: `/${seg}/events`, label: t('unified.events') },
        { href: `/${seg}/community`, label: t('unified.community') },
        { href: `/${seg}/return`, label: t('unified.return') },
        { href: `/${seg}/outcomes`, label: t('outcomeIntelligence.title') },
      ],
    },
    {
      title: t('unified.trustCenter'),
      links: [
        { href: `/${seg}/safety`, label: t('guide.learnSafety') },
        { href: `/${seg}/verify`, label: t('home.verifyOffer') },
        { href: `/${seg}/trust`, label: t('unified.trustCenter') },
        { href: `/${seg}/official-actions`, label: t('unified.officialActions') },
        { href: `/${seg}/help`, label: t('common.help') },
      ],
    },
    {
      title: t('workspace.toolsTitle'),
      links: [
        { href: `/${seg}/dashboard`, label: t('nav.dashboard') },
        { href: `/${seg}/onboarding`, label: t('account.completeOnboarding') },
        { href: `/${seg}/account`, label: t('account.myAccount') },
        { href: `/${seg}/passport`, label: t('account.migrationPassport') },
        { href: `/${seg}/cases`, label: t('home.myApplications') },
        { href: `/${seg}/documents`, label: t('workspace.documents') },
        { href: `/${seg}/materials`, label: t('materials.title') },
        { href: `/${seg}/money`, label: t('workspace.money') },
        { href: `/${seg}/family`, label: t('workspace.family') },
        { href: `/${seg}/alerts`, label: t('operations.alertsTitle') },
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
      ],
    },
  ];
}
