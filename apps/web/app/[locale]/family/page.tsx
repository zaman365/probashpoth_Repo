import type { Metadata } from 'next';
import { Badge, Card, Grid, Section } from '@probash/web-ui';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { getWorkspace } from '@/db/operations';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { canonicalMetadata } from '@/lib/seo';
import { ConfirmSubmitButton, DelegationForm } from '@/components/OperationalForms';
import { revokeDelegationAction } from '../operational-actions';

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
    path: '/family',
    title: t('operations.familyPageTitle'),
    description: t('operations.familyPageLead'),
  });
}

export default async function FamilyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const user = await requireChatGPTUser(`/${seg}/family`);
  const workspace = await getWorkspace(user.userId);
  const journeys = workspace.journeys.map(({ id, title }) => ({ id, title }));

  return (
    <>
      <Section
        surface="warm"
        headingLevel={1}
        eyebrow={t('operations.revocable')}
        title={t('operations.familyPageTitle')}
        lead={t('operations.familyPageLead')}
      />
      <Section surface="default">
        <Grid min={360}>
          <DelegationForm locale={locale} localeSegment={seg} journeys={journeys} />
          <Card tone="muted">
            <h2 className="card-title">{t('operations.familyRulesTitle')}</h2>
            <ul className="stack compact-list">
              <li>{t('operations.familyRule1')}</li>
              <li>{t('operations.familyRule2')}</li>
              <li>{t('operations.familyRule3')}</li>
            </ul>
          </Card>
        </Grid>
      </Section>
      <Section surface="muted" title={t('operations.activeAccess')}>
        {workspace.delegations.length === 0 ? <p>{t('operations.noDelegations')}</p> : null}
        <Grid min={300}>
          {workspace.delegations.map((delegation) => (
            <Card key={delegation.id}>
              <Badge tone={delegation.status === 'active' ? 'success' : 'neutral'}>
                {delegation.status}
              </Badge>
              <h3 className="card-title">{delegation.delegateContact}</h3>
              <p>{delegation.relationship}</p>
              <p className="muted">{delegation.permissions.join(' · ')}</p>
              {delegation.status === 'active' ? (
                <form action={revokeDelegationAction}>
                  <input type="hidden" name="locale" value={seg} />
                  <input type="hidden" name="delegationId" value={delegation.id} />
                  <ConfirmSubmitButton
                    label={t('operations.revoke')}
                    confirmation={t('operations.revokeConfirm')}
                  />
                </form>
              ) : null}
            </Card>
          ))}
        </Grid>
      </Section>
    </>
  );
}
