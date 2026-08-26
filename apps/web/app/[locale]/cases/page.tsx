import Link from 'next/link';
import type { CaseDetailDto } from '@probash/contracts';
import { tryAuthed } from '@/lib/api';
import { date } from '@/lib/format';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { getChatGPTUser, chatGPTSignInPath } from '@/app/chatgpt-auth';
import { getWorkspace } from '@/db/operations';
import { Badge, ButtonLink, Card, Grid, Section } from '@probash/web-ui';
import { startBlankJourneyAction } from '../operational-actions';

export const dynamic = 'force-dynamic';

export default async function CasesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);

  const user = await getChatGPTUser();
  if (user) {
    const workspace = await getWorkspace(user.userId);
    return (
      <>
        <Section
          surface="warm"
          headingLevel={1}
          eyebrow={t('operations.protected')}
          title={t('case.title')}
          lead={t('case.operationalLead')}
        >
          <div className="hub-actions">
            <form action={startBlankJourneyAction}>
              <input type="hidden" name="locale" value={seg} />
              <input type="hidden" name="path" value="work" />
              <button type="submit" className="btn btn-primary">
                {t('workspace.startWorkJourney')}
              </button>
            </form>
            <form action={startBlankJourneyAction}>
              <input type="hidden" name="locale" value={seg} />
              <input type="hidden" name="path" value="study" />
              <button type="submit" className="btn btn-secondary">
                {t('workspace.startStudyJourney')}
              </button>
            </form>
          </div>
        </Section>
        <Section surface="default" title={t('case.activeJourneys')}>
          {workspace.journeys.length === 0 ? <p>{t('case.noJourneys')}</p> : null}
          <Grid min={320}>
            {workspace.journeys.map((journey) => {
              const done = journey.tasks.filter((task) => task.status === 'done').length;
              return (
                <Card key={journey.id}>
                  <Badge tone={journey.path === 'work' ? 'info' : 'neutral'}>
                    {t(journey.path === 'work' ? 'intent.work' : 'intent.study')}
                  </Badge>
                  <h2 className="card-title">{journey.title}</h2>
                  {journey.destinationCountry ? <p>{journey.destinationCountry}</p> : null}
                  <p className="muted">
                    {t('case.step', { current: done, total: journey.tasks.length })}
                  </p>
                  <div className="progress-bar" aria-label={t('case.progress')}>
                    <span
                      style={{
                        width: `${journey.tasks.length ? (done / journey.tasks.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <ButtonLink href={`/${seg}/cases/${journey.id}`} variant="outline">
                    {t('common.continue')}
                  </ButtonLink>
                </Card>
              );
            })}
          </Grid>
        </Section>
      </>
    );
  }

  const cases = await tryAuthed<CaseDetailDto[]>('/api/v1/cases');

  if (!cases) {
    return (
      <section className="card stack">
        <h1 style={{ fontWeight: 700 }}>{t('case.title')}</h1>
        <p>{t('onboarding.phoneHelp')}</p>
        <Link href={chatGPTSignInPath(`/${seg}/cases`)} className="btn btn-primary">
          {t('case.signIn')}
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
