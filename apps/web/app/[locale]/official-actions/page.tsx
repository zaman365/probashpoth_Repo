import { z } from 'zod';
import { officialActionSchema } from '@probash/contracts';
import { apiRequest } from '@/lib/api';
import { parseLocaleParam, pick } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function OfficialActionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocaleParam((await params).locale);
  const actions = await apiRequest('/api/v1/official-actions?country=BD', {
    locale,
    schema: z.array(officialActionSchema),
  });
  return (
    <div className="wide-page stack-lg">
      <header className="hero">
        <div className="stack">
          <span className="badge badge-info">
            {locale === 'bn-BD'
              ? 'সরকারি সিস্টেমেই কাজ সম্পন্ন হয়'
              : 'Actions finish in the official system'}
          </span>
          <h1>{locale === 'bn-BD' ? 'সরকারি কাজ ও হ্যান্ডঅফ' : 'Official actions and handoffs'}</h1>
          <p>
            {locale === 'bn-BD'
              ? 'প্রবাসযাত্রা প্রস্তুতি বুঝিয়ে দেয়, সঠিক সরকারি লিংক দেয় এবং আপনি চাইলে সম্পন্ন হয়েছে বলে নথিবদ্ধ করে। এটি কোনো সরকারি পোর্টাল নয়।'
              : 'Probashjatra explains preparation, links to the correct authority and can record your own confirmation. It is not a government portal.'}
          </p>
        </div>
      </header>
      <ul className="grid-cards">
        {actions.map((action) => (
          <li className="card stack" key={action.id}>
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-neutral">{action.actionType}</span>
              <span className="badge badge-info">{action.feeType}</span>
            </div>
            <h2>{pick(action.title, locale)}</h2>
            <p>{pick(action.description, locale)}</p>
            <p className="muted">{pick(action.authority, locale)}</p>
            <a
              className="btn btn-primary"
              href={action.officialUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              {locale === 'bn-BD' ? 'সরকারি সাইট খুলুন' : 'Open official site'}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
