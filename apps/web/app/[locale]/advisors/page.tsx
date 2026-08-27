import { CapabilitySurface } from '@/components/CapabilitySurface';
import { parseLocaleParam } from '@/lib/i18n';
const x = (bn: string, en: string) => ({ bn, en });
export default async function AdvisorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = parseLocaleParam((await params).locale);
  return (
    <CapabilitySurface
      locale={locale}
      status="FOUNDATION"
      title={x('যাচাইকৃত বিশেষজ্ঞ সহায়তা', 'Verified specialist help')}
      intro={x(
        'সেলস কল নয়: আপনার অনুরোধ, জটিলতা, দ্বন্দ্ব, ঝুঁকি বা কম নির্ভরযোগ্য তথ্য হলে সীমিত কেস-কনটেক্সটে বিশেষজ্ঞ সহায়তা।',
        'Not a sales callback: specialist help is offered for user request, complexity, conflict, risk or low-confidence data, with scoped case context.',
      )}
      sections={[
        {
          title: x('বিশেষায়ন', 'Specialisations'),
          body: x(
            'ওয়ার্ক/স্টাডি পথ, ভিসা, স্বীকৃতি, চুক্তি, স্কলারশিপ, ফাইন্যান্স, ডকুমেন্ট, ইন্টারভিউ ও প্রি-ডিপার্চার।',
            'Work or Study pathways, visa, recognition, contract, scholarship, finance, documents, interview and pre-departure.',
          ),
        },
        {
          title: x('স্বচ্ছ প্রোফাইল', 'Transparent profile'),
          body: x(
            'পরিচয়/যোগ্যতা, ভাষা, দেশ, দাম, বাণিজ্যিক সম্পর্ক, অভিযোগ ও সীমাবদ্ধতা দেখা যায়।',
            'Identity or credentials, language, countries, price, commercial relationships, complaints and restrictions are visible.',
          ),
        },
        {
          title: x('ব্যবহারকারীর নিয়ন্ত্রণ', 'User control'),
          body: x(
            'উপদেষ্টা পুরো প্রোফাইল পান না, গোপনে তথ্য বদলাতে বা আবেদন জমা দিতে পারেন না।',
            'Advisors do not receive the whole profile and cannot silently edit facts or submit an application.',
          ),
        },
      ]}
    />
  );
}
