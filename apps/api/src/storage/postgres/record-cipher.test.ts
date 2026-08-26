import { describe, expect, it } from 'vitest';
import { RecordCipher } from './record-cipher';

const KEY = Buffer.from('probash-test-field-key-32-bytes!').toString('base64');

describe('RecordCipher', () => {
  it('round-trips structured records without plaintext in the envelope', () => {
    const cipher = new RecordCipher(KEY);
    const value = { passportNumber: 'AB1234567', nested: { phone: '+8801700000000' } };
    const envelope = cipher.encrypt(value, 'migration_passport:passport-1');
    expect(JSON.stringify(envelope)).not.toContain('AB1234567');
    expect(cipher.decrypt(envelope, 'migration_passport:passport-1')).toEqual(value);
  });

  it('binds ciphertext to its collection and record id', () => {
    const cipher = new RecordCipher(KEY);
    const envelope = cipher.encrypt({ status: 'valid' }, 'migration_passport:passport-1');
    expect(() => cipher.decrypt(envelope, 'migration_passport:passport-2')).toThrow(
      /failed authentication/,
    );
  });

  it('rejects keys that are not exactly 256 bits', () => {
    expect(() => new RecordCipher(Buffer.from('too-short').toString('base64'))).toThrow(/32 bytes/);
  });
});
