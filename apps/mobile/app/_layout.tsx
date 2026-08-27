import { Stack } from 'expo-router';
import { tokens } from '@probash/design-tokens';

/** Bangla-first shell. Screen titles come from @probash/i18n, never from literals. */
export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tokens.semanticLight.surface },
        headerTintColor: tokens.semanticLight.textPrimary,
        contentStyle: { backgroundColor: tokens.semanticLight.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'প্রবাসযাত্রা' }} />
      <Stack.Screen name="sign-in" options={{ title: 'নিরাপদ সাইন ইন' }} />
      <Stack.Screen name="passport" options={{ title: 'মাইগ্রেশন পাসপোর্ট' }} />
      <Stack.Screen name="matches" options={{ title: 'ম্যাচ' }} />
      <Stack.Screen name="verify" options={{ title: 'যাচাই' }} />
      <Stack.Screen name="cases" options={{ title: 'আবেদন' }} />
      <Stack.Screen name="documents" options={{ title: 'ডকুমেন্ট' }} />
      <Stack.Screen name="payments" options={{ title: 'পেমেন্ট' }} />
      <Stack.Screen name="alerts" options={{ title: 'অ্যালার্ট' }} />
      <Stack.Screen name="family" options={{ title: 'ফ্যামিলি কো-পাইলট' }} />
      <Stack.Screen name="study-applications" options={{ title: 'স্টাডি আবেদন' }} />
      <Stack.Screen name="outcomes" options={{ title: 'ফলাফল' }} />
      <Stack.Screen name="quick-check" options={{ title: 'দ্রুত যাচাই' }} />
      <Stack.Screen name="trust" options={{ title: 'ট্রাস্ট সেন্টার' }} />
    </Stack>
  );
}
