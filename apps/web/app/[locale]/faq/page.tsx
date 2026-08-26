import type { Metadata } from 'next';
import { Disclosure, Section } from '@probash/web-ui';
import { parseLocaleParam, translator } from '@/lib/i18n';
import { canonicalMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const t = translator(locale);
  return canonicalMetadata({
    locale,
    path: '/faq',
    title: t('site.faqPageTitle'),
    description: t('site.faq2Q'),
  });
}

export function generateStaticParams() {
  return [{ locale: 'bn' }, { locale: 'en' }];
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const t = translator(locale);

  const faqs = [1, 2, 3, 4, 5, 6].map((n) => ({
    question: t(`site.faq${n}Q`),
    answer: t(`site.faq${n}A`),
  }));

  return (
    <>
      <Section
        headingLevel={1}
        surface="warm"
        title={t('site.faqPageTitle')}
        lead={t('site.heroLead')}
      />
      <Section surface="default" width="prose">
        {/* Structured data so the answers can surface directly in search results. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.map((faq) => ({
                '@type': 'Question',
                name: faq.question,
                acceptedAnswer: { '@type': 'Answer', text: faq.answer },
              })),
            }),
          }}
        />
        <div className="pui-stack pui-stack-sm">
          {faqs.map((faq) => (
            <Disclosure key={faq.question} summary={faq.question}>
              <p>{faq.answer}</p>
            </Disclosure>
          ))}
        </div>
      </Section>
    </>
  );
}
