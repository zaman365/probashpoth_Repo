import { CapabilitySurface } from '@/components/CapabilitySurface';
import { parseLocaleParam } from '@/lib/i18n';

const x = (bn: string, en: string) => ({ bn, en });
export default async function VisaPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = parseLocaleParam((await params).locale);
  return (
    <CapabilitySurface
      locale={locale}
      status="AVAILABLE"
      title={x('ভিসা পথ ও প্রস্তুতি', 'Visa pathways and preparation')}
      intro={x(
        'সঠিক ভিসা/পারমিট, যোগ্যতা, স্পনসর, খরচ, কাগজপত্র, অ্যাপয়েন্টমেন্ট, সময় ও সরকারি উৎস এক জায়গায় বুঝুন। আবেদন সরকারি কর্তৃপক্ষের সিস্টেমেই হয়।',
        'Understand the correct visa or permit, eligibility, sponsor, costs, documents, appointments, time and official source. The authority remains responsible for the application.',
      )}
      sections={[
        {
          title: x('প্রথমে যোগ্যতা', 'Eligibility first'),
          body: x(
            'প্রাথমিক ফল, কী জানা নেই এবং কোন প্রমাণ লাগবে আলাদা রাখা হয়।',
            'Preliminary result, unknown data and required evidence are kept separate.',
          ),
          items: [
            x(
              'স্পনসর/নিয়োগকর্তা/প্রতিষ্ঠান নির্ভরতা',
              'Sponsor, employer or institution dependency',
            ),
            x('প্রুফ অব ফান্ড ও পরিবার', 'Proof of funds and family rules'),
          ],
        },
        {
          title: x('সরকারি খরচ ও উৎস', 'Official fees and sources'),
          body: x(
            'ফি, তারিখ ও কর্তৃপক্ষের লিংক না থাকলে তথ্য “অজানা” দেখানো হয়।',
            'A fee without a date and authority source remains unknown.',
          ),
        },
        {
          title: x('হ্যান্ডঅফ', 'Official handoff'),
          body: x(
            'প্রবাসযাত্রা প্রস্তুতি ট্র্যাক করে; অনুমোদিত ইন্টিগ্রেশন ছাড়া সরকারি স্ট্যাটাস দাবি করে না।',
            'Probashjatra tracks preparation and never claims government status without an authorized integration.',
          ),
        },
      ]}
    />
  );
}
