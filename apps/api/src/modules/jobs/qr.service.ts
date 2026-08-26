import { createHmac, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { Env } from '@probash/config';
import { ENV } from '../../core/tokens';
import { ClockService } from '../../core/clock.service';

export interface QrPayload {
  v: 1;
  /** Public verification id — never PII (§21). */
  id: string;
  kid: string;
  iat: number;
}

export type QrVerifyResult =
  | { valid: true; payload: QrPayload }
  | { valid: false; reason: 'malformed' | 'bad_signature' | 'unknown_key' | 'expired' };

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * §21 — signed QR for public job verification. The payload carries an opaque public
 * id and nothing else: a scanned code must never reveal a person.
 */
@Injectable()
export class QrService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly clock: ClockService,
  ) {}

  private sign(body: string): string {
    return createHmac('sha256', this.env.QR_SIGNING_KEY).update(body).digest('base64url');
  }

  issue(publicId: string): string {
    const payload: QrPayload = {
      v: 1,
      id: publicId,
      kid: this.env.QR_SIGNING_KEY_ID,
      iat: Math.floor(this.clock.now().getTime() / 1000),
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${body}.${this.sign(body)}`;
  }

  verify(token: string): QrVerifyResult {
    const [body, signature] = token.split('.');
    if (!body || !signature) return { valid: false, reason: 'malformed' };

    let payload: QrPayload;
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as QrPayload;
    } catch {
      return { valid: false, reason: 'malformed' };
    }
    if (payload.v !== 1 || typeof payload.id !== 'string') {
      return { valid: false, reason: 'malformed' };
    }
    if (payload.kid !== this.env.QR_SIGNING_KEY_ID) {
      // Key rotation: verifying an older key id needs the retired key from the
      // key store, which is not wired yet. Fail closed rather than trusting it.
      return { valid: false, reason: 'unknown_key' };
    }

    const expected = Buffer.from(this.sign(body));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return { valid: false, reason: 'bad_signature' };
    }
    if (Math.floor(this.clock.now().getTime() / 1000) - payload.iat > MAX_AGE_SECONDS) {
      return { valid: false, reason: 'expired' };
    }
    return { valid: true, payload };
  }
}
