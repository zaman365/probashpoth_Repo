import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { quickCheckResultSchema, type QuickCheckResultDto } from '@probash/contracts';
import { tokens } from '@probash/design-tokens';
import { ActionButton, Card, Notice, Screen, Value } from '../components/MobileUi';
import { apiRequest } from '../lib/api';

export default function QuickCheckScreen() {
  const [goal, setGoal] = useState<'WORK' | 'STUDY'>('WORK');
  const [country, setCountry] = useState('');
  const [occupation, setOccupation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<QuickCheckResultDto>();

  async function run() {
    setLoading(true);
    setError(false);
    try {
      setResult(
        await apiRequest('/api/v1/quick-check', {
          method: 'POST',
          body: {
            goal,
            citizenship: 'BD',
            residenceCountry: 'BD',
            occupationKey: occupation.trim() || undefined,
            preferredCountryCodes: country.trim() ? [country.trim().toUpperCase()] : [],
            languageCertificates: [],
            skillCertificates: [],
          },
          schema: quickCheckResultSchema,
        }),
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    minHeight: tokens.size.tapTargetMin,
    borderWidth: 1,
    borderColor: tokens.semanticLight.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    color: tokens.semanticLight.textPrimary,
  } as const;

  return (
    <Screen title="দ্রুত যোগ্যতা যাচাই">
      <Notice>
        অ্যাকাউন্ট বা পাসপোর্ট আপলোড লাগবে না। এটি চাকরি, ভর্তি বা ভিসার নিশ্চয়তা নয়।
      </Notice>
      <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
        <View style={{ flex: 1 }}>
          <ActionButton
            label="বিদেশে কাজ"
            onPress={() => setGoal('WORK')}
            secondary={goal !== 'WORK'}
          />
        </View>
        <View style={{ flex: 1 }}>
          <ActionButton
            label="উচ্চশিক্ষা"
            onPress={() => setGoal('STUDY')}
            secondary={goal !== 'STUDY'}
          />
        </View>
      </View>
      <TextInput
        accessibilityLabel="পছন্দের দেশের দুই অক্ষরের কোড"
        placeholder="দেশ, যেমন DE"
        autoCapitalize="characters"
        maxLength={2}
        value={country}
        onChangeText={setCountry}
        style={inputStyle}
      />
      <TextInput
        accessibilityLabel="পেশা"
        placeholder="পেশা, যেমন electrician"
        value={occupation}
        onChangeText={setOccupation}
        style={inputStyle}
      />
      <ActionButton
        label={loading ? 'যাচাই হচ্ছে…' : 'পথ দেখুন'}
        onPress={() => void run()}
        disabled={loading}
      />
      {error ? (
        <Notice tone="danger">এখন যাচাই করা যাচ্ছে না। নেটওয়ার্ক এলে আবার চেষ্টা করুন।</Notice>
      ) : null}
      {result ? <Notice tone="warning">{result.disclaimer.bn}</Notice> : null}
      {result?.routes.map((route) => (
        <Card key={route.routeVersionId}>
          <Text
            style={{
              fontSize: tokens.typography.scale.bodyLarge,
              fontWeight: '700',
              color: tokens.semanticLight.textPrimary,
            }}
          >
            {route.title.bn}
          </Text>
          <Value>ফিট: {route.fit}</Value>
          <Value>সহায়তা: {route.coverageMaturity}</Value>
          <Value>তথ্য: {route.confidence}</Value>
          {route.preparationGaps.map((gap, index) => (
            <Value key={`${route.routeVersionId}-${index}`}>• {gap.bn}</Value>
          ))}
        </Card>
      ))}
    </Screen>
  );
}
