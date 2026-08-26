import { useState } from 'react';
import { TextInput } from 'react-native';
import type { DelegationDto } from '@probash/contracts';
import { tokens } from '@probash/design-tokens';
import { apiRequest } from '../lib/api';
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

export default function Family() {
  const resource = useCachedResource<DelegationDto[]>('delegations', '/api/v1/delegations');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState<string>();

  async function invite() {
    try {
      await apiRequest('/api/v1/delegations', {
        method: 'POST',
        body: {
          delegatePhone: phone,
          relationship: 'trusted_person',
          permissions: [
            'view_progress',
            'view_cost',
            'receive_payment_alerts',
            'receive_status_alerts',
            'contact_support',
          ],
        },
      });
      setPhone('');
      setMessage(t('mobile.familyInvited'));
      await resource.refresh();
    } catch {
      setMessage(t('mobile.familyOnlineOnly'));
    }
  }

  return (
    <Screen title={t('mobile.family')} stale={resource.stale}>
      <Notice>{t('mobile.familyLimits')}</Notice>
      <Card>
        <TextInput
          accessibilityLabel={t('mobile.familyPhone')}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          placeholder="01XXXXXXXXX"
          style={{
            minHeight: tokens.size.tapTargetMin,
            borderWidth: 1,
            borderColor: tokens.semanticLight.border,
            borderRadius: tokens.radius.md,
            paddingHorizontal: tokens.space.md,
            fontSize: tokens.typography.scale.body,
          }}
        />
        <ActionButton label={t('mobile.inviteFamily')} onPress={() => void invite()} />
      </Card>
      {message ? <Notice>{message}</Notice> : null}
      <ResourceState
        loading={resource.loading}
        error={resource.error}
        empty={resource.data?.length === 0}
      />
      {resource.data?.map((delegation) => (
        <Card key={delegation.id}>
          <Value>{delegation.delegateName ?? delegation.delegatePhoneMasked}</Value>
          <Value>{delegation.relationship}</Value>
          <Value>{delegation.status}</Value>
        </Card>
      ))}
    </Screen>
  );
}
