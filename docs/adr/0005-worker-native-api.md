# ADR 0005 — Worker-native API adapter

- Status: Accepted, migration in progress
- Date: 2026-08-26

## Context

ADR 0001 selected NestJS/Fastify before standalone Cloudflare Workers became the production
target. Running the whole framework at the edge would add compatibility and cold-start risk,
while maintaining two business APIs would create inconsistent decisions.

## Decision

Keep domain rules, contracts and authorization packages framework-neutral. Add small Fetch API
handlers for edge endpoints and move routes incrementally. The existing API remains a comparison
harness until OpenAPI, validation, transactions, webhooks and observability have equivalent tests.
Worker handlers create database clients inside a request or queue event and close them afterward.

## Consequences

The document consumer is the first Worker-native adapter. A route is not retired from NestJS until
contract tests pass against both. Domain logic may not be copied into a handler.
