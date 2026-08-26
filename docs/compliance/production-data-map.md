# Production data map — implementation register

This is an engineering inventory, not a legal opinion. Lawful basis, retention duration, controller /
processor roles and transfer assessment require approval by the privacy owner and qualified counsel.

| Data class                                  | Authoritative system                | Purpose                                | Production state                               |
| ------------------------------------------- | ----------------------------------- | -------------------------------------- | ---------------------------------------------- |
| Authentication factors and sessions         | Clerk                               | Account access and recovery            | Gate S1 pending                                |
| Provider-to-domain identity link            | EU PostgreSQL                       | Stable account ownership and migration | Implemented; migration rehearsal pending       |
| Work/Study choice and non-sensitive profile | EU PostgreSQL                       | Personalized journey                   | Adapter and RLS implemented; Gate S2 pending   |
| Journeys, tasks and saved opportunities     | EU PostgreSQL                       | User-controlled planning               | Adapter and RLS implemented; migration pending |
| National identifiers                        | EU PostgreSQL field ciphertext only | Approved case requirement              | Collection prohibited before S3                |
| Uploaded document bytes                     | Private EU R2 quarantine / clean    | Approved evidence workflows            | Pipeline implemented; disabled before S3       |
| Document authorization and events           | EU PostgreSQL                       | Access control and accountability      | Schema implemented; S3 testing pending         |
| Queue delivery                              | Cloudflare Queues                   | Opaque background job delivery         | Opaque job IDs only                            |
| Redacted operational telemetry              | Cloudflare / approved sink          | Reliability and security response      | Configuration review pending                   |

Development and staging use synthetic data only. No production copy may be restored into an ephemeral
or development Neon branch.
