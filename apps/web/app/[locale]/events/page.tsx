import { CapabilitySurface } from '@/components/CapabilitySurface';
import { parseLocaleParam } from '@/lib/i18n';
const x = (bn: string, en: string) => ({ bn, en });
export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = parseLocaleParam((await params).locale);
  return (
    <CapabilitySurface
      locale={locale}
      status="PILOT"
      title={x('গ্লোবাল অপরচুনিটি ডে', 'Global Opportunity Days')}
      intro={x(
        'বিশ্ববিদ্যালয়, নিয়োগকর্তা, লাইসেন্সপ্রাপ্ত এজেন্সি, প্রশিক্ষণ ও সরকারি তথ্য—যাচাইকৃত সুযোগের সাথে যুক্ত হাইব্রিড সেশন।',
        'Hybrid sessions for institutions, employers, licensed recruiters, training and public information, linked to verified opportunities.',
      )}
      sections={[
        {
          title: x('ব্যবহারকারীর সম্মতি', 'User consent'),
          body: x(
            'ইভেন্টে যোগ দিলেই কোনো প্রদানকারী আপনার তথ্য পায় না।',
            'Attending never gives a provider your data automatically.',
          ),
        },
        {
          title: x('স্ট্রাকচার্ড সুযোগ', 'Structured opportunities'),
          body: x(
            'নিয়োগকর্তার প্রতিটি চাকরি যাচাইকৃত Job/Opportunity রেকর্ডে যুক্ত হতে হবে।',
            'Every employer vacancy must link to a verified Job or Opportunity record.',
          ),
        },
        {
          title: x('পরবর্তী কাজ', 'Follow-up'),
          body: x(
            'সেভ, QuickCheck, ইন্টারভিউ স্লট ও JourneyCase টাস্ক এক জায়গায়।',
            'Save, QuickCheck, interview slots and JourneyCase follow-up in one place.',
          ),
        },
      ]}
    />
  );
}
