import { SignUp } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <section className="auth-page-story">
        <p className="eyebrow">WORK · STUDY · BOTH</p>
        <h1>আপনার লক্ষ্য বেছে নিন। পথটি ধাপে ধাপে গড়ে উঠবে।</h1>
        <p>Create a secure account first. Work, study, or both is selected during onboarding.</p>
      </section>
      <section className="auth-page-panel" aria-label="Create account">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/bn/onboarding"
        />
      </section>
    </main>
  );
}
