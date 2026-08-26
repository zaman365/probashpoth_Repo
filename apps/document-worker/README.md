# Document pipeline Worker

This Worker is the Gate S3 quarantine consumer. Queue messages contain only an opaque job ID;
the authoritative owner, object key, checksum and content type are resolved from PostgreSQL.
It verifies the checksum and magic bytes, calls an isolated malware-scanner service binding,
and moves the object to either the private clean bucket or short-retention rejected prefix.

`wrangler.example.jsonc` is intentionally not deployable: provision EU-jurisdiction R2 buckets,
Hyperdrive, the queue/DLQ and scanner Worker through reviewed infrastructure, replace every
placeholder, then save an environment-specific `wrangler.jsonc`. Never bind production resources
to a preview Worker.
