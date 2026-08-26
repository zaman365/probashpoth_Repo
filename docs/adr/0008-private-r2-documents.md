# ADR 0008 — Private EU R2 document pipeline

- Status: Accepted, Gate S3 pending
- Date: 2026-08-26

## Decision

Use private EU-jurisdiction R2 buckets for quarantine and clean objects. New bytes enter quarantine
only. Queue messages contain an opaque job ID; PostgreSQL owns authorization and state. A scanner
recomputes checksums, verifies magic bytes, calls an isolated malware engine, and alone may promote an
object to `clean/`. Downloads require a fresh owner check and create an append-only event.

The feature remains disabled until all Gate S3 controls and evidence are approved. Rejected and export
objects receive short lifecycle policies; public `r2.dev` and public custom domains are prohibited.
