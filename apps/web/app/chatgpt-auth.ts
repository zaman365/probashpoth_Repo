import { createClerkClient } from '@clerk/backend';
import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { IdentityLinkConflictError, resolveAppUserId } from '@/db/identity';

export type AuthenticatedUser = {
  userId: string;
  provider: 'sites' | 'clerk';
  providerSubject: string;
  displayName: string;
  email: string;
  fullName: string | null;
  organizationId: string | null;
  organizationRole: string | null;
  organizationPermissions: string[];
  mfaVerified: boolean;
};

/** @deprecated Transitional alias while Sites-specific imports are removed. */
export type ChatGPTUser = AuthenticatedUser;

const SIGN_IN_PATH = '/signin-with-chatgpt';
const SIGN_OUT_PATH = '/signout-with-chatgpt';
const CALLBACK_PATH = '/callback';

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  if (env.IDENTITY_PROVIDER === 'clerk') return getClerkUser();
  return getSitesTransitionUser();
}

async function getSitesTransitionUser(): Promise<AuthenticatedUser | null> {
  const requestHeaders = await headers();
  const providerSubject = requestHeaders.get('oai-authenticated-user-id');
  const email = requestHeaders.get('oai-authenticated-user-email');
  if (!providerSubject || !email) return null;

  const encodedFullName = requestHeaders.get('oai-authenticated-user-full-name');
  const fullName =
    encodedFullName &&
    requestHeaders.get('oai-authenticated-user-full-name-encoding') === 'percent-encoded-utf-8'
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  const userId = await resolveAppUserId({
    provider: 'sites',
    providerSubject,
    verifiedEmail: email,
  });
  return {
    userId,
    provider: 'sites',
    providerSubject,
    email,
    fullName,
    displayName: fullName ?? email,
    organizationId: null,
    organizationRole: null,
    organizationPermissions: [],
    mfaVerified: false,
  };
}

async function getClerkUser(): Promise<AuthenticatedUser | null> {
  const secretKey = env.CLERK_SECRET_KEY;
  const publishableKey = env.CLERK_PUBLISHABLE_KEY;
  const authorizedParties = splitCsv(env.CLERK_AUTHORIZED_PARTIES);
  if (!secretKey || !publishableKey || authorizedParties.length === 0) {
    throw new Error('Clerk identity is selected but its server configuration is incomplete.');
  }

  const requestHeaders = await headers();
  const origin = authorizedParties[0]!;
  const request = new Request(new URL('/__clerk-auth', origin), { headers: requestHeaders });
  const clerk = createClerkClient({
    secretKey,
    publishableKey,
    jwtKey: env.CLERK_JWT_KEY,
  });
  const state = await clerk.authenticateRequest(request, {
    authorizedParties,
    acceptsToken: 'session_token',
  });
  if (!state.isAuthenticated) return null;
  const auth = state.toAuth();
  const providerSubject = auth.userId;
  const clerkUser = await clerk.users.getUser(providerSubject);
  const primaryEmail = clerkUser.emailAddresses.find(
    (entry) =>
      entry.id === clerkUser.primaryEmailAddressId && entry.verification?.status === 'verified',
  );
  if (!primaryEmail) throw new Error('A verified primary email is required to use this account.');
  const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null;
  let userId: string;
  try {
    userId = await resolveAppUserId({
      provider: 'clerk',
      providerSubject,
      verifiedEmail: primaryEmail.emailAddress,
    });
  } catch (error) {
    if (error instanceof IdentityLinkConflictError) redirect('/account-link');
    throw error;
  }
  return {
    userId,
    provider: 'clerk',
    providerSubject,
    email: primaryEmail.emailAddress,
    fullName,
    displayName: fullName ?? primaryEmail.emailAddress,
    organizationId: auth.orgId ?? null,
    organizationRole: auth.orgRole ?? null,
    organizationPermissions: auth.orgPermissions ?? [],
    mfaVerified: auth.factorVerificationAge !== null && auth.factorVerificationAge[1] >= 0,
  };
}

export async function requirePrivilegedClerkUser(returnTo: string): Promise<AuthenticatedUser> {
  const user = await requireChatGPTUser(returnTo);
  if (user.provider !== 'clerk' || !user.mfaVerified) {
    throw new Error('A recently verified second factor is required for this action.');
  }
  return user;
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  if (env.IDENTITY_PROVIDER === 'clerk') {
    return `${env.CLERK_SIGN_IN_URL ?? '/sign-in'}?redirect_url=${encodeURIComponent(safeReturnTo)}`;
  }
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = '/'): string {
  if (env.IDENTITY_PROVIDER === 'clerk') {
    return `/sign-out?redirect_url=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
  }
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

function splitCsv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  try {
    const url = new URL(value, 'https://app.local');
    if (url.origin !== 'https://app.local' || isReservedAuthPath(url.pathname)) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

function isReservedAuthPath(pathname: string): boolean {
  return [SIGN_IN_PATH, SIGN_OUT_PATH, CALLBACK_PATH].includes(pathname);
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
