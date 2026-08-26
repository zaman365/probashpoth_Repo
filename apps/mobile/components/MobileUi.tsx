import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { lookupMessage } from '@probash/i18n';
import { tokens } from '@probash/design-tokens';

export const t = (key: string) => lookupMessage('bn-BD', key) ?? key;

export function Screen({
  title,
  children,
  stale,
}: PropsWithChildren<{ title: string; stale?: boolean }>) {
  return (
    <ScrollView
      contentContainerStyle={{
        padding: tokens.space.md,
        paddingBottom: tokens.space['3xl'],
        gap: tokens.space.md,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{
          fontSize: tokens.typography.scale.heading,
          lineHeight: 44,
          fontWeight: '700',
          color: tokens.semanticLight.textPrimary,
        }}
      >
        {title}
      </Text>
      {stale ? <Notice tone="warning">{t('common.offline')}</Notice> : null}
      {children}
    </ScrollView>
  );
}

export function Card({ children }: PropsWithChildren) {
  return (
    <View
      style={{
        gap: tokens.space.sm,
        padding: tokens.space.md,
        borderWidth: 1,
        borderColor: tokens.semanticLight.border,
        borderRadius: tokens.radius.lg,
        backgroundColor: tokens.semanticLight.surface,
      }}
    >
      {children}
    </View>
  );
}

export function Notice({
  children,
  tone = 'info',
}: PropsWithChildren<{ tone?: 'info' | 'warning' | 'danger' | 'success' }>) {
  const palette = tokens.color[tone];
  return (
    <View
      accessibilityRole="alert"
      style={{
        padding: tokens.space.md,
        borderRadius: tokens.radius.md,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.bg,
      }}
    >
      <Text style={{ color: palette.fg, lineHeight: 28 }}>{children}</Text>
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
  disabled,
  secondary,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: tokens.size.tapTargetMin,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: tokens.space.md,
        borderRadius: tokens.radius.md,
        borderWidth: secondary ? 1 : 0,
        borderColor: tokens.semanticLight.accent,
        backgroundColor: secondary ? tokens.semanticLight.surface : tokens.semanticLight.accent,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text
        style={{
          fontSize: tokens.typography.scale.body,
          fontWeight: '700',
          color: secondary ? tokens.semanticLight.accent : tokens.semanticLight.textOnAccent,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        fontSize: tokens.typography.scale.caption,
        color: tokens.semanticLight.textSecondary,
      }}
    >
      {children}
    </Text>
  );
}

export function Value({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        fontSize: tokens.typography.scale.body,
        lineHeight: 30,
        color: tokens.semanticLight.textPrimary,
      }}
    >
      {children}
    </Text>
  );
}

export function ResourceState({
  loading,
  error,
  empty,
}: {
  loading: boolean;
  error?: string;
  empty?: boolean;
}) {
  if (loading) return <Value>{t('common.loading')}</Value>;
  if (error) return <Notice tone="danger">{t('common.errorBody')}</Notice>;
  if (empty) return <Notice>{t('mobile.empty')}</Notice>;
  return null;
}
