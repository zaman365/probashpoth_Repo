import { SignIn } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url: requested } = await searchParams;
  const redirectUrl = safeReturnPath(requested, '/bn/dashboard');
  return (
    <main className="auth-page">
      <section className="auth-page-story">
        <p className="eyebrow">প্রবাসযাত্রা · YOUR JOURNEY</p>
        <h1>একটি নিরাপদ বিদেশযাত্রা, আপনার তথ্য ও অগ্রগতি দিয়ে তৈরি।</h1>
        <p>Sign in to continue your work or higher-study journey from one private workspace.</p>
      </section>
      <section className="auth-page-panel" aria-label="Sign in">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl={redirectUrl}
          withSignUp
        />
      </section>
    </main>
  );
}

function safeReturnPath(value: string | undefined, fallback: string): string {
  if (!value?.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}
