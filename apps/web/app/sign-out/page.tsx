'use client';

import { SignOutButton } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';

export default function SignOutPage() {
  const searchParams = useSearchParams();
  const requested = searchParams.get('redirect_url');
  const redirectUrl = requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/bn';
  return (
    <main className="auth-page">
      <section className="auth-page-panel">
        <h1>Sign out securely?</h1>
        <p>This closes the current account session on this device.</p>
        <SignOutButton redirectUrl={redirectUrl}>
          <button className="btn btn-primary" type="button">
            Sign out
          </button>
        </SignOutButton>
      </section>
    </main>
  );
}
