import { useState } from 'react';
import type { AssessmentBundleDto, PassportBundleDto } from '@probash/contracts';
import { apiRequest } from '../lib/api';
import { useCachedResource } from '../lib/use-cached-resource';
import {
  ActionButton,
  Card,
  FieldLabel,
  Notice,
  ResourceState,
  Screen,
  t,
  Value,
} from '../components/MobileUi';

export default function Passport() {
  const resource = useCachedResource<PassportBundleDto>('passport', '/api/v1/me/passport');
  const [assessment, setAssessment] = useState<AssessmentBundleDto>();

  async function assess() {
    const response = await apiRequest<AssessmentBundleDto>('/api/v1/me/passport/assessments', {
      method: 'POST',
    });
    setAssessment(response);
  }

  return (
    <Screen title={t('mobile.passport')} stale={resource.stale}>
      <ResourceState loading={resource.loading} error={resource.error} />
      {resource.data ? (
        <>
          <Card>
            <FieldLabel>{t('mobile.sharedProfile')}</FieldLabel>
            <Value>{resource.data.shared.identity.legalName ?? t('mobile.notProvided')}</Value>
            <Value>
              {t('mobile.passportVersion')}: {resource.data.shared.version}
            </Value>
          </Card>
          <Card>
            <FieldLabel>{t('mobile.workProfile')}</FieldLabel>
            <Value>{resource.data.work.currentOccupationKey ?? t('mobile.notProvided')}</Value>
            <FieldLabel>{t('mobile.studyProfile')}</FieldLabel>
            <Value>{resource.data.study.targetLevel ?? t('mobile.notProvided')}</Value>
          </Card>
          <ActionButton label={t('mobile.checkReadiness')} onPress={() => void assess()} />
        </>
      ) : null}
      {assessment ? (
        <Card>
          <Value>
            {t('mobile.workReadiness')}: {assessment.work.readinessPercent}%
          </Value>
          <Value>
            {t('mobile.studyReadiness')}: {assessment.study.readinessPercent}%
          </Value>
          <Notice>{t('mobile.readinessNotProbability')}</Notice>
        </Card>
      ) : null}
    </Screen>
  );
}
