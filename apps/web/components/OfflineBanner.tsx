'use client';

import { useEffect, useState } from 'react';

/** §15 — an offline state is shown, never silently stale. */
export function OfflineBanner({ label }: { label: string }) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="badge badge-warning no-print" role="status" style={{ width: '100%' }}>
      <span aria-hidden="true">📶</span>
      <span>{label}</span>
    </div>
  );
}
