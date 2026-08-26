import { Inject, Injectable } from '@nestjs/common';
import { DomainError, uuidv7 } from '@probash/domain';
import { normalizePhone, type CreateDelegationDto, type DelegationDto } from '@probash/contracts';
import { STORAGE, type Storage } from '../../storage/ports';
import { ClockService } from '../../core/clock.service';
import { AuditService } from '../../core/audit.service';
import { EventOutboxService } from '../../core/event-outbox.service';
import type { DelegationRecord } from '../../storage/records';

const DELEGATION_TTL_DAYS = 365;

/** §28 — the family co-pilot: explicit, scoped, revocable, and never able to sign. */
@Injectable()
export class DelegationsService {
  constructor(
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly events: EventOutboxService,
  ) {}

  private mask(phone: string): string {
    return phone.replace(/^(\+880)(\d{4})(\d+)(\d{2})$/, (_m, cc, _a, mid, last) => {
      return `${cc}****${'*'.repeat(Math.max(mid.length - 2, 0))}${last}`;
    });
  }

  private toDto(record: DelegationRecord): DelegationDto {
    return {
      id: record.id,
      principalUserId: record.principalUserId,
      delegatePhoneMasked: this.mask(record.delegatePhone),
      delegateName: record.delegateName,
      relationship: record.relationship,
      permissions: record.permissions,
      status: record.status,
      invitedAt: record.invitedAt,
      revokedAt: record.revokedAt,
    };
  }

  async list(principalUserId: string): Promise<DelegationDto[]> {
    const records = await this.storage.delegations.list(
      (d) => d.principalUserId === principalUserId,
    );
    return records.map((r) => this.toDto(r));
  }

  async invite(principalUserId: string, dto: CreateDelegationDto): Promise<DelegationDto> {
    const phone = normalizePhone(dto.delegatePhone);
    const principal = await this.storage.users.require(principalUserId);
    if (principal.phone === phone) {
      throw new DomainError('VALIDATION_FAILED', 'You cannot delegate to your own number');
    }

    const existing = await this.storage.delegations.find(
      (d) =>
        d.principalUserId === principalUserId &&
        d.delegatePhone === phone &&
        (d.status === 'invited' || d.status === 'active'),
    );
    if (existing) {
      throw new DomainError('CONFLICT', 'This person has already been invited');
    }

    // The consent record proves the principal authorised this delegation (§51).
    const consentId = uuidv7();
    await this.storage.consents.put({
      id: consentId,
      userId: principalUserId,
      purpose: 'family_delegation',
      granted: true,
      statement: {
        bn: 'আমি এই ব্যক্তিকে আমার অগ্রগতি ও খরচ দেখার অনুমতি দিচ্ছি। তিনি আমার পরিচয় বা চুক্তি বদলাতে পারবেন না।',
        en: 'I allow this person to see my progress and costs. They cannot change my identity or my contract.',
      },
      locale: principal.locale,
      grantedAt: this.clock.nowIso(),
    });

    const record: DelegationRecord = {
      id: uuidv7(),
      principalUserId,
      delegatePhone: phone,
      delegateName: dto.delegateName,
      relationship: dto.relationship,
      permissions: dto.permissions,
      status: 'invited',
      invitedAt: this.clock.nowIso(),
      expiresAt: new Date(
        this.clock.now().getTime() + DELEGATION_TTL_DAYS * 86_400_000,
      ).toISOString(),
      consentId,
    };

    // If the delegate already has an account, the grant activates immediately.
    const delegateUser = await this.storage.users.find((u) => u.phone === phone);
    if (delegateUser) {
      record.delegateUserId = delegateUser.id;
      record.status = 'active';
      record.acceptedAt = this.clock.nowIso();
    }

    await this.storage.delegations.put(record);
    await this.audit.record({
      actorUserId: principalUserId,
      action: 'delegation.invited',
      resourceType: 'delegation',
      resourceId: record.id,
      metadata: { relationship: record.relationship, permissions: record.permissions.join(',') },
    });
    await this.events.publish(
      'DelegationInvited',
      { permissionCount: record.permissions.length, relationship: record.relationship },
      { actorRef: principalUserId },
    );
    return this.toDto(record);
  }

  async revoke(principalUserId: string, delegationId: string): Promise<DelegationDto> {
    const record = await this.storage.delegations.require(delegationId);
    if (record.principalUserId !== principalUserId) {
      throw new DomainError('FORBIDDEN', 'You can only revoke your own delegations');
    }
    const updated: DelegationRecord = {
      ...record,
      status: 'revoked',
      revokedAt: this.clock.nowIso(),
    };
    await this.storage.delegations.put(updated);
    await this.audit.record({
      actorUserId: principalUserId,
      action: 'delegation.revoked',
      resourceType: 'delegation',
      resourceId: record.id,
    });
    await this.events.publish('DelegationRevoked', {}, { actorRef: principalUserId });
    return this.toDto(updated);
  }
}
