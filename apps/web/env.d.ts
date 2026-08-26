declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    FILES: R2Bucket;
    DOCUMENTS_QUARANTINE?: R2Bucket;
    DOCUMENTS_CLEAN?: R2Bucket;
    HYPERDRIVE?: Hyperdrive;
    DOCUMENT_SCAN_QUEUE?: Queue<{ jobId: string }>;
    IDENTITY_PROVIDER?: 'sites-transition' | 'clerk';
    STORAGE_DRIVER?: 'd1' | 'postgres';
    DATA_RESIDENCY_REGION?: 'local' | 'eu';
    DOCUMENT_UPLOADS_ENABLED?: 'false' | 'true';
    DOCUMENT_QUARANTINE_ENABLED?: 'false' | 'true';
    DOCUMENT_MALWARE_SCANNING_ENABLED?: 'false' | 'true';
    DOCUMENT_DOWNLOAD_AUDIT_ENABLED?: 'false' | 'true';
    SECURITY_GATE_S3_APPROVED?: 'false' | 'true';
    SECURITY_GATE_S3_EVIDENCE_ID?: string;
    CLERK_PUBLISHABLE_KEY?: string;
    CLERK_SECRET_KEY?: string;
    CLERK_JWT_KEY?: string;
    CLERK_AUTHORIZED_PARTIES?: string;
    CLERK_SIGN_IN_URL?: string;
    CLERK_SIGN_UP_URL?: string;
    CLERK_WEBHOOK_SECRET?: string;
  }
}
