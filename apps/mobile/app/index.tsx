import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { tokens } from '@probash/design-tokens';
import { flushDocumentUploads, flushMutationQueue } from '../lib/offline';
import { Notice, t } from '../components/MobileUi';

/**
 * Blueprint P4 — the complete mobile journey, sized for a cheap Android phone:
 * ≥48px targets, text + icon, one question per screen.
 */
const ACTIONS = [
  { href: '/sign-in', icon: '🔐', key: 'mobile.signIn' },
  { href: '/passport', icon: '🪪', key: 'mobile.passport' },
  { href: '/matches', icon: '🧭', key: 'mobile.matches' },
  { href: '/verify', icon: '🔎', key: 'home.verifyOffer' },
  { href: '/cases', icon: '📋', key: 'home.myApplications' },
  { href: '/documents', icon: '📄', key: 'mobile.documents' },
  { href: '/payments', icon: '💳', key: 'mobile.payments' },
  { href: '/alerts', icon: '🔔', key: 'mobile.alerts' },
  { href: '/family', icon: '👪', key: 'mobile.family' },
  { href: '/study-applications', icon: '🎓', key: 'mobile.studyApplications' },
  { href: '/outcomes', icon: '📈', key: 'mobile.outcomes' },
] as const;

export default function Home() {
  const [syncMessage, setSyncMessage] = useState<string>();

  async function sync() {
    try {
      const [mutations, documents] = await Promise.all([
        flushMutationQueue(),
        flushDocumentUploads(),
      ]);
      setSyncMessage(`${t('mobile.syncComplete')} ${mutations + documents}`);
    } catch {
      setSyncMessage(t('common.offline'));
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: tokens.space.md, gap: tokens.space.md }}>
      <Text style={{ color: tokens.semanticLight.accent, fontWeight: '700' }}>
        {t('mobile.brand')}
      </Text>
      <Text
        style={{
          fontSize: tokens.typography.scale.heading,
          fontWeight: '700',
          color: tokens.semanticLight.textPrimary,
        }}
      >
        {t('home.question')}
      </Text>

      {ACTIONS.map((action) => (
        <Link key={action.key} href={action.href as never} asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(action.key)}
            style={{
              minHeight: tokens.size.tapTargetPrimary,
              flexDirection: 'row',
              alignItems: 'center',
              gap: tokens.space.md,
              padding: tokens.space.lg,
              borderRadius: tokens.radius.lg,
              borderWidth: 1,
              borderColor: tokens.semanticLight.border,
              backgroundColor: tokens.semanticLight.surface,
            }}
          >
            <Text style={{ fontSize: tokens.typography.scale.heading }}>{action.icon}</Text>
            <Text
              style={{
                fontSize: tokens.typography.scale.bodyLarge,
                fontWeight: '600',
                color: tokens.semanticLight.textPrimary,
              }}
            >
              {t(action.key)}
            </Text>
          </Pressable>
        </Link>
      ))}

      <View
        style={{
          padding: tokens.space.md,
          borderRadius: tokens.radius.md,
          backgroundColor: tokens.color.warning.bg,
        }}
      >
        <Text style={{ color: tokens.color.warning.fg }}>{t('cost.payOnlyHere')}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => void sync()}
        style={{
          minHeight: tokens.size.tapTargetMin,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: tokens.semanticLight.accent,
          borderRadius: tokens.radius.md,
        }}
      >
        <Text style={{ color: tokens.semanticLight.accent, fontWeight: '700' }}>
          {t('mobile.syncNow')}
        </Text>
      </Pressable>
      {syncMessage ? <Notice>{syncMessage}</Notice> : null}
    </ScrollView>
  );
}
