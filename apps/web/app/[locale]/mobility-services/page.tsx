import { z } from 'zod';
import { capabilityRegistryItemSchema } from '@probash/contracts';
import { apiRequest } from '@/lib/api';
import { parseLocaleParam, pick } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function MobilityServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocaleParam((await params).locale);
  const capabilities = await apiRequest('/api/v1/mobility-capabilities', {
    locale,
    schema: z.array(capabilityRegistryItemSchema),
  });
  return (
    <div className="wide-page stack-lg">
      <header className="hero">
        <div className="stack">
          <h1>{locale === 'bn-BD' ? 'সম্পূর্ণ যাত্রা সহায়তা' : 'Whole-journey support'}</h1>
          <p>
            {locale === 'bn-BD'
              ? 'যাচাইকৃত উপদেষ্টা, সেবা, শেখা, পৌঁছানো, কমিউনিটি, ইভেন্ট, সহায়তা কেন্দ্র ও ফেরার পরিকল্পনার প্রকৃত প্রস্তুতির অবস্থা।'
              : 'The honest readiness state for advisors, services, learning, arrival, community, events, assisted centres and return planning.'}
          </p>
        </div>
      </header>
      <ul className="grid-cards">
        {capabilities.map((item) => (
          <li className="card stack" key={item.key}>
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-info">{item.priority}</span>
              <span className={`badge ${item.live ? 'badge-success' : 'badge-warning'}`}>
                {item.status}
              </span>
            </div>
            <h2>{pick(item.title, locale)}</h2>
            <ul>
              {item.safeguards.map((guard, index) => (
                <li key={`${item.key}-${index}`}>{pick(guard, locale)}</li>
              ))}
            </ul>
            {!item.live ? (
              <p className="muted">
                {locale === 'bn-BD'
                  ? 'এটি এখনো লাইভ সেবা হিসেবে দাবি করা হচ্ছে না।'
                  : 'This is not claimed as a live service yet.'}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
