import { useState } from 'react';
import type { AlertSubscriptionDto } from '@probash/contracts';
import { apiRequest } from '../lib/api';
import { enqueueMutation } from '../lib/offline';
import { useCachedResource } from '../lib/use-cached-resource';
import {
  ActionButton,
  Card,
  Notice,
  ResourceState,
  Screen,
  t,
  Value,
} from '../components/MobileUi';

export default function Alerts() {
  const resource = useCachedResource<AlertSubscriptionDto[]>(
    'alerts',
    '/api/v1/me/passport/alerts',
  );
  const [message, setMessage] = useState<string>();

  async function subscribe() {
    const body = {
      path: 'both',
      countryCodes: [],
      candidateIds: [],
      eventTypes: ['rule_change', 'deadline', 'case_update', 'safety_alert'],
      channel: 'in_app',
      active: true,
    };
    try {
      await apiRequest('/api/v1/me/passport/alerts', { method: 'POST', body });
      setMessage(t('mobile.alertSaved'));
      await resource.refresh();
    } catch {
      await enqueueMutation({ path: '/api/v1/me/passport/alerts', method: 'POST', body });
      setMessage(t('mobile.savedForSync'));
    }
  }

  return (
    <Screen title={t('mobile.alerts')} stale={resource.stale}>
      <ActionButton label={t('mobile.enableAlerts')} onPress={() => void subscribe()} />
      {message ? <Notice>{message}</Notice> : null}
      <ResourceState
        loading={resource.loading}
        error={resource.error}
        empty={resource.data?.length === 0}
      />
      {resource.data?.map((alert) => (
        <Card key={alert.id}>
          <Value>{alert.path}</Value>
          <Value>{alert.channel}</Value>
          <Value>{alert.active ? t('mobile.active') : t('mobile.inactive')}</Value>
        </Card>
      ))}
    </Screen>
  );
}
