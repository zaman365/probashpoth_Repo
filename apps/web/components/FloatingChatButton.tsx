import Link from 'next/link';
import type { Locale } from '@probash/domain';
import { localeSegment, translator } from '@/lib/i18n';

export function FloatingChatButton({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const seg = localeSegment(locale);

  return (
    <Link
      href={`/${seg}/help`}
      className="floating-chat-button no-print"
      aria-label={t('common.openSupportChat')}
      title={t('common.openSupportChat')}
    >
      <span className="floating-chat-icon" aria-hidden="true">
        <span className="floating-chat-bubble">•••</span>
      </span>
      <span className="floating-chat-label">{t('common.chat')}</span>
    </Link>
  );
}
