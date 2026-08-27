import { CapabilitySurface } from '@/components/CapabilitySurface';
import { parseLocaleParam } from '@/lib/i18n';
const x = (bn: string, en: string) => ({ bn, en });
export default async function ArrivalPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = parseLocaleParam((await params).locale);
  return (
    <CapabilitySurface
      locale={locale}
      status="FOUNDATION"
      title={x('পৌঁছানোর পরের সহায়তা', 'Arrival mode')}
      intro={x(
        'দেশভিত্তিক সরকারি/কম খরচের কাজ আগে; যাচাইকৃত অংশীদার পরে। কোনো খরচ নিশ্চয়তা নয়।',
        'Country-specific public and low-cost actions first, verified partners second. Costs are never guarantees.',
      )}
      sections={[
        {
          title: x('প্রথম ৭২ ঘণ্টা', 'First 72 hours'),
          body: x(
            'সীমান্ত, ঠিকানা, সিম, পরিবহন, নিয়োগকর্তা/প্রতিষ্ঠানে রিপোর্ট ও জরুরি নম্বর।',
            'Border, address, SIM, transport, employer or institution check-in and emergency numbers.',
          ),
        },
        {
          title: x('প্রথম ৩০ দিনের বাজেট', 'First 30-day budget'),
          body: x(
            'ডিপোজিট, ভাড়া, খাবার, পরিবহন, বিমা, নিবন্ধন ও জরুরি সঞ্চয়—তারিখসহ রেঞ্জে।',
            'Deposit, rent, food, transport, insurance, registration and emergency buffer as dated ranges.',
          ),
        },
        {
          title: x('অধিকার ও নবায়ন', 'Rights and renewal'),
          body: x(
            'চুক্তি/পে-স্লিপ, কর্মী বা ছাত্র অধিকার, কনস্যুলার সহায়তা এবং নবায়নের সময়সীমা।',
            'Contract or payslip, worker or student rights, consular help and renewal deadlines.',
          ),
        },
      ]}
    />
  );
}
