import Link from 'next/link';
import type { Locale } from '@probash/domain';
import { localeSegment } from '@/lib/i18n';

export interface CapabilitySection {
  title: { bn: string; en: string };
  body: { bn: string; en: string };
  items?: { bn: string; en: string }[];
}

export function CapabilitySurface({
  locale,
  title,
  intro,
  status,
  sections,
}: {
  locale: Locale;
  title: { bn: string; en: string };
  intro: { bn: string; en: string };
  status: 'AVAILABLE' | 'FOUNDATION' | 'PILOT' | 'EXTERNAL_DEPENDENCY';
  sections: CapabilitySection[];
}) {
  const bn = locale === 'bn-BD';
  const seg = localeSegment(locale);
  return (
    <div className="wide-page stack-lg">
      <header className="hero">
        <div className="stack">
          <span className={`badge ${status === 'AVAILABLE' ? 'badge-success' : 'badge-warning'}`}>
            {status}
          </span>
          <h1>{bn ? title.bn : title.en}</h1>
          <p>{bn ? intro.bn : intro.en}</p>
        </div>
      </header>
      <div className="grid-cards">
        {sections.map((section, index) => (
          <section className="card stack" key={`${section.title.en}-${index}`}>
            <h2>{bn ? section.title.bn : section.title.en}</h2>
            <p>{bn ? section.body.bn : section.body.en}</p>
            {section.items ? (
              <ul>
                {section.items.map((item, itemIndex) => (
                  <li key={`${section.title.en}-${itemIndex}`}>{bn ? item.bn : item.en}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link className="btn btn-primary" href={`/${seg}/quick-check`}>
          {bn ? 'দ্রুত যাচাই করুন' : 'Run QuickCheck'}
        </Link>
        <Link className="btn btn-secondary" href={`/${seg}/official-actions`}>
          {bn ? 'সরকারি কাজ দেখুন' : 'View official actions'}
        </Link>
        <Link className="btn btn-secondary" href={`/${seg}/help`}>
          {bn ? 'মানব সহায়তা' : 'Get human help'}
        </Link>
      </div>
    </div>
  );
}
