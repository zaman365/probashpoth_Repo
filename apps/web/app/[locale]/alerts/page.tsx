import type { Metadata } from 'next';
import { Badge, ButtonLink, Card, Grid, Section, Stat, StatGroup } from '@probash/web-ui';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { getWorkspace } from '@/db/operations';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { canonicalMetadata } from '@/lib/seo';
import { markAlertReadAction } from '../operational-actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const t = translator(locale);
  return canonicalMetadata({
    locale,
    path: '/alerts',
    title: t('operations.alertsTitle'),
    description: t('operations.alertsLead'),
  });
}

export default async function AlertsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const user = await requireChatGPTUser(`/${seg}/alerts`);
  const workspace = await getWorkspace(user.userId);
  const datedRecords = workspace.records.filter((record) => record.dueAt);

  return (
    <>
      <Section
        surface="warm"
        headingLevel={1}
        eyebrow={t('operations.protected')}
        title={t('operations.alertsTitle')}
        lead={t('operations.alertsLead')}
      >
        <StatGroup>
          <Stat label={t('operations.unread')} value={String(workspace.unreadAlerts)} />
          <Stat label={t('operations.deadline')} value={String(datedRecords.length)} />
          <Stat label={t('os.activeCases')} value={String(workspace.journeys.length)} />
        </StatGroup>
      </Section>
      <Section surface="default" title={t('operations.alertsTitle')}>
        {workspace.alerts.length === 0 && datedRecords.length === 0 ? (
          <Card tone="muted">
            <p>{t('operations.noAlerts')}</p>
          </Card>
        ) : null}
        <Grid min={320}>
          {workspace.alerts.map((alert) => (
            <Card key={alert.id}>
              <Badge
                tone={alert.readAt ? 'neutral' : alert.severity === 'critical' ? 'danger' : 'info'}
              >
                {alert.readAt ? t('operations.read') : t('operations.unread')}
              </Badge>
              <h2 className="card-title">{alert.title}</h2>
              <p>{alert.body}</p>
              {alert.journeyId ? (
                <ButtonLink href={`/${seg}/cases/${alert.journeyId}`} variant="outline">
                  {t('common.continue')}
                </ButtonLink>
              ) : null}
              {!alert.readAt ? (
                <form action={markAlertReadAction}>
                  <input type="hidden" name="locale" value={seg} />
                  <input type="hidden" name="alertId" value={alert.id} />
                  <button type="submit" className="btn btn-ghost">
                    {t('operations.markRead')}
                  </button>
                </form>
              ) : null}
            </Card>
          ))}
          {datedRecords.map((record) => (
            <Card key={`deadline:${record.id}`}>
              <Badge tone="warning">{t('operations.deadline')}</Badge>
              <h2 className="card-title">{record.title}</h2>
              <p>{record.dueAt}</p>
              <ButtonLink href={`/${seg}/cases/${record.journeyId}`} variant="outline">
                {t('common.continue')}
              </ButtonLink>
            </Card>
          ))}
        </Grid>
      </Section>
    </>
  );
}
