import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { InvariantViolatedError } from '@probash/domain';

export interface EncryptedRecordEnvelope {
  encrypted: true;
  algorithm: 'aes-256-gcm';
  iv: string;
  tag: string;
  ciphertext: string;
}

export function isEncryptedRecordEnvelope(value: unknown): value is EncryptedRecordEnvelope {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Partial<EncryptedRecordEnvelope>;
  return (
    envelope.encrypted === true &&
    envelope.algorithm === 'aes-256-gcm' &&
    typeof envelope.iv === 'string' &&
    typeof envelope.tag === 'string' &&
    typeof envelope.ciphertext === 'string'
  );
}

/** AES-GCM envelope encryption for user-owned records stored in PostgreSQL JSONB. */
export class RecordCipher {
  private readonly key: Buffer;

  constructor(base64Key: string) {
    this.key = Buffer.from(base64Key, 'base64');
    if (this.key.byteLength !== 32) {
      throw new InvariantViolatedError(
        'FIELD_ENCRYPTION_KEY must decode to exactly 32 bytes for AES-256-GCM',
      );
    }
  }

  encrypt(value: unknown, context: string): EncryptedRecordEnvelope {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(context));
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(value), 'utf8'),
      cipher.final(),
    ]);
    return {
      encrypted: true,
      algorithm: 'aes-256-gcm',
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      ciphertext: ciphertext.toString('base64'),
    };
  }

  decrypt<T>(envelope: EncryptedRecordEnvelope, context: string): T {
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.key,
        Buffer.from(envelope.iv, 'base64'),
      );
      decipher.setAAD(Buffer.from(context));
      decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
        decipher.final(),
      ]).toString('utf8');
      return JSON.parse(plaintext) as T;
    } catch {
      throw new InvariantViolatedError('Encrypted database record failed authentication', {
        context,
      });
    }
  }
}
