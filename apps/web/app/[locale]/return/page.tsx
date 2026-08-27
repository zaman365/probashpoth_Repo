import { CapabilitySurface } from '@/components/CapabilitySurface';
import { parseLocaleParam } from '@/lib/i18n';
const x = (bn: string, en: string) => ({ bn, en });
export default async function ReturnPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = parseLocaleParam((await params).locale);
  return (
    <CapabilitySurface
      locale={locale}
      status="FOUNDATION"
      title={x('ফেরা ও পরবর্তী যাত্রা', 'Return and next move')}
      intro={x(
        'চুক্তি শেষ, দেশে ফেরা, দক্ষতার রেকর্ড, পুনঃএকত্রীকরণ ও পরবর্তী বিদেশযাত্রা—ব্যবহারকারীর নিজের লক্ষ্য অনুযায়ী।',
        'Contract completion, return, skills record, reintegration and a next overseas move—according to the user’s own goal.',
      )}
      sections={[
        {
          title: x('ফেরার প্রস্তুতি', 'Return preparation'),
          body: x(
            'ডকুমেন্ট, পাওনা, সঞ্চয়, পরিবার ও সরকারি সহায়তার তালিকা।',
            'Documents, dues, savings, family and public support checklist.',
          ),
        },
        {
          title: x('দক্ষতার রেকর্ড', 'Skills record'),
          body: x(
            'বিদেশে শেখা দক্ষতা ও অভিজ্ঞতার প্রমাণ পুনরায় ব্যবহারযোগ্য থাকে।',
            'Evidence of skills and experience gained abroad remains reusable.',
          ),
        },
        {
          title: x('নিজের পছন্দ', 'Your choice'),
          body: x(
            'চাকরিতে ফেরা, উদ্যোগ, সরকারি সেবা বা পরবর্তী নিরাপদ যাত্রা—কোনোটিই বাধ্যতামূলক নয়।',
            'Employment, entrepreneurship, public support or a next safe journey—none is forced.',
          ),
        },
      ]}
    />
  );
}
