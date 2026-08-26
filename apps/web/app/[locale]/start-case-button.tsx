import Link from 'next/link';
import type { Locale } from '@probash/domain';
import { sessionToken } from '@/lib/api';
import { localeSegment } from '@/lib/i18n';
import { startCaseAction } from './actions';
import { getChatGPTUser, chatGPTSignInPath } from '@/app/chatgpt-auth';

/**
 * Starting an application requires an account, but browsing never does (§14.1).
 * A signed-out worker is offered onboarding instead of a dead end.
 */
export async function StartCaseButton({
  locale,
  routeVersionId,
  jobId,
  label,
  signInLabel,
  title,
  destinationCountry,
  path = 'work',
}: {
  locale: Locale;
  routeVersionId: string;
  jobId?: string;
  label: string;
  signInLabel: string;
  title?: string;
  destinationCountry?: string;
  path?: 'work' | 'study';
}) {
  const [token, user] = await Promise.all([sessionToken(), getChatGPTUser()]);
  const seg = localeSegment(locale);

  if (!token && !user) {
    return (
      <Link href={chatGPTSignInPath(`/${seg}/dashboard`)} className="btn btn-primary">
        {signInLabel}
      </Link>
    );
  }

  return (
    <form action={startCaseAction}>
      <input type="hidden" name="routeVersionId" value={routeVersionId} />
      {jobId ? <input type="hidden" name="jobId" value={jobId} /> : null}
      <input type="hidden" name="title" value={title ?? ''} />
      <input type="hidden" name="destinationCountry" value={destinationCountry ?? ''} />
      <input type="hidden" name="path" value={path} />
      <input type="hidden" name="locale" value={seg} />
      <button type="submit" className="btn btn-primary">
        {label}
      </button>
    </form>
  );
}
