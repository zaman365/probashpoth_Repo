import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

/**
 * Anything behind a session — a case, a receipt, a document, the ledger — must never
 * be crawled. The public knowledge surface is explicitly allowed (§14.1, §51).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/bn', '/en'],
        disallow: ['/bn/cases', '/en/cases', '/api/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
