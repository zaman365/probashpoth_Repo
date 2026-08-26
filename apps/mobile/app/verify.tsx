import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput } from 'react-native';
import { lookupMessage } from '@probash/i18n';
import { tokens } from '@probash/design-tokens';
import type { PublicJobVerificationDto } from '@probash/contracts';
import { apiRequest } from '../lib/api';

const t = (key: string) => lookupMessage('bn-BD', key) ?? key;

/**
 * §21/§23 — verification by id. The QR camera path lands in the next mobile epic;
 * until then this screen does the same lookup by typed id rather than pretending to
 * scan.
 */
export default function Verify() {
  const [publicId, setPublicId] = useState('');
  const [result, setResult] = useState<PublicJobVerificationDto | undefined>();

  async function check() {
    const response = await apiRequest<PublicJobVerificationDto>(
      `/api/v1/verify/job/${encodeURIComponent(publicId.trim())}`,
    );
    setResult(response);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: tokens.space.md, gap: tokens.space.md }}>
      <Text style={{ fontSize: tokens.typography.scale.title, fontWeight: '700' }}>
        {t('scanner.title')}
      </Text>
      <TextInput
        accessibilityLabel={t('scanner.publicIdLabel')}
        placeholder="BD-QA-2026-00000000"
        value={publicId}
        onChangeText={setPublicId}
        autoCapitalize="characters"
        style={{
          minHeight: tokens.size.tapTargetMin,
          borderWidth: 1,
          borderColor: tokens.semanticLight.border,
          borderRadius: tokens.radius.md,
          paddingHorizontal: tokens.space.md,
          fontSize: tokens.typography.scale.body,
        }}
      />
      <Pressable
        accessibilityRole="button"
        onPress={check}
        style={{
          minHeight: tokens.size.tapTargetMin,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: tokens.radius.md,
          backgroundColor: tokens.semanticLight.accent,
        }}
      >
        <Text style={{ color: tokens.semanticLight.textOnAccent, fontWeight: '600' }}>
          {t('scanner.checkNow')}
        </Text>
      </Pressable>

      {result ? (
        <Text style={{ fontSize: tokens.typography.scale.bodyLarge }}>
          {result.status === 'verified' ? t('job.verifiedJob') : t('risk.kind.job_id_not_found')}
        </Text>
      ) : null}
    </ScrollView>
  );
}
