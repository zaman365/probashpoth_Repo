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
    />
  );
}
