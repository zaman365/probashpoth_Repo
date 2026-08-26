import bn from '../messages/bn.json';
import en from '../messages/en.json';
import type { Locale } from '@probash/domain';

export type MessageTree = { [key: string]: string | MessageTree };

export const CATALOGUES: Record<Locale, MessageTree> = {
  'bn-BD': bn as MessageTree,
  en: en as MessageTree,
};

export function getMessages(locale: Locale): MessageTree {
  return CATALOGUES[locale] ?? CATALOGUES['bn-BD'];
}

export function flattenMessages(tree: MessageTree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else Object.assign(out, flattenMessages(value, path));
  }
  return out;
}

export function messageKeys(locale: Locale): string[] {
  return Object.keys(flattenMessages(getMessages(locale))).sort();
}

/** Resolve a dotted key. Returns undefined rather than an English fallback string. */
export function lookupMessage(locale: Locale, key: string): string | undefined {
  return flattenMessages(getMessages(locale))[key];
}
