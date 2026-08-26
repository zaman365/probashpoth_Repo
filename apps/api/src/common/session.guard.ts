import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DomainError } from '@probash/domain';
import type { Subject } from '@probash/auth';
import { STORAGE, type Storage } from '../storage/ports';
import { ClockService } from '../core/clock.service';

export interface RequestWithSubject {
  headers: Record<string, string | string[] | undefined>;
  probashSubject?: Subject;
  probashUserId?: string;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Session guard. Builds the @probash/auth Subject — including family delegations —
 * so every controller authorizes against the same model (§49).
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithSubject>();
    const header = request.headers['authorization'];
    const raw = Array.isArray(header) ? header[0] : header;
    const token = raw?.startsWith('Bearer ') ? raw.slice(7).trim() : undefined;
    if (!token) {
      throw new DomainError('UNAUTHENTICATED', 'Sign in to continue', {
        messageKey: 'common.errorBody',
      });
    }

    const tokenHash = hashToken(token);
    const session = await this.storage.sessions.find((s) => s.tokenHash === tokenHash);
    if (
      !session ||
      session.revokedAt ||
      Date.parse(session.expiresAt) <= this.clock.now().getTime()
    ) {
      throw new DomainError('UNAUTHENTICATED', 'Your session has expired', {
        messageKey: 'common.errorBody',
      });
    }

    const user = await this.storage.users.get(session.userId);
    if (!user) {
      throw new DomainError('UNAUTHENTICATED', 'Session user no longer exists');
    }

    const delegations = await this.storage.delegations.list(
      (d) => d.delegateUserId === user.id && d.status === 'active',
    );

    request.probashUserId = user.id;
    request.probashSubject = {
      userId: user.id,
      roles: user.roles as Subject['roles'],
      sessionKind: session.kind,
      mfaSatisfied:
        Boolean(session.mfaSatisfiedAt) &&
        this.clock.now().getTime() - Date.parse(session.mfaSatisfiedAt!) <= 12 * 60 * 60 * 1000,
      delegations: delegations.map((d) => ({
        principalUserId: d.principalUserId,
        permissions: d.permissions,
      })),
    };
    return true;
  }
}
