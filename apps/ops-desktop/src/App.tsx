import { useState } from 'react';
import { lookupMessage } from '@probash/i18n';
import { cssVariables } from '@probash/design-tokens';
import { createApiClient } from '@probash/contracts';
import type { PublicJobVerificationDto } from '@probash/contracts';

const t = (key: string) => lookupMessage('bn-BD', key) ?? key;

const apiRequest = createApiClient({
  baseUrl: import.meta.env['VITE_API_BASE_URL'] ?? 'http://localhost:3001',
  defaultLocale: 'bn-BD',
});

/**
 * Operator desk shell (§14.4, §55). The first genuinely useful desk function is
 * verification: an operator checks an id for a worker standing in front of them.
 *
 * What this shell must never grow: a way to take recruitment cash, edit a verified
 * cost, or record consent the worker did not give (§27).
 */
export function App() {
  const [publicId, setPublicId] = useState('');
  const [result, setResult] = useState<PublicJobVerificationDto | undefined>();
  const [error, setError] = useState(false);

  async function check() {
    setError(false);
    try {
      setResult(
        await apiRequest<PublicJobVerificationDto>(
          `/api/v1/verify/job/${encodeURIComponent(publicId.trim())}`,
        ),
      );
    } catch {
      setResult(undefined);
      setError(true);
    }
  }

  return (
    <>
      <style>{cssVariables()}</style>
      <main
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: 'var(--space-lg)',
          fontFamily: 'var(--font-family-bangla)',
          color: 'var(--color-text-primary)',
          background: 'var(--color-background)',
          minHeight: '100vh',
        }}
      >
        <h1 style={{ fontSize: 'var(--font-size-heading)' }}>{t('scanner.title')}</h1>
        <p>{t('scanner.help')}</p>

        <label htmlFor="publicId">{t('scanner.publicIdLabel')}</label>
        <input
          id="publicId"
          value={publicId}
          onChange={(event) => setPublicId(event.target.value)}
          style={{
            display: 'block',
            width: '100%',
            minHeight: 'var(--size-tap-target-min)',
            marginBlock: 'var(--space-sm)',
            fontSize: 'var(--font-size-body)',
          }}
        />
        <button
          type="button"
          onClick={check}
          style={{
            minHeight: 'var(--size-tap-target-min)',
            paddingInline: 'var(--space-lg)',
            background: 'var(--color-accent)',
            color: 'var(--color-text-on-accent)',
            border: 0,
            borderRadius: 'var(--radius-md)',
          }}
        >
          {t('scanner.checkNow')}
        </button>

        {error ? <p>{t('common.errorBody')}</p> : null}
        {result ? (
          <section style={{ marginBlockStart: 'var(--space-lg)' }}>
            <h2>
              {result.status === 'verified' ? t('job.verifiedJob') : t('verification.unverified')}
            </h2>
            <p>{result.employerName?.bn}</p>
            <p>{t('cost.payOnlyHere')}</p>
          </section>
        ) : null}
      </main>
    </>
  );
}
