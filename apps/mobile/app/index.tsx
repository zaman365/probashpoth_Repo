import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { lookupMessage } from '@probash/i18n';
import { tokens } from '@probash/design-tokens';

const t = (key: string) => lookupMessage('bn-BD', key) ?? key;

/**
 * §15 — the same seven primary actions as web, sized for a cheap Android phone:
 * ≥48px targets, text + icon, one question per screen.
 */
const ACTIONS = [
  { href: '/jobs', icon: '🧰', key: 'home.findWork' },
  { href: '/study', icon: '🎓', key: 'home.findStudy' },
  { href: '/verify', icon: '🔎', key: 'home.verifyOffer' },
  { href: '/cases', icon: '📋', key: 'home.myApplications' },
  { href: '/cost', icon: '💰', key: 'home.howMuchCost' },
  { href: '/prepare', icon: '📚', key: 'home.howToPrepare' },
  { href: '/help', icon: '🆘', key: 'home.getHelp' },
] as const;

export default function Home() {
  return (
    <ScrollView contentContainerStyle={{ padding: tokens.space.md, gap: tokens.space.md }}>
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
        <Link key={action.key} href={action.href} asChild>
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
    </ScrollView>
  );
}
