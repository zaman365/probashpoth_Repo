'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@probash/domain';

export type BreadcrumbLabels = {
  navigation: string;
  home: string;
  currentPage: string;
  countryDetails: string;
  jobDetails: string;
  occupationDetails: string;
  pathwayDetails: string;
  programmeDetails: string;
  scholarshipDetails: string;
  verificationResult: string;
  routes: Record<string, string>;
};

type BreadcrumbItem = {
  href?: string;
  label: string;
};

const PORTAL_ROUTES = new Set([
  'account',
  'alerts',
  'cases',
  'dashboard',
  'documents',
  'family',
  'materials',
  'money',
  'onboarding',
  'passport',
  'prepare',
]);

function localizedCountryName(code: string, locale: Locale, fallback: string): string {
  if (!/^[a-z]{2}$/i.test(code)) return fallback;

  try {
    return (
      new Intl.DisplayNames(locale === 'en' ? ['en'] : ['bn'], { type: 'region' }).of(
        code.toUpperCase(),
      ) ?? fallback
    );
  } catch {
    return fallback;
  }
}

function publicTrail(
  segments: string[],
  locale: Locale,
  localeSegment: 'bn' | 'en',
  labels: BreadcrumbLabels,
): BreadcrumbItem[] {
  const [section, second, third] = segments;
  const home: BreadcrumbItem = { href: `/${localeSegment}`, label: labels.home };
  const sectionLabel = section ? labels.routes[section] : undefined;

  if (!section || !sectionLabel) {
    return [{ ...home }, { label: labels.currentPage }];
  }

  const sectionItem: BreadcrumbItem = {
    href: `/${localeSegment}/${section}`,
    label: sectionLabel,
  };

  if (segments.length === 1) return [home, { label: sectionLabel }];

  if (section === 'countries' && second) {
    return [
      home,
      sectionItem,
      { label: localizedCountryName(second, locale, labels.countryDetails) },
    ];
  }

  if (section === 'jobs' && second) {
    return [home, sectionItem, { label: labels.jobDetails }];
  }

  if (section === 'occupations' && second) {
    return [home, sectionItem, { label: labels.occupationDetails }];
  }

  if (section === 'scholarships' && second) {
    return [home, sectionItem, { label: labels.scholarshipDetails }];
  }

  // These detail routes do not have a matching public index. Point their parent
  // breadcrumb at the closest real discovery page so the trail never leads to a 404.
  if (section === 'routes' && second) {
    return [
      home,
      {
        href: `/${localeSegment}/explore`,
        label: labels.routes['explore'] ?? labels.currentPage,
      },
      { label: labels.pathwayDetails },
    ];
  }

  if (section === 'programs' && second) {
    return [
      home,
      { href: `/${localeSegment}/study`, label: labels.routes['study'] ?? labels.currentPage },
      { label: labels.programmeDetails },
    ];
  }

  if (section === 'verify' && second === 'job' && third) {
    return [home, sectionItem, { label: labels.verificationResult }];
  }

  return [home, sectionItem, { label: labels.currentPage }];
}

export function SiteBreadcrumbs({ locale, labels }: { locale: Locale; labels: BreadcrumbLabels }) {
  const pathname = usePathname();
  const localeSegment = locale === 'en' ? 'en' : 'bn';
  const segments = pathname
    .split('/')
    .filter(Boolean)
    .slice(1)
    .map((segment) => decodeURIComponent(segment));

  if (segments.length === 0 || PORTAL_ROUTES.has(segments[0] ?? '')) return null;

  const items = publicTrail(segments, locale, localeSegment, labels);

  return (
    <nav className="site-breadcrumbs" aria-label={labels.navigation}>
      <ol itemScope itemType="https://schema.org/BreadcrumbList">
        {items.map((item, index) => {
          const current = index === items.length - 1;

          return (
            <li
              key={`${item.href ?? 'current'}-${index}`}
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              {index > 0 ? (
                <svg className="site-breadcrumbs__separator" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="m6 3 5 5-5 5" />
                </svg>
              ) : null}
              {current || !item.href ? (
                <span
                  className="site-breadcrumbs__current"
                  aria-current={current ? 'page' : undefined}
                  itemProp="name"
                >
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} itemProp="item">
                  <span itemProp="name">{item.label}</span>
                </Link>
              )}
              <meta itemProp="position" content={String(index + 1)} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
