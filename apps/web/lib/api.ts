import { cookies } from 'next/headers';
import { createApiClient, ApiRequestError } from '@probash/contracts';
import type { Locale } from '@probash/domain';
import { demoApiRequest } from './demo-api';

export const SESSION_COOKIE = 'probash_session';

const baseUrl = process.env['API_BASE_URL'];

/**
 * Server-side API client. The session token lives in an httpOnly cookie and never
 * reaches client JavaScript (§50).
 */
export const apiRequest = baseUrl
  ? createApiClient({ baseUrl, defaultLocale: 'bn-BD' })
  : demoApiRequest;

export async function sessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

export async function authedRequest<T>(
  path: string,
  options: Parameters<typeof apiRequest<T>>[1] = {},
): Promise<T> {
  const token = await sessionToken();
  return apiRequest<T>(path, { ...options, token });
}

export function apiPath(path: string): string {
  return `/api/v1${path}`;
}

export function localeHeader(locale: Locale): 'bn-BD' | 'en' {
  return locale;
}

export { ApiRequestError };

/** Returns undefined instead of throwing when the caller is simply signed out. */
export async function tryAuthed<T>(
  path: string,
  options: Parameters<typeof apiRequest<T>>[1] = {},
): Promise<T | undefined> {
  // The public Sites deployment deliberately has no identity or payments backend.
  if (!baseUrl) return undefined;
  try {
    return await authedRequest<T>(path, options);
  } catch (error) {
    if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
      return undefined;
    }
    throw error;
  }
}
