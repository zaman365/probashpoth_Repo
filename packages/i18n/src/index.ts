/**
 * @probash/i18n — message catalogues, translation governance and formatting.
 *
 * ADR 0002: Bangla is the source language for worker-facing copy, no UI component
 * may contain a literal string, and critical copy cannot ship unreviewed.
 */
export * from './messages';
export * from './critical';
export * from './format';
export { default as glossary } from '../meta/glossary.json';
