import Link from 'next/link';
import { trustCenterSchema } from '@probash/contracts';
import { apiRequest } from '@/lib/api';
import { localeSegment, parseLocaleParam, pick } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function TrustCenterPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = parseLocaleParam((await params).locale);
  const seg = localeSegment(locale);
  const trust = await apiRequest('/api/v1/trust-center', { locale, schema: trustCenterSchema });
  return (
    <div className="wide-page stack-lg">
      <header className="hero">
        <div className="stack">
          <span className="badge badge-success">
            {locale === 'bn-BD' ? 'নিরাপত্তার তথ্য বিনামূল্যে' : 'Basic safety is free'}
          </span>
          <h1>
            {locale === 'bn-BD' ? 'প্রবাসযাত্রা ট্রাস্ট সেন্টার' : 'Probashjatra Trust Center'}
          </h1>
          <p>
            {locale === 'bn-BD'
              ? 'কোন প্রতিষ্ঠান, চাকরি, খরচ, উৎস ও ফলাফল কীভাবে যাচাই করা হয়—এবং কী যাচাই করা হয়নি—এখানে স্পষ্টভাবে দেখুন।'
              : 'See how providers, jobs, costs, sources and outcomes are checked—and what has not been checked.'}
          </p>
        </div>
        <div className="card stack">
          <strong>{locale === 'bn-BD' ? 'র‌্যাঙ্কিং নীতি' : 'Ranking policy'}</strong>
          <p>
            {locale === 'bn-BD'
              ? 'কমিশন অর্গানিক ম্যাচ বদলায় না। স্পনসরড ফল আলাদা ও লেবেলযুক্ত।'
              : 'Commission never changes organic matches. Sponsored results are separate and labelled.'}
          </p>
        </div>
      </header>

      <section className="grid-cards">
        {trust.sections.map((section) => (
          <article className="card stack" key={section.key}>
            <h2>{pick(section.title, locale)}</h2>
            <p>{pick(section.body, locale)}</p>
          </article>
        ))}
      </section>

      <section className="card stack">
        <h2>{locale === 'bn-BD' ? 'যাচাইয়ের অবস্থা' : 'Verification states'}</h2>
        <div className="flex flex-wrap gap-2">
          {trust.verificationStatuses.map((status) => (
            <span className="badge badge-neutral" key={status}>
              {status}
            </span>
          ))}
        </div>
        <p className="muted">
          {locale === 'bn-BD'
            ? 'কোনো কাঁচা “ট্রাস্ট স্কোর” প্রকাশ করা হয় না। যে তথ্য সত্যিই দেখা হয়েছে, শুধু সেটিই দেখানো হয়।'
            : 'No raw trust score is published. The product states only what was actually checked.'}
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link className="btn btn-primary" href={`/${seg}/verify`}>
          {locale === 'bn-BD' ? 'চাকরি/অফার যাচাই' : 'Verify a job or offer'}
        </Link>
        <Link className="btn btn-secondary" href={`/${seg}/safety`}>
          {locale === 'bn-BD' ? 'স্ক্যাম সতর্কতা' : 'Scam education'}
        </Link>
        <Link className="btn btn-secondary" href={`/${seg}/official-actions`}>
          {locale === 'bn-BD' ? 'সরকারি কাজ' : 'Official actions'}
        </Link>
      </div>
    </div>
  );
}
