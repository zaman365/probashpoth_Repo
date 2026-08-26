import type { z } from 'zod';
import { apiErrorSchema } from './primitives';

/**
 * Minimal typed client shared by web, mobile and the operator desktop app.
 * Responses are validated against the same schemas the API validates against,
 * so a contract drift fails loudly at the boundary instead of rendering junk.
 */
export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | undefined | Promise<string | undefined>;
  fetchImpl?: typeof fetch;
  defaultLocale?: 'bn-BD' | 'en';
}

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly messageKey?: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export interface RequestOptions<TResponse> {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  schema?: z.ZodType<TResponse>;
  locale?: 'bn-BD' | 'en';
  idempotencyKey?: string;
  signal?: AbortSignal;
  /** Forwarded from the browser/server so the API can bind the session. */
  token?: string;
}

export function createApiClient(options: ApiClientOptions) {
  const doFetch = options.fetchImpl ?? globalThis.fetch;

  return async function request<TResponse = unknown>(
    path: string,
    requestOptions: RequestOptions<TResponse> = {},
  ): Promise<TResponse> {
    const token = requestOptions.token ?? (await options.getToken?.());
    const headers: Record<string, string> = {
      accept: 'application/json',
      'accept-language': requestOptions.locale ?? options.defaultLocale ?? 'bn-BD',
    };
    if (requestOptions.body !== undefined) headers['content-type'] = 'application/json';
    if (token) headers['authorization'] = `Bearer ${token}`;
    if (requestOptions.idempotencyKey) headers['idempotency-key'] = requestOptions.idempotencyKey;

    const response = await doFetch(`${options.baseUrl}${path}`, {
      method: requestOptions.method ?? 'GET',
      headers,
      body: requestOptions.body !== undefined ? JSON.stringify(requestOptions.body) : undefined,
      signal: requestOptions.signal,
      cache: 'no-store',
    });

    const text = await response.text();
    const payload: unknown = text ? JSON.parse(text) : undefined;

    if (!response.ok) {
      const parsed = apiErrorSchema.safeParse(payload);
      if (parsed.success) {
        throw new ApiRequestError(
          response.status,
          parsed.data.error.code,
          parsed.data.error.message,
          parsed.data.error.messageKey,
          parsed.data.error.details,
        );
      }
      throw new ApiRequestError(response.status, 'UNKNOWN', `Request failed: ${response.status}`);
    }

    if (!requestOptions.schema) return payload as TResponse;
    return requestOptions.schema.parse(payload);
  };
}

export type ApiRequest = ReturnType<typeof createApiClient>;
