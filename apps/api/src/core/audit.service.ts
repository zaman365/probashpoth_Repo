import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from '@probash/domain';
import type { Obligations } from '@probash/auth';
import { STORAGE, type Storage } from '../storage/ports';
import type { AuditEventRecord } from '../storage/records';
import { ClockService } from './clock.service';

export interface AuditInput {
  kind?: AuditEventRecord['kind'];
  actorUserId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  caseId?: string;
  reason?: string;
  metadata?: Record<string, string>;
}

/**
 * §45/§49 — audit events are immutable and separate from ordinary logs (§42.16).
 * Never put document contents, national identifiers or secrets in metadata.
 */
@Injectable()
export class AuditService {
  constructor(
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
  ) {}

  async record(input: AuditInput): Promise<AuditEventRecord> {
    const event: AuditEventRecord = {
      id: uuidv7(),
      kind: input.kind ?? 'action',
      actorUserId: input.actorUserId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      caseId: input.caseId,
      reason: input.reason,
      occurredAt: this.clock.nowIso(),
      metadata: input.metadata ?? {},
    };
    return this.storage.auditEvents.put(event);
  }

  /** Honour the obligations returned by an authorization decision (§49). */
  async recordAccessIfRequired(
    obligations: Obligations,
    input: AuditInput,
  ): Promise<AuditEventRecord | undefined> {
    if (!obligations.auditAccess) return undefined;
    return this.record({ ...input, kind: 'access' });
  }
}
