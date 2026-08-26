# Security incident and credential compromise runbook

1. Open an incident with a correlation ID, commander and timestamp; do not paste sensitive content.
2. Contain: disable the affected release gate, revoke Clerk sessions/keys or Worker secrets, and stop
   document consumers if object authorization or scanning is in doubt.
3. Preserve append-only audit, Cloudflare request logs, Clerk events, PostgreSQL logs and R2 inventory.
4. Determine affected people, data classes, tenants, time window and whether data left approved regions.
5. Engage the named security/privacy owner and qualified counsel/DPO for breach-assessment deadlines.
6. Recover from verified configuration and data checkpoints; rotate narrowly scoped credentials.
7. Validate owner/tenant denial tests, redaction, queue idempotency and reconciliation before reopening.
8. Publish user/status communication through the approved owner; never speculate about impact.
9. Record lessons and required control changes. Gate reopening needs evidence and named approval.
