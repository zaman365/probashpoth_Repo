import type { OutcomeFollowUpDto, PromisedActualComparisonDto } from '@probash/contracts';
import { useCachedResource } from '../lib/use-cached-resource';
import { Card, FieldLabel, Notice, ResourceState, Screen, t, Value } from '../components/MobileUi';

export default function Outcomes() {
  const followUps = useCachedResource<OutcomeFollowUpDto[]>(
    'outcome-followups',
    '/api/v1/me/outcomes/follow-ups',
  );
  const comparisons = useCachedResource<PromisedActualComparisonDto[]>(
    'outcome-comparisons',
    '/api/v1/me/outcomes/comparisons',
  );
  return (
    <Screen title={t('mobile.outcomes')} stale={followUps.stale || comparisons.stale}>
      <Notice>{t('mobile.outcomeConsent')}</Notice>
      <ResourceState
        loading={followUps.loading || comparisons.loading}
        error={followUps.error ?? comparisons.error}
      />
      {followUps.data?.map((item) => (
        <Card key={item.id}>
          <FieldLabel>{item.path === 'work' ? t('mobile.work') : t('mobile.study')}</FieldLabel>
          <Value>{item.label.bn}</Value>
          <Value>{item.dueAt.slice(0, 10)}</Value>
          <Value>{item.status}</Value>
        </Card>
      ))}
      {comparisons.data?.map((comparison) => (
        <Card key={comparison.id}>
          <FieldLabel>{t('mobile.promisedActual')}</FieldLabel>
          <Value>{comparison.reviewStatus}</Value>
          {comparison.fields.map((field) => (
            <Value key={field.key}>
              {field.key}: {field.state}
            </Value>
          ))}
        </Card>
      ))}
    </Screen>
  );
}
