import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { DomainError, isSensitiveDocument, uuidv7, type DocumentType } from '@probash/domain';
import type { Env } from '@probash/config';
import type { DocumentSummaryDto, UploadDocumentDto } from '@probash/contracts';
import type { Subject } from '@probash/auth';
import { ENV } from '../../core/tokens';
import { STORAGE, type Storage } from '../../storage/ports';
import { ClockService } from '../../core/clock.service';
import { AuditService } from '../../core/audit.service';
import { EventOutboxService } from '../../core/event-outbox.service';
import type { DocumentRecord } from '../../storage/records';

const MAX_BYTES = 8 * 1024 * 1024;

/** Magic-number check — the declared content type is never trusted alone (§50). */
const MAGIC: { type: string; test: (b: Buffer) => boolean }[] = [
  { type: 'application/pdf', test: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
  { type: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    type: 'image/png',
    test: (b) =>
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
];

/**
 * §29 — the document wallet.
 *
 * The development driver writes to a local directory; production uses S3 with KMS
 * envelope encryption, signed URLs and a malware-scan pipeline (§42.9). Contents are
 * never logged and never returned in list responses.
 */
@Injectable()
export class DocumentsService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly events: EventOutboxService,
  ) {}

  private summary(doc: DocumentRecord): DocumentSummaryDto {
    return {
      id: doc.id,
      type: doc.type,
      label: doc.label,
      uploadedAt: doc.uploadedAt,
      expiresAt: doc.expiresAt,
      verificationLevel: doc.verificationLevel,
      malwareScanStatus: doc.malwareScanStatus,
      sensitive: isSensitiveDocument(doc.type),
      byteSize: doc.byteSize,
    };
  }

  async list(subject: Subject): Promise<DocumentSummaryDto[]> {
    const docs = await this.storage.documents.list((d) => d.ownerUserId === subject.userId);
    return docs.map((d) => this.summary(d));
  }

  async upload(subject: Subject, dto: UploadDocumentDto): Promise<DocumentSummaryDto> {
    const buffer = Buffer.from(dto.contentBase64, 'base64');
    if (buffer.byteLength === 0) {
      throw new DomainError('VALIDATION_FAILED', 'The document is empty');
    }
    if (buffer.byteLength > MAX_BYTES) {
      throw new DomainError('VALIDATION_FAILED', 'The document is too large', {
        details: { maxBytes: MAX_BYTES },
      });
    }
    const detected = MAGIC.find((m) => m.test(buffer));
    if (!detected) {
      throw new DomainError('VALIDATION_FAILED', 'Only PDF, JPEG and PNG documents are accepted');
    }
    if (detected.type !== dto.contentType) {
      throw new DomainError('VALIDATION_FAILED', 'File content does not match the declared type', {
        details: { declared: dto.contentType, detected: detected.type },
      });
    }

    const id = uuidv7();
    const storageKey = `documents/${subject.userId}/${id}`;
    const dir = resolve(this.env.DOCUMENT_STORAGE_DIR, subject.userId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, id), buffer);

    const record: DocumentRecord = {
      id,
      ownerUserId: subject.userId,
      caseId: dto.caseId,
      type: dto.type as DocumentType,
      label: dto.label ?? { bn: 'কাগজ', en: 'Document' },
      storageKey,
      contentType: detected.type,
      byteSize: buffer.byteLength,
      sha256: createHash('sha256').update(buffer).digest('hex'),
      version: 1,
      uploadedAt: this.clock.nowIso(),
      issuedAt: dto.issuedAt,
      expiresAt: dto.expiresAt,
      // Uploading a file proves nothing about the claim it makes (§75).
      verificationLevel: 'unverified',
      // §42.9: the scan pipeline is a feature flag that is not live yet.
      malwareScanStatus: 'pending',
    };
    await this.storage.documents.put(record);

    await this.audit.record({
      actorUserId: subject.userId,
      action: 'document.uploaded',
      resourceType: 'document',
      resourceId: id,
      caseId: dto.caseId,
      metadata: { type: record.type, bytes: String(record.byteSize) },
    });
    await this.events.publish(
      'CredentialSubmitted',
      { documentType: record.type },
      {
        actorRef: subject.userId,
        caseRef: dto.caseId,
      },
    );

    return this.summary(record);
  }

  /** §29/§51 — sharing is scoped, expiring, revocable and audited. */
  async share(
    subject: Subject,
    documentId: string,
    input: { organizationId: string; purpose: { bn: string; en: string }; days: number },
  ) {
    const doc = await this.storage.documents.require(documentId);
    if (doc.ownerUserId !== subject.userId) {
      throw new DomainError('FORBIDDEN', 'You can only share your own documents');
    }
    const share = {
      id: uuidv7(),
      documentId,
      grantedByUserId: subject.userId,
      audience: { kind: 'organization' as const, id: input.organizationId },
      purpose: input.purpose,
      expiresAt: new Date(this.clock.now().getTime() + input.days * 86_400_000).toISOString(),
      watermark: true,
      createdAt: this.clock.nowIso(),
      accessCount: 0,
    };
    await this.storage.documentShares.put(share);
    await this.audit.record({
      actorUserId: subject.userId,
      action: 'document.shared',
      resourceType: 'document',
      resourceId: documentId,
      metadata: { organizationId: input.organizationId, expiresAt: share.expiresAt },
    });
    await this.events.publish('DocumentShared', { days: input.days }, { actorRef: subject.userId });
    return share;
  }

  async revokeShare(subject: Subject, shareId: string) {
    const share = await this.storage.documentShares.require(shareId);
    if (share.grantedByUserId !== subject.userId) {
      throw new DomainError('FORBIDDEN', 'You can only revoke your own shares');
    }
    const updated = { ...share, revokedAt: this.clock.nowIso() };
    await this.storage.documentShares.put(updated);
    await this.audit.record({
      actorUserId: subject.userId,
      action: 'document.share_revoked',
      resourceType: 'document_share',
      resourceId: shareId,
    });
    await this.events.publish('DocumentShareRevoked', {}, { actorRef: subject.userId });
    return updated;
  }
}
