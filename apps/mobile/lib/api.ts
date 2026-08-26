import { createApiClient } from '@probash/contracts';

/**
 * The mobile app talks to the same API and validates against the same contracts as
 * web (ADR 0001). It must never re-implement a rule locally.
 */
const baseUrl = process.env['EXPO_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3001';

export const apiRequest = createApiClient({
  baseUrl,
  defaultLocale: 'bn-BD',
  // Sessions live in expo-secure-store, never in AsyncStorage (§50).
  getToken: async () => {
    const SecureStore = await import('expo-secure-store');
    return (await SecureStore.getItemAsync('probash_session')) ?? undefined;
  },
});
