import type { Metadata } from 'next';
import { quickCheckInputSchema, quickCheckResultSchema } from '@probash/contracts';
import { QuickCheckForm } from '@/components/QuickCheckForm';
import { apiRequest } from '@/lib/api';
import { parseLocaleParam } from '@/lib/i18n';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = parseLocaleParam((await params).locale);
  return {
    title: locale === 'bn-BD' ? 'দ্রুত যোগ্যতা যাচাই' : 'Quick eligibility check',
    description:
      locale === 'bn-BD'
        ? 'অ্যাকাউন্ট বা ডকুমেন্ট ছাড়াই বাস্তবসম্মত কাজ, স্টাডি ও ট্রেনিং পথের প্রাথমিক যাচাই।'
        : 'A preliminary Work, Study and Training route check before an account or documents.',
  };
}

export default async function QuickCheckPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = parseLocaleParam((await params).locale);
  const query = await searchParams;
  const value = (key: string) => {
    const candidate = query[key];
    return Array.isArray(candidate) ? candidate[0] : candidate;
  };
  const goal = value('goal');
  const age = value('age');
  const country = value('country');
  const occupation = value('occupation');
  const experience = value('experience');
  const passport = value('passport') === 'on';
  const parsed = goal
    ? quickCheckInputSchema.safeParse({
        goal,
        age: age ? Number(age) : undefined,
        citizenship: 'BD',
        residenceCountry: 'BD',
        occupationKey: occupation || undefined,
        experienceMonths: experience ? Number(experience) : undefined,
        languageCertificates: [],
        skillCertificates: [],
        preferredCountryCodes: country ? [country.toUpperCase()] : [],
        hasValidPassport: passport,
      })
    : undefined;
  const initialResult = parsed?.success
    ? await apiRequest('/api/v1/quick-check', {
        method: 'POST',
        body: parsed.data,
        locale,
        schema: quickCheckResultSchema,
      }).catch(() => null)
    : null;
  return (
    <div className="wide-page stack-lg">
      <header className="hero">
        <div className="stack">
          <span className="badge badge-success">
            {locale === 'bn-BD' ? 'অ্যাকাউন্ট লাগবে না' : 'No account required'}
          </span>
          <h1>
            {locale === 'bn-BD' ? 'দ্রুত যোগ্যতা যাচাই (QuickCheck)' : 'Quick eligibility check'}
          </h1>
          <p>
            {locale === 'bn-BD'
              ? '৫–১৫টি ছোট উত্তরে যোগ্যতা, ফিট, প্রস্তুতির ঘাটতি, সময়, খরচের অবস্থা ও তথ্যের নির্ভরযোগ্যতা আলাদা করে দেখুন।'
              : 'Use a few short answers to separate eligibility, fit, preparation gaps, time, cost status and data confidence.'}
          </p>
        </div>
      </header>
      <QuickCheckForm
        locale={locale}
        initialResult={initialResult}
        initialValues={{
          goal: parsed?.success ? parsed.data.goal : undefined,
          age: age ? Number(age) : undefined,
          country,
          occupation,
          experience: experience ? Number(experience) : undefined,
          passport,
        }}
      />
    </div>
  );
}
