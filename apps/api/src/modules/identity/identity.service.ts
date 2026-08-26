import { createHash, randomInt, randomBytes, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DomainError, NotFoundError, uuidv7 } from '@probash/domain';
import type { Env } from '@probash/config';
import {
  normalizePhone,
  type RequestOtpDto,
  type SessionDto,
  type UpdateProfileDto,
  type VerifyOtpDto,
} from '@probash/contracts';
import { ENV } from '../../core/tokens';
import { STORAGE, type Storage } from '../../storage/ports';
import { ClockService } from '../../core/clock.service';
import { AuditService } from '../../core/audit.service';
import { EventOutboxService } from '../../core/event-outbox.service';
import { hashToken } from '../../common/session.guard';
import type { ProfileRecord, UserRecord } from '../../storage/records';

const OTP_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const MAX_CHALLENGES_PER_WINDOW = 3;
const CHALLENGE_WINDOW_MS = 10 * 60 * 1000;

/** §17 — phone OTP first, no email, consent recorded explicitly. */
@Injectable()
export class IdentityService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(STORAGE) private readonly storage: Storage,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly events: EventOutboxService,
  ) {}

  private hashCode(code: string, challengeId: string): string {
    // Salted with the challenge id so identical codes never share a hash.
    return createHash('sha256')
      .update(`${challengeId}:${code}:${this.env.SESSION_SIGNING_KEY}`)
      .digest('hex');
  }

  async requestOtp(
    dto: RequestOtpDto,
  ): Promise<{ challengeId: string; expiresAt: string; devOtp?: string }> {
    const phone = normalizePhone(dto.phone);
    const now = this.clock.now();

    // OTP throttling (§42.8). Redis is the production home for this counter.
    const recent = await this.storage.otpChallenges.list(
      (c) => c.phone === phone && Date.parse(c.expiresAt) > now.getTime() - CHALLENGE_WINDOW_MS,
    );
    if (recent.length >= MAX_CHALLENGES_PER_WINDOW) {
      throw new DomainError('RATE_LIMITED', 'Too many code requests. Please wait a few minutes.', {
        messageKey: 'common.errorBody',
      });
    }

    const id = uuidv7();
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const expiresAt = new Date(now.getTime() + OTP_TTL_MS).toISOString();

    await this.storage.otpChallenges.put({
      id,
      phone,
      codeHash: this.hashCode(code, id),
      expiresAt,
      attempts: 0,
      locale: dto.locale,
      assistedByUserId: dto.assistedByUserId,
    });

    // Development SMS adapter: the code goes to the server log, never to a real gateway.
    if (this.env.SMS_PROVIDER === 'console') {
      // eslint-disable-next-line no-console
      console.log(`[sms:dev] OTP for ${phone}: ${code}`);
    }

    const devOtp =
      this.env.APP_ENV === 'development' || this.env.APP_ENV === 'test' ? code : undefined;
    return { challengeId: id, expiresAt, devOtp };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<SessionDto> {
    if (!dto.consentAccepted) {
      throw new DomainError('PRECONDITION_FAILED', 'Consent is required to create an account', {
        messageKey: 'onboarding.consentBody',
      });
    }

    const challenge = await this.storage.otpChallenges.get(dto.challengeId);
    if (!challenge) throw new NotFoundError('otp_challenge', dto.challengeId);
    if (challenge.consumedAt) {
      throw new DomainError('CONFLICT', 'This code has already been used');
    }
    if (Date.parse(challenge.expiresAt) <= this.clock.now().getTime()) {
      throw new DomainError('PRECONDITION_FAILED', 'This code has expired');
    }
    if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
      throw new DomainError('RATE_LIMITED', 'Too many attempts. Request a new code.');
    }

    const expected = Buffer.from(challenge.codeHash);
    const actual = Buffer.from(this.hashCode(dto.code, challenge.id));
    const matches = expected.length === actual.length && timingSafeEqual(expected, actual);
    if (!matches) {
      await this.storage.otpChallenges.put({ ...challenge, attempts: challenge.attempts + 1 });
      await this.audit.record({
        kind: 'security',
        action: 'otp.failed',
        resourceType: 'otp_challenge',
        resourceId: challenge.id,
      });
      throw new DomainError('UNAUTHENTICATED', 'That code is not correct');
    }

    await this.storage.otpChallenges.put({ ...challenge, consumedAt: this.clock.nowIso() });

    let user = await this.storage.users.find((u) => u.phone === challenge.phone);
    const isNewUser = !user;
    if (!user) {
      user = {
        id: uuidv7(),
        phone: challenge.phone,
        roles: ['worker'],
        locale: challenge.locale,
        createdAt: this.clock.nowIso(),
        createdByAssistantUserId: challenge.assistedByUserId,
      };
      await this.storage.users.put(user);
      await this.storage.profiles.put(this.emptyProfile(user));
      await this.events.publish(
        'UserRegistered',
        { assisted: Boolean(challenge.assistedByUserId) },
        {
          actorRef: user.id,
          locale: user.locale,
        },
      );
    }

    await this.storage.consents.put({
      id: uuidv7(),
      userId: user.id,
      purpose: 'account_creation',
      granted: true,
      statement: {
        bn: 'আমরা শুধু আপনার আবেদনের জন্য প্রয়োজনীয় তথ্য রাখব। আপনি যেকোনো সময় অনুমতি ফিরিয়ে নিতে পারবেন।',
        en: 'We keep only the information your application needs. You can withdraw permission at any time.',
      },
      locale: challenge.locale,
      grantedAt: this.clock.nowIso(),
      capturedByUserId: challenge.assistedByUserId,
      evidence: { kind: 'otp', reference: challenge.id },
    });

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(this.clock.now().getTime() + SESSION_TTL_MS).toISOString();
    await this.storage.sessions.put({
      id: uuidv7(),
      userId: user.id,
      tokenHash: hashToken(token),
      issuedAt: this.clock.nowIso(),
      expiresAt,
      kind: challenge.assistedByUserId ? 'assisted' : 'self',
    });

    await this.audit.record({
      actorUserId: user.id,
      action: isNewUser ? 'user.registered' : 'user.signed_in',
      resourceType: 'user',
      resourceId: user.id,
    });

    const profile = await this.storage.profiles.find((p) => p.userId === user!.id);
    return {
      token,
      expiresAt,
      user: {
        id: user.id,
        displayName: user.displayName,
        roles: user.roles,
        locale: user.locale,
        onboardingComplete: Boolean(profile?.occupationKey || profile?.intent === 'study'),
      },
    };
  }

  private emptyProfile(user: UserRecord): ProfileRecord {
    return {
      id: uuidv7(),
      userId: user.id,
      intent: 'work',
      languageCertificates: [],
      skillCertificates: [],
      destinationPreferences: [],
      locale: user.locale,
      updatedAt: this.clock.nowIso(),
    };
  }

  async getProfile(userId: string): Promise<ProfileRecord> {
    const profile = await this.storage.profiles.find((p) => p.userId === userId);
    if (profile) return profile;
    const user = await this.storage.users.require(userId);
    return this.storage.profiles.put(this.emptyProfile(user));
  }

  async updateProfile(userId: string, patch: UpdateProfileDto): Promise<ProfileRecord> {
    const current = await this.getProfile(userId);
    const updated: ProfileRecord = {
      ...current,
      ...patch,
      languageCertificates: patch.languageCertificates ?? current.languageCertificates,
      skillCertificates: patch.skillCertificates ?? current.skillCertificates,
      destinationPreferences: patch.destinationPreferences ?? current.destinationPreferences,
      updatedAt: this.clock.nowIso(),
    };
    await this.storage.profiles.put(updated);

    if (patch.displayName) {
      const user = await this.storage.users.require(userId);
      await this.storage.users.put({ ...user, displayName: patch.displayName });
    }

    await this.audit.record({
      actorUserId: userId,
      action: 'profile.updated',
      resourceType: 'identity_profile',
      resourceId: updated.id,
      metadata: { fields: Object.keys(patch).join(',') },
    });
    await this.events.publish(
      'ProfileUpdated',
      { fieldCount: Object.keys(patch).length },
      {
        actorRef: userId,
      },
    );
    return updated;
  }

  /** §18 — the Skill Passport view. Sensitive documents are not included here. */
  async skillPassport(userId: string): Promise<Record<string, unknown>> {
    const profile = await this.getProfile(userId);
    const credentials = await this.storage.credentials.list((c) => c.userId === userId);
    return {
      userId,
      occupationKeys: profile.occupationKey ? [profile.occupationKey] : [],
      totalExperienceMonths: profile.experienceMonths ?? 0,
      languageCertificates: profile.languageCertificates,
      skillCertificates: profile.skillCertificates,
      credentials: credentials.map((c) => ({
        id: c.id,
        kind: c.kind,
        title: c.title,
        status: c.status,
        issuedAt: c.issuedAt,
        expiresAt: c.expiresAt,
      })),
      verifiedEmploymentOutcomes: [],
      updatedAt: profile.updatedAt,
    };
  }
}
