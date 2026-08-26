/**
 * @probash/domain — pure domain types and value objects.
 *
 * Rules of this package (ADR 0001):
 * - no framework imports, no HTTP, no database, no I/O beyond node:crypto
 * - no user-facing strings; copy lives in @probash/i18n
 * - every exported concept traces to a section of the product blueprint
 */
export * from './ids';
export * from './localized';
export * from './errors';
export * from './money';
export * from './sources';
export * from './verification';
export * from './geography';
export * from './routes';
export * from './occupations';
export * from './organizations';
export * from './jobs';
export * from './cases';
export * from './cost';
export * from './milestones';
export * from './risk';
export * from './documents';
export * from './credentials';
export * from './consent';
