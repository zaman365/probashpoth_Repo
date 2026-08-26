import type { CaseDetailDto } from '@probash/contracts';
import { useCachedResource } from '../lib/use-cached-resource';
import { Card, FieldLabel, ResourceState, Screen, t, Value } from '../components/MobileUi';

export default function Cases() {
  const resource = useCachedResource<CaseDetailDto[]>('cases', '/api/v1/cases');
  return (
    <Screen title={t('home.myApplications')} stale={resource.stale}>
      <ResourceState
        loading={resource.loading}
        error={resource.error}
        empty={resource.data?.length === 0}
      />
      {resource.data?.map((item) => (
        <Card key={item.id}>
          <FieldLabel>{item.purpose === 'work' ? t('mobile.work') : t('mobile.study')}</FieldLabel>
          <Value>{item.destinationCountry}</Value>
          <Value>{item.state}</Value>
          <FieldLabel>{t('mobile.nextTasks')}</FieldLabel>
          <Value>{item.tasks.filter((task) => task.status !== 'done').length}</Value>
        </Card>
      ))}
    </Screen>
  );
}
