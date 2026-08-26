import Link from 'next/link';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';

/**
 * §31 — preparation. The learning content itself is a later epic; what ships here is
 * the honest entry point, not a fake course catalogue.
 */
export default async function PreparePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);

  return (
    <>
      <h1 style={{ fontSize: 'var(--font-size-heading)', fontWeight: 700 }}>
        {t('home.howToPrepare')}
      </h1>
      <section className="card stack">
        <p>{t('eligibility.preparation')}</p>
        <Link href={`/${seg}/explore`} className="btn btn-primary">
          {t('route.requirements')}
        </Link>
      </section>
      <p className="badge badge-warning">{t('verification.pending')}</p>
    </>
  );
}
