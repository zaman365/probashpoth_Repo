'use client';

import { useState } from 'react';
import type { Locale } from '@probash/domain';
import type { ScanResultDto } from '@probash/contracts';
import { ScanResult, type ScanLabels } from '@/components/ScanResult';

interface Labels extends ScanLabels {
  publicIdLabel: string;
  pasteMessage: string;
  checkNow: string;
  error: string;
}

export function ScannerForm({
  locale,
  labels,
  defaultPublicId,
}: {
  locale: Locale;
  labels: Labels;
  defaultPublicId?: string;
}) {
  const [result, setResult] = useState<ScanResultDto | undefined>();
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(false);
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          publicJobId: String(form.get('publicJobId') ?? '') || undefined,
          messageText: String(form.get('messageText') ?? '') || undefined,
        }),
      });
      if (!response.ok) throw new Error('scan failed');
      setResult((await response.json()) as ScanResultDto);
    } catch {
      setError(true);
      setResult(undefined);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack-lg">
      <form onSubmit={onSubmit} className="card stack">
        <label htmlFor="publicJobId">{labels.publicIdLabel}</label>
        <input
          id="publicJobId"
          name="publicJobId"
          className="field"
          placeholder="BD-QA-2026-00000000"
          defaultValue={defaultPublicId}
        />
        <label htmlFor="messageText">{labels.pasteMessage}</label>
        <textarea id="messageText" name="messageText" className="field" rows={5} />
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {labels.checkNow}
        </button>
      </form>

      {error ? <p className="badge badge-danger">{labels.error}</p> : null}

      {result ? <ScanResult result={result} locale={locale} labels={labels} /> : null}
    </div>
  );
}
