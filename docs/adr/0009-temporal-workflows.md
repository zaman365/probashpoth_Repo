# ADR 0009 — Temporal for long-running cases

- Status: Retained pending comparative spike
- Date: 2026-08-26

## Decision

Cloudflare Queues own short, retryable, idempotent delivery. Temporal remains the intended owner of
multi-week migration cases, human waits and compensated workflows until a measured ADR supersedes it.
Cloudflare Workflows may replace it only after replay, compensation, visibility, data-location and
operating-cost tests. Queue delivery state must never be presented as case state.
