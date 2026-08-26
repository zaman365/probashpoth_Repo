import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Badge, ButtonLink, Icon } from '@probash/web-ui';
import { chatGPTSignInPath, getChatGPTUser } from '@/app/chatgpt-auth';
import { getProfile } from '@/db/operations';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { evaluateScholarship, scholarshipById, scholarshipText } from '@/lib/scholarships';
import { canonicalMetadata } from '@/lib/seo';
import { createOperationalJourneyAction } from '../../operational-actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = parseLocaleParam(segment);
  const scholarship = scholarshipById(id);
  if (!scholarship) return {};
  return canonicalMetadata({
    locale,
    path: `/scholarships/${id}`,
    title: scholarshipText(scholarship.name, locale),
    description: scholarshipText(scholarship.summary, locale),
  });
}

export default async function ScholarshipDetail({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: segment, id } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const scholarship = scholarshipById(id);
  if (!scholarship) notFound();

  const user = await getChatGPTUser();
  const profile = user ? await getProfile(user.userId) : null;
  const match = evaluateScholarship(scholarship, profile?.passport);

  return (
    <div className="scholarship-detail wide-page">
      <Link href={`/${seg}/scholarships`} className="scholarship-back-link">
        ← {t('scholarships.backToResults')}
      </Link>

      <section className="scholarship-detail-hero">
        <div>
          <div className="scholarship-detail-badges">
            <Badge tone="info">{scholarshipText(scholarship.destinationLabel, locale)}</Badge>
            <Badge tone={scholarship.cycle === 'closed' ? 'warning' : 'success'}>
              {t(`scholarships.cycle.${scholarship.cycle}`)}
            </Badge>
          </div>
          <small>{scholarshipText(scholarship.provider, locale)}</small>
          <h1>{scholarshipText(scholarship.name, locale)}</h1>
          <p>{t('scholarships.detailLead')}</p>
          <div className="hub-actions">
            <a
              href={scholarship.officialUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              {t('scholarships.officialSource')} <Icon name="arrow" size={18} />
            </a>
            <ButtonLink href={`/${seg}/passport`} variant="outline">
              {t('scholarships.updatePassport')}
            </ButtonLink>
          </div>
        </div>

        <aside className={`scholarship-fit-card ${match.state}`}>
          <span>
            {profile ? t(`scholarships.match.${match.state}`) : t('scholarships.noProfile')}
          </span>
          <strong>{profile ? `${match.score}%` : '—'}</strong>
          <small>{t('scholarships.score')}</small>
          {profile ? (
            <dl>
              <div>
                <dt>{t('scholarships.match.ready')}</dt>
                <dd>{match.ready.length}</dd>
              </div>
              <div>
                <dt>{t('scholarships.match.missing')}</dt>
                <dd>{match.missing.length}</dd>
              </div>
              <div>
                <dt>{t('scholarships.match.unknownFactor')}</dt>
                <dd>{match.unknown.length}</dd>
              </div>
            </dl>
          ) : null}
        </aside>
      </section>

      <section className="scholarship-fact-band">
        <article>
          <small>{t('scholarships.fundingFilter')}</small>
          <strong>{t(`scholarships.${scholarship.fundingType}`)}</strong>
          <p>{scholarshipText(scholarship.amount, locale)}</p>
        </article>
        <article>
          <small>{t('scholarships.deadline')}</small>
          <strong>{scholarshipText(scholarship.applicationWindow, locale)}</strong>
          <p>{t(`scholarships.cycle.${scholarship.cycle}`)}</p>
        </article>
        <article>
          <small>{t('scholarships.degree')}</small>
          <strong>{scholarship.degrees.map((degree) => degree.toUpperCase()).join(' · ')}</strong>
          <p>{scholarshipText(scholarship.fields, locale)}</p>
        </article>
      </section>

      <div className="scholarship-detail-grid">
        <section className="scholarship-detail-panel">
          <header>
            <span className="scholarship-step-mark">
              <Icon name="money" size={20} />
            </span>
            <h2>{t('scholarships.coverage')}</h2>
          </header>
          <ul>
            {scholarship.coverage.map((item) => (
              <li key={item.en}>
                <Icon name="check" size={17} />
                <span>{scholarshipText(item, locale)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="scholarship-detail-panel">
          <header>
            <span className="scholarship-step-mark">
              <Icon name="route" size={20} />
            </span>
            <h2>{t('scholarships.applicationRoute')}</h2>
          </header>
          <p>{scholarshipText(scholarship.route, locale)}</p>
          <small>{t('scholarships.lastVerified', { date: scholarship.lastVerified })}</small>
        </section>
      </div>

      <section className="scholarship-factor-section">
        <header>
          <div>
            <p className="scholarship-kicker">{t('scholarships.profileTitle')}</p>
            <h2>{t('scholarships.criteria')}</h2>
          </div>
          <p>{t('scholarships.profileLead')}</p>
        </header>
        {profile ? (
          <div className="scholarship-factor-list">
            {match.factors.map((item) => (
              <article key={item.id} className={item.state}>
                <span>
                  <Icon name={item.state === 'ready' ? 'check' : 'warning'} size={18} />
                </span>
                <div>
                  <small>
                    {t(
                      item.state === 'unknown'
                        ? 'scholarships.match.unknownFactor'
                        : `scholarships.match.${item.state}`,
                    )}
                  </small>
                  <h3>{scholarshipText(item.label, locale)}</h3>
                  {item.state !== 'ready' ? <p>{scholarshipText(item.action, locale)}</p> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="scholarship-profile-empty">
            <p>{t('scholarships.noProfile')}</p>
            <ButtonLink href={`/${seg}/passport`}>{t('passport.startPassport')}</ButtonLink>
          </div>
        )}
      </section>

      <section className="scholarship-preparation-section">
        <div>
          <p className="scholarship-kicker">{t('journey.nextBestAction')}</p>
          <h2>{t('scholarships.prepare')}</h2>
          <ol>
            {scholarship.preparation.map((item, index) => (
              <li key={item.en}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{scholarshipText(item, locale)}</strong>
              </li>
            ))}
          </ol>
        </div>
        <aside>
          <Icon name="shield" size={24} />
          <p>{t('scholarships.sourceNotice')}</p>
          {user ? (
            <form action={createOperationalJourneyAction}>
              <input type="hidden" name="locale" value={seg} />
              <input type="hidden" name="path" value="study" />
              <input type="hidden" name="targetType" value="scholarship" />
              <input type="hidden" name="targetId" value={scholarship.id} />
              <input type="hidden" name="title" value={scholarshipText(scholarship.name, locale)} />
              <input type="hidden" name="destinationCountry" value={scholarship.destinations[0]} />
              <button type="submit" className="btn btn-primary">
                {t('scholarships.startJourney')}
              </button>
            </form>
          ) : (
            <Link
              href={chatGPTSignInPath(`/${seg}/scholarships/${scholarship.id}`)}
              className="btn btn-primary"
            >
              {t('scholarships.signInJourney')}
            </Link>
          )}
        </aside>
      </section>
    </div>
  );
}
