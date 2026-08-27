'use client';

import { useState, type FormEvent } from 'react';
import type { QuickCheckResultDto } from '@probash/contracts';
import type { Locale } from '@probash/domain';
import { localeSegment } from '@/lib/i18n';

const text = {
  'bn-BD': {
    goal: 'আপনার লক্ষ্য',
    work: 'বিদেশে কাজ',
    study: 'উচ্চশিক্ষা',
    training: 'ট্রেনিং',
    explore: 'বিকল্প দেখি',
    age: 'বয়স',
    country: 'পছন্দের দেশ (যেমন DE)',
    occupation: 'পেশা (যেমন electrician)',
    experience: 'অভিজ্ঞতা (মাস)',
    passport: 'বৈধ পাসপোর্ট আছে',
    submit: 'প্রাথমিক পথ দেখুন',
    loading: 'যাচাই হচ্ছে…',
    error: 'এখন যাচাই করা যাচ্ছে না। পরে আবার চেষ্টা করুন।',
    result: 'আপনার প্রাথমিক পথ',
    missing: 'যা জানা/প্রস্তুত করা দরকার',
    source: 'সরকারি/যাচাইকৃত উৎস',
    coverage: 'সহায়তার স্তর',
    confidence: 'তথ্যের অবস্থা',
  },
  en: {
    goal: 'Your goal',
    work: 'Work abroad',
    study: 'Higher study',
    training: 'Training',
    explore: 'Explore options',
    age: 'Age',
    country: 'Preferred country (for example DE)',
    occupation: 'Occupation (for example electrician)',
    experience: 'Experience (months)',
    passport: 'I have a valid passport',
    submit: 'Show preliminary routes',
    loading: 'Checking…',
    error: 'The check is unavailable right now. Please try again later.',
    result: 'Your preliminary routes',
    missing: 'What needs evidence or preparation',
    source: 'Official/verified sources',
    coverage: 'Support level',
    confidence: 'Data status',
  },
} as const;

export function QuickCheckForm({
  locale,
  initialResult = null,
  initialValues = {},
}: {
  locale: Locale;
  initialResult?: QuickCheckResultDto | null;
  initialValues?: {
    goal?: 'WORK' | 'STUDY' | 'TRAINING' | 'EXPLORE';
    age?: number;
    country?: string;
    occupation?: string;
    experience?: number;
    passport?: boolean;
  };
}) {
  const copy = text[locale];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<QuickCheckResultDto | null>(initialResult);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(false);
    const form = new FormData(event.currentTarget);
    const country = String(form.get('country') ?? '')
      .trim()
      .toUpperCase();
    const response = await fetch('/api/unified/quick-check', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'accept-language': locale },
      body: JSON.stringify({
        goal: form.get('goal'),
        age: form.get('age') ? Number(form.get('age')) : undefined,
        citizenship: 'BD',
        residenceCountry: 'BD',
        occupationKey: String(form.get('occupation') ?? '').trim() || undefined,
        experienceMonths: form.get('experience') ? Number(form.get('experience')) : undefined,
        languageCertificates: [],
        skillCertificates: [],
        preferredCountryCodes: country ? [country] : [],
        hasValidPassport: form.get('passport') === 'on',
      }),
    });
    setLoading(false);
    if (!response.ok) {
      setError(true);
      return;
    }
    setResult((await response.json()) as QuickCheckResultDto);
  }

  return (
    <div className="stack-lg">
      <form
        className="card stack"
        method="get"
        action={`/${localeSegment(locale)}/quick-check`}
        onSubmit={submit}
      >
        <label className="stack gap-2">
          <span>{copy.goal}</span>
          <select name="goal" defaultValue={initialValues.goal ?? 'WORK'}>
            <option value="WORK">{copy.work}</option>
            <option value="STUDY">{copy.study}</option>
            <option value="TRAINING">{copy.training}</option>
            <option value="EXPLORE">{copy.explore}</option>
          </select>
        </label>
        <div className="grid-cards">
          <label className="stack gap-2">
            <span>{copy.age}</span>
            <input
              name="age"
              type="number"
              inputMode="numeric"
              min={15}
              max={100}
              defaultValue={initialValues.age}
            />
          </label>
          <label className="stack gap-2">
            <span>{copy.country}</span>
            <input
              name="country"
              maxLength={2}
              autoCapitalize="characters"
              defaultValue={initialValues.country}
            />
          </label>
          <label className="stack gap-2">
            <span>{copy.occupation}</span>
            <input name="occupation" autoComplete="off" defaultValue={initialValues.occupation} />
          </label>
          <label className="stack gap-2">
            <span>{copy.experience}</span>
            <input
              name="experience"
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={initialValues.experience}
            />
          </label>
        </div>
        <label className="flex gap-2 items-center">
          <input name="passport" type="checkbox" defaultChecked={initialValues.passport} />
          <span>{copy.passport}</span>
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? copy.loading : copy.submit}
        </button>
        {error ? (
          <p className="badge badge-danger" role="alert">
            {copy.error}
          </p>
        ) : null}
      </form>

      {result ? (
        <section className="stack-lg" aria-live="polite">
          <h2>{copy.result}</h2>
          <p className="card-muted">
            {locale === 'bn-BD' ? result.disclaimer.bn : result.disclaimer.en}
          </p>
          {result.routes.length === 0 ? <p className="card">{copy.error}</p> : null}
          <ul className="grid-cards">
            {result.routes.map((route) => (
              <li className="card stack" key={route.routeVersionId}>
                <h3>{locale === 'bn-BD' ? route.title.bn : route.title.en}</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-info">{route.fit}</span>
                  <span className="badge badge-neutral">
                    {copy.coverage}: {route.coverageMaturity}
                  </span>
                  <span className="badge badge-warning">
                    {copy.confidence}: {route.confidence}
                  </span>
                </div>
                <div>
                  <strong>{copy.missing}</strong>
                  <ul>
                    {route.preparationGaps.map((gap, index) => (
                      <li key={`${route.routeVersionId}-gap-${index}`}>
                        {locale === 'bn-BD' ? gap.bn : gap.en}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>{copy.source}</strong>
                  <ul>
                    {route.sources.map((source) => (
                      <li key={source.id}>
                        <a href={source.url} target="_blank" rel="noreferrer noopener">
                          {locale === 'bn-BD' ? source.authority.bn : source.authority.en}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
