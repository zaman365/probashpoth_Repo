# ADR 0011 — Public, app, API and operations hostnames

- Status: Accepted, progressive rollout
- Date: 2026-08-26

## Decision

`bdos.io` and `www.bdos.io` serve public localized content. `app.bdos.io` is the eventual authenticated
workspace, `api.bdos.io` is the versioned API/webhook boundary, and `ops.bdos.io` is separately
authorized. The first migration may retain `/bn/account` and `/en/account` to avoid breaking journeys.

Hostname separation is a security and deployment boundary, not sufficient authorization. Domain
changes require approved Clerk parties, CSP, recovery points, smoke tests and an identified commander.
