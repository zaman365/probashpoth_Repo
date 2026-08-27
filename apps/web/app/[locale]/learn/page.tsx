import { CapabilitySurface } from '@/components/CapabilitySurface';
import { parseLocaleParam } from '@/lib/i18n';
const x = (bn: string, en: string) => ({ bn, en });
export default async function LearnPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = parseLocaleParam((await params).locale);
  return (
    <CapabilitySurface
      locale={locale}
      status="FOUNDATION"
      title={x('যাত্রাভিত্তিক শেখা', 'Journey learning')}
      intro={x(
        '৩–১২ মিনিটের ছোট মডিউল সঠিক দেশ, পথ ও ধাপে দেখানো হয়—এটি আলাদা কোর্স বিক্রির তালিকা নয়।',
        'Short 3–12 minute modules appear at the right country, route and stage—not as a disconnected course catalogue.',
      )}
      sections={[
        {
          title: x('কাজ', 'Work'),
          body: x(
            'চুক্তি পড়া, প্রশ্নযোগ্য ফি, এজেন্সি যাচাই, চুক্তি বদল, প্রথম পে-স্লিপ ও অধিকার।',
            'Reading contracts, questionable fees, agency checks, contract substitution, first payslip and rights.',
          ),
        },
        {
          title: x('স্টাডি', 'Study'),
          body: x(
            'বিশ্ববিদ্যালয় তুলনা, মোট খরচ, SOP, স্কলারশিপ বাস্তবতা, ভিসা ইন্টারভিউ ও পোস্ট-স্টাডি পরিকল্পনা।',
            'University comparison, total cost, SOP, scholarship reality, visa interview and post-study planning.',
          ),
        },
        {
          title: x('উৎস ও মেয়াদ', 'Sources and review'),
          body: x(
            'প্রতিটি মডিউলে উৎস ও শেষ পর্যালোচনার তারিখ থাকে।',
            'Every module carries its sources and last-reviewed date.',
          ),
        },
      ]}
    />
  );
}
