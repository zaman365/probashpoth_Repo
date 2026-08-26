import { useState } from 'react';
import { TextInput } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { SessionDto } from '@probash/contracts';
import { tokens } from '@probash/design-tokens';
import { apiRequest } from '../lib/api';
import { ActionButton, Card, Notice, Screen, t, Value } from '../components/MobileUi';

export default function SignIn() {
  const [phone, setPhone] = useState('');
  const [challengeId, setChallengeId] = useState<string>();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string>();

  async function requestCode() {
    try {
      const response = await apiRequest<{ challengeId: string; devOtp?: string }>(
        '/api/v1/auth/request-otp',
        { method: 'POST', body: { phone, locale: 'bn-BD' } },
      );
      setChallengeId(response.challengeId);
      if (response.devOtp) setCode(response.devOtp);
      setMessage(t('mobile.codeSent'));
    } catch {
      setMessage(t('common.errorBody'));
    }
  }

  async function verifyCode() {
    if (!challengeId) return;
    try {
      const session = await apiRequest<SessionDto>('/api/v1/auth/verify-otp', {
        method: 'POST',
        body: { challengeId, code, consentAccepted: true },
      });
      await SecureStore.setItemAsync('probash_session', session.token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      setMessage(t('mobile.signInComplete'));
    } catch {
      setMessage(t('common.errorBody'));
    }
  }

  return (
    <Screen title={t('mobile.signIn')}>
      <Notice>{t('mobile.noEmail')}</Notice>
      <Card>
        <Value>{t('mobile.phone')}</Value>
        <TextInput
          accessibilityLabel={t('mobile.phone')}
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
        <ActionButton label={t('mobile.sendCode')} onPress={() => void requestCode()} />
      </Card>
      {challengeId ? (
        <Card>
          <Value>{t('mobile.code')}</Value>
          <TextInput
            accessibilityLabel={t('mobile.code')}
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
            maxLength={6}
            style={{
              minHeight: tokens.size.tapTargetMin,
              borderWidth: 1,
              borderColor: tokens.semanticLight.border,
              borderRadius: tokens.radius.md,
              paddingHorizontal: tokens.space.md,
              fontSize: tokens.typography.scale.body,
            }}
          />
          <Value>{t('mobile.consent')}</Value>
          <ActionButton label={t('mobile.verifyCode')} onPress={() => void verifyCode()} />
        </Card>
      ) : null}
      {message ? <Notice>{message}</Notice> : null}
    </Screen>
  );
}
