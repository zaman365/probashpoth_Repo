import Link from 'next/link';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { ListenButton } from '@/components/ListenButton';

/**
 * §15 — the worker home screen. Seven large actions, one question, no dashboard.
 * Every tile is text + icon, never icon alone.
 */
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);

  const actions = [
    { href: `/${seg}/jobs`, icon: '🧰', key: 'home.findWork' },
    { href: `/${seg}/explore?purpose=study`, icon: '🎓', key: 'home.findStudy' },
    { href: `/${seg}/verify`, icon: '🔎', key: 'home.verifyOffer' },
    { href: `/${seg}/cases`, icon: '📋', key: 'home.myApplications' },
    { href: `/${seg}/explore`, icon: '💰', key: 'home.howMuchCost' },
    { href: `/${seg}/prepare`, icon: '📚', key: 'home.howToPrepare' },
    { href: `/${seg}/help`, icon: '🆘', key: 'home.getHelp' },
  ];

  return (
    <>
      <section className="stack">
        <h1 style={{ fontSize: 'var(--font-size-heading)', fontWeight: 700 }}>
          {t('home.question')}
        </h1>
        <p className="muted">{t('home.safetyLine')}</p>
        <ListenButton
          text={`${t('home.question')}। ${actions.map((a) => t(a.key)).join('। ')}`}
          label={t('common.listen')}
          lang={locale}
        />
      </section>

      <nav aria-label={t('home.question')} className="stack">
        {actions.map((action) => (
          <Link key={action.key} href={action.href} className="action-tile">
            <span aria-hidden="true" style={{ fontSize: 'var(--font-size-heading)' }}>
              {action.icon}
            </span>
            <span>{t(action.key)}</span>
          </Link>
        ))}
      </nav>

      <section className="card stack">
        <h2 style={{ fontWeight: 600 }}>{t('scanner.title')}</h2>
        <p>{t('scanner.help')}</p>
        <Link href={`/${seg}/verify`} className="btn btn-primary">
          {t('scanner.checkNow')}
        </Link>
      </section>
    </>
  );
}
