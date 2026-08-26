import { env } from 'cloudflare:workers';

export type SensitiveDocumentGate =
  { enabled: true; evidenceId: string } | { enabled: false; reason: string };

/**
 * Gate S3 is evaluated at the Worker boundary. It intentionally requires all
 * controls; a partially configured deployment remains read-only for documents.
 */
export function sensitiveDocumentGate(): SensitiveDocumentGate {
  const checks: Array<[boolean, string]> = [
    [env.DOCUMENT_UPLOADS_ENABLED === 'true', 'Document intake is not open.'],
    [env.IDENTITY_PROVIDER === 'clerk', 'Production identity is not active.'],
    [env.STORAGE_DRIVER === 'postgres', 'Authoritative PostgreSQL is not active.'],
    [env.DATA_RESIDENCY_REGION === 'eu', 'EU data residency is not verified.'],
    [env.DOCUMENT_QUARANTINE_ENABLED === 'true', 'Document quarantine is not active.'],
    [env.DOCUMENT_MALWARE_SCANNING_ENABLED === 'true', 'Malware scanning is not active.'],
    [env.DOCUMENT_DOWNLOAD_AUDIT_ENABLED === 'true', 'Download auditing is not active.'],
    [env.SECURITY_GATE_S3_APPROVED === 'true', 'Security Gate S3 is not approved.'],
    [Boolean(env.SECURITY_GATE_S3_EVIDENCE_ID), 'Gate S3 has no approval evidence.'],
    [Boolean(env.DOCUMENT_SCAN_QUEUE), 'The document scan queue is unavailable.'],
    [Boolean(env.DOCUMENTS_QUARANTINE), 'The private quarantine bucket is unavailable.'],
    [Boolean(env.DOCUMENTS_CLEAN), 'The private clean bucket is unavailable.'],
  ];
  const failed = checks.find(([passed]) => !passed);
  if (failed) return { enabled: false, reason: failed[1] };
  return { enabled: true, evidenceId: env.SECURITY_GATE_S3_EVIDENCE_ID! };
}

export function requireSensitiveDocumentGate(): string {
  const gate = sensitiveDocumentGate();
  if (!gate.enabled) throw new Error(gate.reason);
  return gate.evidenceId;
}
