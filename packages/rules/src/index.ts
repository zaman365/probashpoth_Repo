/**
 * @probash/rules — deterministic, versioned, source-backed rule evaluation (ADR 0003).
 *
 * This package must never import an LLM client, a database or an HTTP client.
 * It takes rule versions plus facts and returns a trace. That is all it does.
 */
export * from './dsl';
export * from './evaluate';
export * from './facts';
