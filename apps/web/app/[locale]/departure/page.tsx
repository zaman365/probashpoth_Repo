import { CapabilitySurface } from '@/components/CapabilitySurface';
import { parseLocaleParam } from '@/lib/i18n';
const x = (bn: string, en: string) => ({ bn, en });
export default async function DeparturePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = parseLocaleParam((await params).locale);
  return (
    <CapabilitySurface
      locale={locale}
      status="AVAILABLE"
      title={x('যাত্রার আগের প্রস্তুতি', 'Departure readiness')}
      intro={x(
        'ডকুমেন্ট, টাকা, বিমানবন্দর, নিরাপত্তা, ঠিকানা ও প্রথম ৭২ ঘণ্টার সহজ চেকলিস্ট।',
        'A simple checklist for documents, money, airport, safety, address and the first 72 hours.',
      )}
      sections={[
        {
          title: x('সবার জন্য', 'For everyone'),
          body: x(
            'ডিজিটাল ও কাগজের কপি, জরুরি যোগাযোগ, ওষুধ, ব্যাগেজ, ট্রানজিট স্ক্যাম ও পরিবারের যোগাযোগ পরিকল্পনা।',
            'Digital and paper copies, emergency contacts, medicines, baggage, transit scams and a family contact plan.',
          ),
        },
        {
          title: x('কাজের যাত্রী', 'Work travellers'),
          body: x(
            'স্বাক্ষরিত চুক্তি, নিয়োগকর্তার ঠিকানা, বেতন/ঘণ্টা, রসিদ, অধিকার ও চুক্তি বদলের সতর্কতা।',
            'Signed contract, employer address, salary/hours, receipts, rights and contract-substitution warning.',
          ),
        },
        {
          title: x('স্টাডি যাত্রী', 'Study travellers'),
          body: x(
            'ভর্তি, টিউশন, বাসস্থান, বিমা, ওরিয়েন্টেশন ও ছাত্র হিসেবে কাজের নিয়ম।',
            'Admission, tuition, housing, insurance, orientation and student work rules.',
          ),
        },
      ]}
    />
  );
}
