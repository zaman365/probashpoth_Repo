import { CapabilitySurface } from '@/components/CapabilitySurface';
import { parseLocaleParam } from '@/lib/i18n';
const x = (bn: string, en: string) => ({ bn, en });
export default async function IntelligencePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocaleParam((await params).locale);
  return (
    <CapabilitySurface
      locale={locale}
      status="AVAILABLE"
      title={x('মোবিলিটি ইন্টেলিজেন্স', 'Mobility Intelligence')}
      intro={x(
        'ভিসা, ফি, চাকরি, স্কলারশিপ, স্বীকৃতি, স্ক্যাম ও অধিকার বদলকে উৎস ও প্রভাবিত যাত্রার সাথে যুক্ত করা হয়।',
        'Visa, fee, job, scholarship, recognition, scam and rights changes are connected to sources and affected journeys.',
      )}
      sections={[
        {
          title: x('কী বদলেছে', 'What changed'),
          body: x(
            'প্রকাশের তারিখ, যাচাইয়ের তারিখ, কর্তৃপক্ষ, দেশ/রুট ও পরিবর্তনের সারাংশ।',
            'Publication date, verification date, authority, country or route and a change summary.',
          ),
        },
        {
          title: x('আমার যাত্রায় প্রভাব', 'Impact on my journey'),
          body: x(
            'সক্রিয় কেসে প্রভাব পড়লে নিয়ম পুনঃমূল্যায়ন, নোটিফিকেশন ও পরবর্তী কাজ আপডেট হয়।',
            'Affected active cases are re-evaluated, notified and given revised next actions.',
          ),
        },
        {
          title: x('ডেটা ফ্রেশনেস', 'Data freshness'),
          body: x(
            'বাসি নিয়ম, ভাঙা লিংক, মেয়াদোত্তীর্ণ ফি/লাইসেন্স ও মানব পর্যালোচনা অপারেশন ড্যাশবোর্ডে যায়।',
            'Stale rules, broken links, expired fees or licences and pending reviews enter the operations dashboard.',
          ),
        },
      ]}
    />
  );
}
