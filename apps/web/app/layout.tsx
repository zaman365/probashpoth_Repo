import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/AuthProvider';

/**
 * The locale layout owns <html> and <body> so `lang` can follow the URL segment
 * (/bn, /en) — a screen reader must be told which language it is reading (ADR 0002).
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider publishableKey={process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY']}>
      {children}
    </AuthProvider>
  );
}
