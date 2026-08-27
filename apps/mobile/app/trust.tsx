import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { trustCenterSchema, type TrustCenterDto } from '@probash/contracts';
import { tokens } from '@probash/design-tokens';
import { Card, Notice, ResourceState, Screen, Value } from '../components/MobileUi';
import { apiRequest } from '../lib/api';

export default function TrustScreen() {
  const [trust, setTrust] = useState<TrustCenterDto>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    apiRequest('/api/v1/trust-center', { schema: trustCenterSchema })
      .then(setTrust)
      .catch(() => setError('failed'));
  }, []);
  return (
    <Screen title="প্রবাসযাত্রা ট্রাস্ট সেন্টার">
      <Notice>নিরাপত্তা, সরকারি লিংক, মৌলিক যাচাই ও খরচের স্বচ্ছতা পেওয়ালের পেছনে নয়।</Notice>
      <ResourceState loading={!trust && !error} error={error} />
      {trust?.sections.map((section) => (
        <Card key={section.key}>
          <Text
            style={{
              fontSize: tokens.typography.scale.bodyLarge,
              fontWeight: '700',
              color: tokens.semanticLight.textPrimary,
            }}
          >
            {section.title.bn}
          </Text>
          <Value>{section.body.bn}</Value>
        </Card>
      ))}
      <Notice tone="warning">
        কাঁচা ট্রাস্ট স্কোর নয়—আসলে কী যাচাই করা হয়েছে শুধু সেটিই দেখানো হয়।
      </Notice>
    </Screen>
  );
}
