import type { Metadata } from 'next';
import { Badge, Card, Grid, Section, Stat, StatGroup } from '@probash/web-ui';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { getWorkspace } from '@/db/operations';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { canonicalMetadata } from '@/lib/seo';
import { LedgerEntryForm } from '@/components/OperationalForms';
import { WorkspacePageShell } from '@/components/WorkspacePageShell';

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
    path: '/money',
    title: t('operations.moneyTitle'),
    description: t('operations.moneyLead'),
  });
}

export default async function MoneyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ workspace?: string }>;
}) {
  const { locale: segment } = await params;
  const { workspace: workspaceMode } = await searchParams;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const user = await requireChatGPTUser(`/${seg}/money`);
  const workspace = await getWorkspace(user.userId);
  const journeys = workspace.journeys.map(({ id, title }) => ({ id, title }));
  const totals = new Map<string, number>();
  for (const entry of workspace.ledger)
    totals.set(entry.currency, (totals.get(entry.currency) ?? 0) + entry.amountMinor);

  return (
    <WorkspacePageShell active="money" enabled={workspaceMode === '1'} locale={locale}>
      <>
        <Section
          surface="warm"
          headingLevel={1}
          eyebrow={t('operations.costEyebrow')}
          title={t('operations.moneyTitle')}
          lead={t('operations.moneyLead')}
        >
          <StatGroup>
            <Stat label={t('operations.entries')} value={String(workspace.ledger.length)} />
            <Stat label={t('operations.currencies')} value={String(totals.size)} />
            <Stat
              label={t('operations.unverifiedCosts')}
              value={String(
                workspace.ledger.filter((entry) => entry.status === 'unverified').length,
              )}
            />
          </StatGroup>
        </Section>
        <Section surface="default">
          <Grid min={360}>
            <LedgerEntryForm locale={locale} localeSegment={seg} journeys={journeys} />
            <Card tone="muted">
              <h2 className="card-title">{t('operations.totalsTitle')}</h2>
              {totals.size === 0 ? <p>{t('operations.noCosts')}</p> : null}
              <dl className="stack">
                {[...totals.entries()].map(([currency, amount]) => (
                  <div key={currency} className="stat-row">
                    <dt>{currency}</dt>
                    <dd>
                      {new Intl.NumberFormat(locale === 'bn-BD' ? 'bn-BD' : 'en', {
                        style: 'currency',
                        currency,
                      }).format(amount / 100)}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="badge badge-warning">{t('operations.moneyWarning')}</p>
            </Card>
          </Grid>
        </Section>
        <Section surface="muted" title={t('operations.ledgerTitle')}>
          {workspace.ledger.length === 0 ? <p>{t('operations.noCosts')}</p> : null}
          <Grid min={300}>
            {workspace.ledger.map((entry) => (
              <Card key={entry.id}>
                <Badge tone={entry.status === 'verified' ? 'success' : 'warning'}>
                  {entry.status}
                </Badge>
                <h3 className="card-title">{entry.label}</h3>
                <p className="amount">
                  {new Intl.NumberFormat(locale === 'bn-BD' ? 'bn-BD' : 'en', {
                    style: 'currency',
                    currency: entry.currency,
                  }).format(entry.amountMinor / 100)}
                </p>
                <p>{entry.payee || t('operations.payeeUnknown')}</p>
                <p className="muted">{entry.legalBasis || t('operations.legalBasisUnknown')}</p>
              </Card>
            ))}
          </Grid>
        </Section>
      </>
    </WorkspacePageShell>
  );
}
