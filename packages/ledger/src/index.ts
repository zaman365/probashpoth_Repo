/**
 * @probash/ledger — double-entry accounting primitives (ADR 0004).
 *
 * The platform records money; it does not hold money. Nothing in this package
 * may be used to present an in-app "balance" the user can spend.
 */
export * from './accounts';
export * from './journal';
export * from './settlement';
