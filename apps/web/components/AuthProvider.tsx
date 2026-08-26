'use client';

import { ClerkProvider } from '@clerk/nextjs';
import type { ReactNode } from 'react';

export function AuthProvider({
  publishableKey,
  children,
}: {
  publishableKey: string | undefined;
  children: ReactNode;
}) {
  if (!publishableKey) return children;
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/bn/dashboard"
      signUpFallbackRedirectUrl="/bn/onboarding"
      afterSignOutUrl="/bn"
      appearance={{
        variables: {
          colorPrimary: '#128a49',
          borderRadius: '0.55rem',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
