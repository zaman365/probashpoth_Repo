'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import {
  ApiRequestError,
  apiRequest,
  authedRequest,
  hasExternalApi,
  SESSION_COOKIE,
} from '@/lib/api';
import { localeSegment, parseLocaleParam } from '@/lib/i18n';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { createJourney } from '@/db/operations';

/**
 * Server actions. The session token is written to an httpOnly cookie and never
 * exposed to client JavaScript (§50).
 */

export interface ActionState {
  error?: string;
  message?: string;
  challengeId?: string;
  devOtp?: string;
  phone?: string;
}

/**
 * Maps an API failure to a message key. A worker who has asked for too many codes
 * must be told to wait — not shown a generic failure they will keep tapping through.
 */
function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.code === 'RATE_LIMITED') return 'onboarding.tooManyRequests';
    if (error.code === 'VALIDATION_FAILED') return 'onboarding.phoneHelp';
    return error.messageKey ?? 'common.errorBody';
  }
  return 'common.errorBody';
}

export async function requestOtpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const phone = String(formData.get('phone') ?? '').trim();
  const locale = parseLocaleParam(String(formData.get('locale') ?? 'bn'));
  try {
    const result = await apiRequest<{ challengeId: string; devOtp?: string }>(
      '/api/v1/auth/request-otp',
      { method: 'POST', body: { phone, locale }, locale },
    );
    return { challengeId: result.challengeId, devOtp: result.devOtp, phone };
  } catch (error) {
    return { error: errorMessage(error), phone };
  }
}

export async function verifyOtpAction(prev: ActionState, formData: FormData): Promise<ActionState> {
  const challengeId = String(formData.get('challengeId') ?? '');
  const code = String(formData.get('code') ?? '').trim();
  const consent = formData.get('consent') === 'on';
  const segment = String(formData.get('locale') ?? 'bn');

  try {
    const session = await apiRequest<{ token: string; expiresAt: string }>(
      '/api/v1/auth/verify-otp',
      { method: 'POST', body: { challengeId, code, consentAccepted: consent } },
    );
    const store = await cookies();
    store.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(session.expiresAt),
    });
  } catch (error) {
    return { ...prev, error: errorMessage(error) };
  }
  redirect(`/${localeSegment(parseLocaleParam(segment))}/cases`);
}

export async function signOutAction(formData: FormData): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect(`/${String(formData.get('locale') ?? 'bn')}`);
}

export async function startCaseAction(formData: FormData): Promise<void> {
  const routeVersionId = String(formData.get('routeVersionId') ?? '');
  const jobId = String(formData.get('jobId') ?? '') || undefined;
  const segment = String(formData.get('locale') ?? 'bn');
  const seg = localeSegment(parseLocaleParam(segment));

  if (!hasExternalApi) {
    const user = await requireChatGPTUser(`/${seg}/dashboard`);
    const path = String(formData.get('path') ?? 'work') === 'study' ? 'study' : 'work';
    const id = await createJourney(user.userId, {
      path,
      targetType: jobId ? 'job' : 'route',
      targetId: jobId ?? routeVersionId,
      title:
        String(formData.get('title') ?? '').trim() ||
        (path === 'study' ? 'Higher Study route' : jobId ? 'Work opportunity' : 'Work route'),
      destinationCountry: String(formData.get('destinationCountry') ?? '').trim() || undefined,
      details: { routeVersionId, jobId },
    });
    redirect(`/${seg}/cases/${id}`);
  }

  const created = await authedRequest<{ id: string }>('/api/v1/cases', {
    method: 'POST',
    body: { routeVersionId, jobId, purpose: 'work' },
  });
  redirect(`/${seg}/cases/${created.id}`);
}

export async function completeTaskAction(formData: FormData): Promise<void> {
  const caseId = String(formData.get('caseId') ?? '');
  const taskId = String(formData.get('taskId') ?? '');
  const segment = String(formData.get('locale') ?? 'bn');
  await authedRequest(`/api/v1/cases/${caseId}/actions`, {
    method: 'POST',
    body: { action: 'complete_task', taskId },
  });
  revalidatePath(`/${localeSegment(parseLocaleParam(segment))}/cases/${caseId}`);
}

export async function inviteFamilyAction(formData: FormData): Promise<void> {
  const caseId = String(formData.get('caseId') ?? '');
  const segment = String(formData.get('locale') ?? 'bn');
  await authedRequest('/api/v1/delegations', {
    method: 'POST',
    body: {
      delegatePhone: String(formData.get('phone') ?? ''),
      relationship: String(formData.get('relationship') ?? 'spouse'),
      permissions: ['view_progress', 'view_cost', 'receive_payment_alerts'],
    },
  });
  revalidatePath(`/${localeSegment(parseLocaleParam(segment))}/cases/${caseId}`);
}

export async function createPaymentIntentAction(formData: FormData): Promise<void> {
  const caseId = String(formData.get('caseId') ?? '');
  const costItemId = String(formData.get('costItemId') ?? '');
  const segment = String(formData.get('locale') ?? 'bn');
  await authedRequest(`/api/v1/cases/${caseId}/payment-intents`, {
    method: 'POST',
    body: { costItemId, method: 'mfs', idempotencyKey: randomUUID() },
  });
  revalidatePath(`/${localeSegment(parseLocaleParam(segment))}/cases/${caseId}`);
}
