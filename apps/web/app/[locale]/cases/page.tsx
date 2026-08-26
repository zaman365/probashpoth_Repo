import Link from 'next/link';
import type { CaseDetailDto } from '@probash/contracts';
import { tryAuthed } from '@/lib/api';
import { date } from '@/lib/format';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function CasesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);

  const cases = await tryAuthed<CaseDetailDto[]>('/api/v1/cases');

  if (!cases) {
    return (
      <section className="card stack">
        <h1 style={{ fontWeight: 700 }}>{t('case.title')}</h1>
        <p>{t('onboarding.phoneHelp')}</p>
        <Link href={`/${seg}/onboarding`} className="btn btn-primary">
          {t('onboarding.phoneTitle')}
        </Link>
      </section>
    );
  }

  return (
    <>
      <h1 style={{ fontSize: 'var(--font-size-heading)', fontWeight: 700 }}>{t('case.title')}</h1>
      {cases.length === 0 ? (
        <section className="card stack">
          <p>{t('home.findWork')}</p>
          <Link href={`/${seg}/jobs`} className="btn btn-primary">
            {t('home.findWork')}
          </Link>
        </section>
      ) : null}
      <ul className="stack">
        {cases.map((item) => (
          <li key={item.id} className="card stack">
            <Link href={`/${seg}/cases/${item.id}`} style={{ fontWeight: 700 }}>
              {item.destinationCountry} — {item.state}
            </Link>
            <p className="muted">
              {t('case.step', {
                current: item.tasks.filter((task) => task.status === 'done').length,
                total: item.tasks.length,
              })}
            </p>
            <p className="muted">{date(item.updatedAt, locale)}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
