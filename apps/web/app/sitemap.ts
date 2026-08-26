import type { MetadataRoute } from 'next';
import { apiRequest } from '@/lib/api';
import { siteUrl } from '@/lib/seo';
import type { CountrySummaryDto, OccupationSummaryDto } from '@probash/contracts';

export const dynamic = 'force-dynamic';

/**
 * §14.1 — the public surface is meant to be findable. Only pages that work without an
 * account are listed; case, receipt and document routes are never indexed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = [
    '',
    '/countries',
    '/occupations',
    '/jobs',
    '/study',
    '/verify',
    '/safety',
    '/explore',
    '/how-it-works',
    '/about',
    '/faq',
    '/legal',
    '/for-employers',
    '/for-agencies',
    '/for-government',
  ];

  // A sitemap must never take the site down: if the API is unreachable, the static
  // paths still ship rather than the whole route erroring.
  const listOrEmpty = async <T>(path: string): Promise<T[]> => {
    try {
      return await apiRequest<T[]>(path);
    } catch {
      return [];
    }
  };

  const [countries, occupations] = await Promise.all([
    listOrEmpty<CountrySummaryDto>('/api/v1/countries?withRoutes=true'),
    listOrEmpty<OccupationSummaryDto>('/api/v1/occupations'),
  ]);

  const paths = [
    ...staticPaths,
    ...countries.map((country) => `/countries/${country.code.toLowerCase()}`),
    ...occupations.map((occupation) => `/occupations/${occupation.key}`),
  ];

  return paths.map((path) => ({
    url: `${siteUrl}/bn${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.7,
    alternates: {
      languages: {
        bn: `${siteUrl}/bn${path}`,
        en: `${siteUrl}/en${path}`,
      },
    },
  }));
}
