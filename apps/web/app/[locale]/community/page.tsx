import { CapabilitySurface } from '@/components/CapabilitySurface';
import { parseLocaleParam } from '@/lib/i18n';
const x = (bn: string, en: string) => ({ bn, en });
export default async function CommunityPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = parseLocaleParam((await params).locale);
  return (
    <CapabilitySurface
      locale={locale}
      status="PILOT"
      title={x('নিরাপদ যাত্রা কমিউনিটি', 'Safe journey communities')}
      intro={x(
        'দেশ, পথ, পেশা, প্রতিষ্ঠান, ইনটেক, ধাপ ও শহরভিত্তিক গ্রুপ—শক্তিশালী মডারেশন ছাড়া কোনো ওপেন ব্রোকার মার্কেট নয়।',
        'Groups by country, route, occupation, institution, intake, stage and city—not an open broker marketplace.',
      )}
      sections={[
        {
          title: x('যাচাইকৃত ভূমিকা', 'Verified roles'),
          body: x(
            'মাইগ্র্যান্ট, স্টুডেন্ট, অ্যালামনাই, নিয়োগকর্তা, লাইসেন্সধারী রিক্রুটার, উপদেষ্টা ও মডারেটর ব্যাজ স্বঘোষিত নয়।',
            'Migrant, student, alumni, employer, licensed recruiter, advisor and moderator badges are not self-declared.',
          ),
        },
        {
          title: x('ঝুঁকি নিয়ন্ত্রণ', 'Risk controls'),
          body: x(
            'ফোন নম্বর সংগ্রহ, পেমেন্ট অনুরোধ, বাহ্যিক লিংক ও আনলিংকড চাকরি মডারেশন কিউতে যায়।',
            'Phone harvesting, payment requests, external links and unlinked jobs enter moderation.',
          ),
        },
        {
          title: x('রিপোর্ট ও ব্লক', 'Report and block'),
          body: x(
            'ব্যবহারকারী রিপোর্ট/ব্লক করতে পারেন; বাণিজ্যিক যোগাযোগে যাচাইকৃত প্রদানকারী প্রোফাইল লাগে।',
            'Users can report or block; commercial contact requires a verified provider profile.',
          ),
        },
      ]}
    />
  );
}
