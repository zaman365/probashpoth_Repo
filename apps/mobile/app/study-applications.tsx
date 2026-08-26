import type { StudyDashboardDto } from '@probash/contracts';
import { useCachedResource } from '../lib/use-cached-resource';
import { Card, FieldLabel, Notice, ResourceState, Screen, t, Value } from '../components/MobileUi';

export default function StudyApplications() {
  const resource = useCachedResource<StudyDashboardDto>(
    'study-dashboard',
    '/api/v1/study/dashboard',
  );
  return (
    <Screen title={t('mobile.studyApplications')} stale={resource.stale}>
      <Notice>{t('mobile.unknownRulesStayUnknown')}</Notice>
      <ResourceState loading={resource.loading} error={resource.error} />
      {resource.data?.applications.map((application) => (
        <Card key={application.id}>
          <FieldLabel>{application.intake}</FieldLabel>
          <Value>{application.programId}</Value>
          <Value>{application.status}</Value>
          <Value>{application.eligibilityAtSubmission}</Value>
        </Card>
      ))}
      {resource.data?.calendar.map((item) => (
        <Card key={item.id}>
          <FieldLabel>{t('mobile.calendar')}</FieldLabel>
          <Value>{item.label.bn}</Value>
          <Value>
            {item.status === 'known' ? (item.date ?? t('mobile.notProvided')) : t('mobile.unknown')}
          </Value>
        </Card>
      ))}
    </Screen>
  );
}
